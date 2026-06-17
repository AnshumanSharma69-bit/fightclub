const Challenge  = require('../models/Challenge');
const Fighter    = require('../models/Fighter');
const { calculateNewRatings } = require('../utils/elo');
const { checkAndAwardBadge }  = require('../utils/badge');
const { uploadFightProof }    = require('../utils/cloudinary');

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

// ─── POST /api/challenge/:id/upload-proof ────────────────────────────────────
// Winner uploads a photo as proof they won.
// Body: { image: <base64 string>, claimedWinnerId: <fighter _id> }
//
// This replaces the old "I Won" button — instead of just tapping a button,
// the winner must upload a photo. The loser then confirms or disputes.
const uploadProof = async (req, res, next) => {
  try {
    const { image, claimedWinnerId } = req.body;

    if (!image)           return res.status(400).json({ error: 'image is required (base64)' });
    if (!claimedWinnerId) return res.status(400).json({ error: 'claimedWinnerId is required' });

    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.status !== 'accepted') {
      return res.status(400).json({ error: 'Challenge must be accepted before uploading proof' });
    }

    const myId         = fighter._id.toString();
    const challengerId = challenge.challengerId.toString();
    const defenderId   = challenge.defenderId.toString();

    if (myId !== challengerId && myId !== defenderId) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    // Only the person claiming to have won should upload proof
    if (myId !== claimedWinnerId.toString()) {
      return res.status(400).json({ error: 'Only the winner should upload proof' });
    }

    // Upload to Cloudinary
    const proofImageUrl = await uploadFightProof(image, challenge._id.toString());

    // Record the winner's claim + proof
    challenge.proofImageUrl    = proofImageUrl;
    challenge.proofUploadedBy  = fighter._id;
    challenge.challengerReportedWinner = myId === challengerId ? claimedWinnerId : challenge.challengerReportedWinner;
    challenge.defenderReportedWinner   = myId === defenderId   ? claimedWinnerId : challenge.defenderReportedWinner;

    if (myId === challengerId) challenge.challengerConfirmed = true;
    else                        challenge.defenderConfirmed   = true;

    await challenge.save();

    // Notify the opponent — they need to confirm or dispute
    const opponentId = myId === challengerId ? defenderId : challengerId;
    const io = req.app.get('io');
    if (io) {
      io.to(opponentId).emit('challenge:proofUploaded', {
        challengeId:    challenge._id,
        proofImageUrl,
        claimedWinner:  claimedWinnerId,
        uploaderName:   req.user.username,
      });
    }

    res.json({
      message:       '✅ Proof uploaded — waiting for opponent to confirm or dispute',
      proofImageUrl,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/challenge/:id/confirm ─────────────────────────────────────────
// The LOSER (or the second fighter) confirms the result shown in the proof.
// Body: { agree: true/false }
// agree: true  → confirms the proof is correct, ELO updates
// agree: false → disputes the result, flagged for review
const confirmResult = async (req, res, next) => {
  try {
    const { agree } = req.body;
    if (agree === undefined) return res.status(400).json({ error: 'agree (true/false) is required' });

    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    if (challenge.status !== 'accepted') {
      return res.status(400).json({ error: 'Challenge must be accepted first' });
    }

    if (!challenge.proofImageUrl) {
      return res.status(400).json({ error: 'Winner must upload proof first' });
    }

    const myId         = fighter._id.toString();
    const challengerId = challenge.challengerId.toString();
    const defenderId   = challenge.defenderId.toString();
    const isChallenger = myId === challengerId;
    const isDefender   = myId === defenderId;

    if (!isChallenger && !isDefender) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    // Can't confirm your own proof
    const proofUploaderId = challenge.proofUploadedBy?.toString();
    if (myId === proofUploaderId) {
      return res.status(400).json({ error: 'You cannot confirm your own proof — wait for your opponent' });
    }

    // Already confirmed?
    const alreadyConfirmed = isChallenger ? challenge.challengerConfirmed : challenge.defenderConfirmed;
    if (alreadyConfirmed) {
      return res.status(400).json({ error: 'You already responded to this result' });
    }

    const io = req.app.get('io');

    if (!agree) {
      // Dispute
      challenge.disputed = true;
      challenge.status   = 'completed';
      if (isChallenger) { challenge.challengerConfirmed = true; }
      else               { challenge.defenderConfirmed   = true; }
      await challenge.save();

      if (io) {
        io.to(challengerId).emit('challenge:completed', { challengeId: challenge._id, disputed: true });
        io.to(defenderId).emit('challenge:completed',   { challengeId: challenge._id, disputed: true });
      }

      return res.json({ message: '⚠️ Result disputed — an admin will review the proof.', disputed: true });
    }

    // Agreed — the proof winner is accepted
    const agreedWinnerId = challenge.proofUploadedBy.toString();
    const agreedLoserId  = agreedWinnerId === challengerId ? defenderId : challengerId;

    if (isChallenger) challenge.challengerConfirmed = true;
    else               challenge.defenderConfirmed   = true;

    challenge.status   = 'completed';
    challenge.winnerId = agreedWinnerId;

    const winner = await Fighter.findById(agreedWinnerId);
    const loser  = await Fighter.findById(agreedLoserId);

    if (winner && loser) {
      const { winnerNewRating, loserNewRating } = calculateNewRatings(winner.eloRating, loser.eloRating);

      winner.eloRating = winnerNewRating;
      winner.wins      += 1;
      loser.eloRating  = loserNewRating;
      loser.losses     += 1;

      await winner.save();
      await loser.save();
    }

    await challenge.save();

    const { badgeAwarded, zone, reason } = await checkAndAwardBadge(agreedWinnerId, agreedLoserId);

    const callerIsWinner  = myId === agreedWinnerId;
    const myNewRating     = callerIsWinner ? winner?.eloRating : loser?.eloRating;

    let message = callerIsWinner
      ? `✅ Result confirmed — you won! New ELO: ${myNewRating}`
      : `✅ Result confirmed. New ELO: ${myNewRating}`;

    if (badgeAwarded) {
      if (callerIsWinner) {
        message += reason === 'claimed'
          ? ` 🏅 You claimed the ${zone.name} badge!`
          : ` 🏆 You captured the ${zone.name} badge!`;
      } else if (reason === 'captured') {
        message += ` 💔 Your opponent captured the ${zone.name} badge from you.`;
      }
    }

    if (io) {
      io.to(agreedWinnerId).emit('challenge:completed', {
        challengeId: challenge._id, disputed: false, youWon: true,
        newRating: winner?.eloRating, badgeAwarded, badgeName: zone?.name || null,
      });
      io.to(agreedLoserId).emit('challenge:completed', {
        challengeId: challenge._id, disputed: false, youWon: false,
        newRating: loser?.eloRating, badgeLost: badgeAwarded && reason === 'captured',
      });
    }

    res.json({ message, disputed: false, badgeAwarded, badgeName: zone?.name || null });
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

module.exports = {
  sendChallenge,
  acceptChallenge,
  declineChallenge,
  uploadProof,
  confirmResult,
  getMyChallenges,
};
