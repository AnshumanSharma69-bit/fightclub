const Challenge = require('../models/Challenge');
const Fighter   = require('../models/Fighter');
const { calculateNewRatings } = require('../utils/elo');

// ─── Helper: generate a 6-char meetup code ────────────────────────────────────
// e.g. "A3K9PZ" — both fighters use this to confirm they actually met
function generateMeetupCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── POST /api/challenge/send ─────────────────────────────────────────────────
// Body: { defenderId, message? }
// defenderId is the Fighter _id (not User _id) of the person being challenged
const sendChallenge = async (req, res, next) => {
  try {
    const { defenderId, message } = req.body;

    if (!defenderId) {
      return res.status(400).json({ error: 'defenderId is required' });
    }

    // Get the challenger's fighter profile
    const challenger = await Fighter.findOne({ userId: req.user._id });
    if (!challenger) {
      return res.status(404).json({ error: 'Your fighter profile not found' });
    }

    // Can't challenge yourself
    if (challenger._id.toString() === defenderId) {
      return res.status(400).json({ error: 'You cannot challenge yourself' });
    }

    // Make sure the defender exists and is available
    const defender = await Fighter.findById(defenderId);
    if (!defender) {
      return res.status(404).json({ error: 'Defender not found' });
    }
    if (!defender.availableToFight) {
      return res.status(400).json({ error: 'That fighter is not available to fight' });
    }

    // Check for existing pending challenge between these two
    const existing = await Challenge.findOne({
      challengerId: challenger._id,
      defenderId:   defenderId,
      status:       'pending',
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending challenge with this fighter' });
    }

    const challenge = await Challenge.create({
      challengerId: challenger._id,
      defenderId,
      message: message || '',
    });

    // Emit socket event so defender gets real-time notification
    // req.app.get('io') is the Socket.io instance attached in index.js
    const io = req.app.get('io');
    if (io) {
      // Emit to the defender's room (they join a room named after their fighterId)
      io.to(defenderId.toString()).emit('challenge:received', {
        challengeId:      challenge._id,
        challengerName:   req.user.username,
        challengerElo:    challenger.eloRating,
        challengerWeight: challenger.weightClass,
        message:          challenge.message,
      });
    }

    res.status(201).json(challenge);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/challenge/:id/accept ──────────────────────────────────────────
const acceptChallenge = async (req, res, next) => {
  try {
    const defender = await Fighter.findOne({ userId: req.user._id });
    if (!defender) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    // Only the defender can accept
    if (challenge.defenderId.toString() !== defender._id.toString()) {
      return res.status(403).json({ error: 'You are not the defender in this challenge' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: `Challenge is already ${challenge.status}` });
    }

    // Generate meetup code and mark as accepted
    challenge.status     = 'accepted';
    challenge.meetupCode = generateMeetupCode();
    await challenge.save();

    // Notify challenger that their challenge was accepted
    const io = req.app.get('io');
    if (io) {
      io.to(challenge.challengerId.toString()).emit('challenge:accepted', {
        challengeId: challenge._id,
        meetupCode:  challenge.meetupCode,
        defenderName: req.user.username,
      });
    }

    res.json(challenge);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/challenge/:id/decline ─────────────────────────────────────────
const declineChallenge = async (req, res, next) => {
  try {
    const defender = await Fighter.findOne({ userId: req.user._id });
    if (!defender) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    if (challenge.defenderId.toString() !== defender._id.toString()) {
      return res.status(403).json({ error: 'You are not the defender in this challenge' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: `Challenge is already ${challenge.status}` });
    }

    challenge.status = 'declined';
    await challenge.save();

    // Notify challenger
    const io = req.app.get('io');
    if (io) {
      io.to(challenge.challengerId.toString()).emit('challenge:declined', {
        challengeId: challenge._id,
        defenderName: req.user.username,
      });
    }

    res.json({ message: 'Challenge declined' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/challenge/:id/confirm ─────────────────────────────────────────
// Body: { winnerId } — the fighter _id of who won
// Both fighters must call this endpoint. When both confirm:
//   - If they agree → ELO updates, challenge marked complete
//   - If they disagree → marked disputed
const confirmResult = async (req, res, next) => {
  try {
    const { winnerId } = req.body;
    if (!winnerId) return res.status(400).json({ error: 'winnerId is required' });

    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    if (challenge.status !== 'accepted') {
      return res.status(400).json({ error: 'Challenge must be accepted before confirming result' });
    }

    const isChallenger = challenge.challengerId.toString() === fighter._id.toString();
    const isDefender   = challenge.defenderId.toString()   === fighter._id.toString();

    if (!isChallenger && !isDefender) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    // Record this fighter's confirmation
    if (isChallenger) {
      if (challenge.challengerConfirmed) {
        return res.status(400).json({ error: 'You already confirmed this result' });
      }
      challenge.challengerConfirmed = true;
      challenge.winnerId = winnerId; // challenger's reported winner
    } else {
      if (challenge.defenderConfirmed) {
        return res.status(400).json({ error: 'You already confirmed this result' });
      }
      challenge.defenderConfirmed = true;

      // Check if both confirmations agree on the winner
      if (challenge.winnerId && challenge.winnerId.toString() !== winnerId) {
        // Disagreement — mark disputed
        challenge.disputed = true;
        challenge.status   = 'completed';
        await challenge.save();
        return res.json({ message: 'Result disputed — admins will review', disputed: true });
      }

      challenge.winnerId = winnerId;
    }

    // If both confirmed and agree — update ELO
    if (challenge.challengerConfirmed && challenge.defenderConfirmed && !challenge.disputed) {
      challenge.status = 'completed';
      await challenge.save();

      // Fetch both fighters to update ELO
      const winner = await Fighter.findById(challenge.winnerId);
      const loserId = challenge.winnerId.toString() === challenge.challengerId.toString()
        ? challenge.defenderId
        : challenge.challengerId;
      const loser = await Fighter.findById(loserId);

      if (winner && loser) {
        const { winnerNewRating, loserNewRating } = calculateNewRatings(
          winner.eloRating,
          loser.eloRating
        );

        winner.eloRating = winnerNewRating;
        winner.wins      += 1;
        loser.eloRating  = loserNewRating;
        loser.losses     += 1;

        await winner.save();
        await loser.save();

        return res.json({
          message:         'Result confirmed — ELO updated',
          winnerNewRating,
          loserNewRating,
        });
      }
    }

    await challenge.save();
    res.json({ message: 'Your confirmation recorded — waiting for the other fighter' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/challenge/mine ──────────────────────────────────────────────────
// Returns all challenges involving the logged-in fighter
const getMyChallenges = async (req, res, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenges = await Challenge.find({
      $or: [
        { challengerId: fighter._id },
        { defenderId:   fighter._id },
      ],
    })
      .populate('challengerId', 'eloRating weightClass')
      .populate('defenderId',   'eloRating weightClass')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(challenges);
  } catch (err) {
    next(err);
  }
};

module.exports = { sendChallenge, acceptChallenge, declineChallenge, confirmResult, getMyChallenges };
