const Challenge = require('../models/Challenge');
const Fighter   = require('../models/Fighter');
const { calculateNewRatings } = require('../utils/elo');
const { checkAndAwardBadge }  = require('../utils/badge');

function generateMeetupCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── POST /api/challenge/send ─────────────────────────────────────────────────
const sendChallenge = async (req, res, next) => {
  try {
    const { defenderId, message } = req.body;
    if (!defenderId) return res.status(400).json({ error: 'defenderId is required' });

    const challenger = await Fighter.findOne({ userId: req.user._id });
    if (!challenger) return res.status(404).json({ error: 'Your fighter profile not found' });

    if (challenger._id.toString() === defenderId.toString()) {
      return res.status(400).json({ error: 'You cannot challenge yourself' });
    }

    const defender = await Fighter.findById(defenderId);
    if (!defender) return res.status(404).json({ error: 'Defender not found' });
    if (!defender.availableToFight) {
      return res.status(400).json({ error: 'That fighter is not available to fight' });
    }

    const existing = await Challenge.findOne({
      challengerId: challenger._id,
      defenderId,
      status: 'pending',
    });
    if (existing) return res.status(409).json({ error: 'You already have a pending challenge with this fighter' });

    const challenge = await Challenge.create({
      challengerId: challenger._id,
      defenderId,
      message: message || '',
    });

    const io = req.app.get('io');
    if (io) {
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

    if (challenge.defenderId.toString() !== defender._id.toString()) {
      return res.status(403).json({ error: 'You are not the defender in this challenge' });
    }
    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: `Challenge is already ${challenge.status}` });
    }

    challenge.status     = 'accepted';
    challenge.meetupCode = generateMeetupCode();
    await challenge.save();

    const io = req.app.get('io');
    if (io) {
      io.to(challenge.challengerId.toString()).emit('challenge:accepted', {
        challengeId:  challenge._id,
        meetupCode:   challenge.meetupCode,
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

    const io = req.app.get('io');
    if (io) {
      io.to(challenge.challengerId.toString()).emit('challenge:declined', {
        challengeId:  challenge._id,
        defenderName: req.user.username,
      });
    }

    res.json({ message: 'Challenge declined' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/challenge/:id/confirm ─────────────────────────────────────────
// Body: { winnerId } — fighter _id of the winner as a string
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

    const myId          = fighter._id.toString();
    const challengerId  = challenge.challengerId.toString();
    const defenderId    = challenge.defenderId.toString();
    const isChallenger  = myId === challengerId;
    const isDefender    = myId === defenderId;

    if (!isChallenger && !isDefender) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    // Store each fighter's reported winner separately
    // challengerReportedWinner / defenderReportedWinner
    if (isChallenger) {
      if (challenge.challengerConfirmed) {
        return res.status(400).json({ error: 'You already confirmed this result' });
      }
      challenge.challengerConfirmed = true;
      challenge.challengerReportedWinner = winnerId;
    } else {
      if (challenge.defenderConfirmed) {
        return res.status(400).json({ error: 'You already confirmed this result' });
      }
      challenge.defenderConfirmed = true;
      challenge.defenderReportedWinner = winnerId;
    }

    // Both have confirmed — now check if they agree
    if (challenge.challengerConfirmed && challenge.defenderConfirmed) {
      challenge.status = 'completed';

      const cWinner = challenge.challengerReportedWinner?.toString();
      const dWinner = challenge.defenderReportedWinner?.toString();

      if (cWinner !== dWinner) {
        // Disagreement
        challenge.disputed = true;
        await challenge.save();
        return res.json({
          message: '⚠️ Disputed result — both fighters reported different winners. An admin will review.',
          disputed: true,
        });
      }

      // Agreement — update ELO
      const agreedWinnerId = cWinner;
      const agreedLoserId  = agreedWinnerId === challengerId ? defenderId : challengerId;

      const winner = await Fighter.findById(agreedWinnerId);
      const loser  = await Fighter.findById(agreedLoserId);

      if (winner && loser) {
        const { winnerNewRating, loserNewRating } = calculateNewRatings(
          winner.eloRating,
          loser.eloRating
        );

        winner.eloRating = winnerNewRating;
        winner.wins      += 1;
        loser.eloRating  = loserNewRating;
        loser.losses     += 1;
        challenge.winnerId = agreedWinnerId;

        await winner.save();
        await loser.save();
        await challenge.save();

        // Check if winner earns or captures a territory badge
        const { badgeAwarded, zone, reason } = await checkAndAwardBadge(
          agreedWinnerId,
          agreedLoserId
        );

        // Notify both fighters of ELO change via socket
        const io = req.app.get('io');
        if (io) {
          io.to(agreedWinnerId).emit('elo:updated', {
            newRating:    winnerNewRating,
            result:       'win',
            badgeAwarded,
            badgeName:    zone?.name || null,
            badgeEmoji:   zone?.badgeEmoji || null,
            badgeReason:  reason || null,
          });
          io.to(agreedLoserId).emit('elo:updated', {
            newRating:  loserNewRating,
            result:     'loss',
            badgeLost:  badgeAwarded && reason === 'captured',
            badgeName:  zone?.name || null,
          });
        }

        let message = '✅ Result confirmed — ELO updated!';
        if (badgeAwarded && reason === 'claimed') message += ` 🏅 You claimed the ${zone.name} badge!`;
        if (badgeAwarded && reason === 'captured') message += ` 🏆 You captured the ${zone.name} badge!`;

        return res.json({
          message,
          winnerNewRating,
          loserNewRating,
          badgeAwarded,
          badgeName:  zone?.name  || null,
          badgeEmoji: zone?.badgeEmoji || null,
          disputed:   false,
        });
      }
    }

    await challenge.save();
    res.json({ message: '⏳ Your result recorded — waiting for opponent to confirm.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/challenge/mine ──────────────────────────────────────────────────
const getMyChallenges = async (req, res, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenges = await Challenge.find({
      $or: [{ challengerId: fighter._id }, { defenderId: fighter._id }],
    })
      .populate({ path: 'challengerId', populate: { path: 'userId', select: 'username' } })
      .populate({ path: 'defenderId',   populate: { path: 'userId', select: 'username' } })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(challenges);
  } catch (err) {
    next(err);
  }
};

module.exports = { sendChallenge, acceptChallenge, declineChallenge, confirmResult, getMyChallenges };
