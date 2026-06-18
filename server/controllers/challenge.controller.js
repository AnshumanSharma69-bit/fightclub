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
// EITHER fighter can upload proof claiming they won.
// Body: { image: <base64 string> }  — claimedWinnerId is always the uploader
//
// Two outcomes:
// 1. First upload  → opponent gets notified, sees photo, can confirm/dispute
// 2. Second upload (both claim victory) → automatic dispute, both photos shown
const uploadProof = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image is required (base64)' });

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
    const isChallenger = myId === challengerId;
    const isDefender   = myId === defenderId;

    if (!isChallenger && !isDefender) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    // Has this fighter already uploaded their own proof?
    const myExistingProof = isChallenger ? challenge.challengerProofUrl : challenge.defenderProofUrl;
    if (myExistingProof) {
      return res.status(400).json({ error: 'You already uploaded proof for this fight' });
    }

    const proofUrl = await uploadFightProof(image, challenge._id.toString());

    // Store this fighter's own proof + their claim (always claiming themselves as winner)
    if (isChallenger) {
      challenge.challengerProofUrl      = proofUrl;
      challenge.challengerReportedWinner = myId;
      challenge.challengerConfirmed      = true;
    } else {
      challenge.defenderProofUrl        = proofUrl;
      challenge.defenderReportedWinner   = myId;
      challenge.defenderConfirmed        = true;
    }

    const io = req.app.get('io');
    const opponentId = isChallenger ? defenderId : challengerId;

    // Did the OTHER fighter already upload proof before this one?
    const opponentHasProof = isChallenger ? challenge.defenderProofUrl : challenge.challengerProofUrl;

    if (opponentHasProof) {
      // Both fighters have now uploaded — compare their claims
      const cWinner = challenge.challengerReportedWinner?.toString();
      const dWinner = challenge.defenderReportedWinner?.toString();

      challenge.status = 'completed';

      if (cWinner === dWinner) {
        // Rare but possible: both uploaded proof but agree on the same winner
        // (e.g. loser uploads a photo conceding) — treat as confirmed
        await finalizeResult(challenge, cWinner, io, challengerId, defenderId);
        await challenge.save();
        return res.json({ message: '✅ Both fighters submitted — result confirmed and ELO updated!', disputed: false });
      }

      // Both claim victory — automatic dispute, show both photos
      challenge.disputed = true;
      await challenge.save();

      if (io) {
        io.to(challengerId).emit('challenge:completed', { challengeId: challenge._id, disputed: true, bothClaimed: true });
        io.to(defenderId).emit('challenge:completed',   { challengeId: challenge._id, disputed: true, bothClaimed: true });
      }

      return res.json({
        message: '⚠️ Both fighters claim victory — marked as disputed. Both photos are visible for review.',
        disputed: true,
        bothClaimed: true,
      });
    }

    // First upload — just save and notify opponent to review
    await challenge.save();

    if (io) {
      io.to(opponentId).emit('challenge:proofUploaded', {
        challengeId:   challenge._id,
        proofImageUrl: proofUrl,
        uploaderName:  req.user.username,
      });
    }

    res.json({
      message: '✅ Proof uploaded — your opponent will review and confirm or upload their own',
      proofImageUrl: proofUrl,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: apply ELO + badge changes once a winner is agreed ───────────────
async function finalizeResult(challenge, agreedWinnerId, io, challengerId, defenderId) {
  const agreedLoserId = agreedWinnerId === challengerId ? defenderId : challengerId;

  const winner = await Fighter.findById(agreedWinnerId);
  const loser  = await Fighter.findById(agreedLoserId);

  if (!winner || !loser) return;

  const { winnerNewRating, loserNewRating } = calculateNewRatings(winner.eloRating, loser.eloRating);

  winner.eloRating = winnerNewRating;
  winner.wins      += 1;
  loser.eloRating  = loserNewRating;
  loser.losses     += 1;
  challenge.winnerId = agreedWinnerId;

  await winner.save();
  await loser.save();

  const { badgeAwarded, zone, reason } = await checkAndAwardBadge(agreedWinnerId, agreedLoserId);

  if (io) {
    io.to(agreedWinnerId).emit('challenge:completed', {
      challengeId: challenge._id, disputed: false, youWon: true,
      newRating: winnerNewRating, badgeAwarded, badgeName: zone?.name || null,
    });
    io.to(agreedLoserId).emit('challenge:completed', {
      challengeId: challenge._id, disputed: false, youWon: false,
      newRating: loserNewRating, badgeLost: badgeAwarded && reason === 'captured',
    });
  }
}

// ─── POST /api/challenge/:id/confirm ─────────────────────────────────────────
// Used when only ONE fighter has uploaded proof — the other reviews it.
// Body: { agree: true/false }
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

    const myId         = fighter._id.toString();
    const challengerId = challenge.challengerId.toString();
    const defenderId   = challenge.defenderId.toString();
    const isChallenger = myId === challengerId;
    const isDefender   = myId === defenderId;

    if (!isChallenger && !isDefender) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    // Find the opponent's proof — that's what we're confirming/disputing
    const opponentProofUrl   = isChallenger ? challenge.defenderProofUrl   : challenge.challengerProofUrl;
    const opponentReportedId = isChallenger ? challenge.defenderReportedWinner : challenge.challengerReportedWinner;

    if (!opponentProofUrl) {
      return res.status(400).json({ error: 'Your opponent has not uploaded proof yet' });
    }

    // Already responded?
    const myAlreadyConfirmed = isChallenger ? challenge.challengerConfirmed : challenge.defenderConfirmed;
    if (myAlreadyConfirmed) {
      return res.status(400).json({ error: 'You already responded to this result' });
    }

    const io = req.app.get('io');

    if (isChallenger) challenge.challengerConfirmed = true;
    else               challenge.defenderConfirmed   = true;

    if (!agree) {
      challenge.disputed = true;
      challenge.status   = 'completed';
      await challenge.save();

      if (io) {
        io.to(challengerId).emit('challenge:completed', { challengeId: challenge._id, disputed: true });
        io.to(defenderId).emit('challenge:completed',   { challengeId: challenge._id, disputed: true });
      }
      return res.json({ message: '⚠️ Result disputed — an admin will review the proof.', disputed: true });
    }

    // Agreed — finalize with the opponent's claimed winner
    challenge.status = 'completed';
    await finalizeResult(challenge, opponentReportedId.toString(), io, challengerId, defenderId);
    await challenge.save();

    const callerIsWinner = myId === opponentReportedId.toString();
    res.json({
      message: callerIsWinner
        ? '✅ Result confirmed — you won!'
        : '✅ Result confirmed — ELO updated.',
      disputed: false,
    });
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
