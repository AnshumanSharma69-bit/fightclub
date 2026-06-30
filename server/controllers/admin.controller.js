const User      = require('../models/User');
const Fighter   = require('../models/Fighter');
const Challenge = require('../models/Challenge');
const Zone      = require('../models/Zone');

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
// Quick top-line numbers for the dashboard header
const getStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalFighters,
      availableNow,
      totalFights,
      fightsToday,
      pendingChallenges,
      activeFights,
      disputedCount,
      claimedZones,
      totalZones,
    ] = await Promise.all([
      User.countDocuments(),
      Fighter.countDocuments(),
      Fighter.countDocuments({ availableToFight: true }),
      Challenge.countDocuments({ status: 'completed' }),
      Challenge.countDocuments({ status: 'completed', updatedAt: { $gte: todayStart } }),
      Challenge.countDocuments({ status: 'pending' }),
      Challenge.countDocuments({ status: 'accepted' }),
      Challenge.countDocuments({ disputed: true }),
      Zone.countDocuments({ currentHolderId: { $ne: null } }),
      Zone.countDocuments(),
    ]);

    res.json({
      totalUsers,
      totalFighters,
      availableNow,
      totalFights,
      fightsToday,
      pendingChallenges,
      activeFights,
      disputedCount,
      claimedZones,
      totalZones,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/fighters ────────────────────────────────────────────────
// All fighters with their user info, sorted by most recently active
const getAllFighters = async (req, res, next) => {
  try {
    const { search } = req.query;

    let fighters = await Fighter.find()
      .populate('userId', 'username email avatarUrl isActive authProvider createdAt')
      .populate('badgesEarned', 'name badgeEmoji')
      .sort({ updatedAt: -1 })
      .limit(200);

    if (search) {
      const term = search.toLowerCase();
      fighters = fighters.filter(f =>
        f.userId?.username?.toLowerCase().includes(term) ||
        f.userId?.email?.toLowerCase().includes(term)
      );
    }

    const result = fighters.map(f => ({
      _id:              f._id,
      username:         f.userId?.username || 'Unknown',
      email:            f.userId?.email || '',
      isActive:         f.userId?.isActive ?? true,
      authProvider:     f.userId?.authProvider || 'local',
      joinedAt:         f.userId?.createdAt,
      heightCm:         f.heightCm,
      weightKg:         f.weightKg,
      weightClass:      f.weightClass,
      eloRating:        f.eloRating,
      wins:             f.wins,
      losses:           f.losses,
      availableToFight: f.availableToFight,
      badgeCount:       f.badgesEarned?.length || 0,
      badges:           f.badgesEarned?.map(b => ({ name: b.name, emoji: b.badgeEmoji })) || [],
      hasLocation:      f.location?.coordinates?.[0] !== 0 || f.location?.coordinates?.[1] !== 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/fights ──────────────────────────────────────────────────
// All challenges/fights, newest first. Optional ?status=pending|accepted|completed
const getAllFights = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const fights = await Challenge.find(filter)
      .populate({ path: 'challengerId', populate: { path: 'userId', select: 'username' } })
      .populate({ path: 'defenderId',   populate: { path: 'userId', select: 'username' } })
      .populate({ path: 'winnerId',     populate: { path: 'userId', select: 'username' } })
      .sort({ updatedAt: -1 })
      .limit(200);

    const result = fights.map(f => ({
      _id:           f._id,
      status:        f.status,
      disputed:      f.disputed,
      challenger:    f.challengerId?.userId?.username || 'Unknown',
      challengerId:  f.challengerId?._id,
      defender:      f.defenderId?.userId?.username || 'Unknown',
      defenderId:    f.defenderId?._id,
      winner:        f.winnerId?.userId?.username || null,
      meetupCode:    f.meetupCode,
      message:       f.message,
      challengerProofUrl: f.challengerProofUrl,
      defenderProofUrl:   f.defenderProofUrl,
      challengerConfirmed: f.challengerConfirmed,
      defenderConfirmed:   f.defenderConfirmed,
      createdAt:     f.createdAt,
      updatedAt:     f.updatedAt,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/disputes ────────────────────────────────────────────────
// Only disputed fights — the ones needing manual review
const getDisputes = async (req, res, next) => {
  try {
    const disputes = await Challenge.find({ disputed: true })
      .populate({ path: 'challengerId', populate: { path: 'userId', select: 'username' } })
      .populate({ path: 'defenderId',   populate: { path: 'userId', select: 'username' } })
      .sort({ updatedAt: -1 });

    const result = disputes.map(f => ({
      _id:           f._id,
      challenger:    f.challengerId?.userId?.username || 'Unknown',
      challengerId:  f.challengerId?._id,
      defender:      f.defenderId?.userId?.username || 'Unknown',
      defenderId:    f.defenderId?._id,
      challengerProofUrl: f.challengerProofUrl,
      defenderProofUrl:   f.defenderProofUrl,
      challengerReportedWinner: f.challengerReportedWinner,
      defenderReportedWinner:   f.defenderReportedWinner,
      meetupCode:    f.meetupCode,
      updatedAt:     f.updatedAt,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/disputes/:id/resolve ───────────────────────────────────
// Admin manually picks the winner of a disputed fight.
// This applies ELO + badge changes exactly like a normal confirmed result.
const resolveDispute = async (req, res, next) => {
  try {
    const { winnerId } = req.body;
    if (!winnerId) return res.status(400).json({ error: 'winnerId is required' });

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Fight not found' });
    if (!challenge.disputed) return res.status(400).json({ error: 'This fight is not disputed' });

    const challengerId = challenge.challengerId.toString();
    const defenderId   = challenge.defenderId.toString();
    const loserId       = winnerId.toString() === challengerId ? defenderId : challengerId;

    const { calculateNewRatings } = require('../utils/elo');
    const { checkAndAwardBadge }  = require('../utils/badge');

    const winner = await Fighter.findById(winnerId);
    const loser  = await Fighter.findById(loserId);
    if (!winner || !loser) return res.status(404).json({ error: 'Fighter not found' });

    const { winnerNewRating, loserNewRating } = calculateNewRatings(winner.eloRating, loser.eloRating);

    winner.eloRating = winnerNewRating;
    winner.wins      += 1;
    loser.eloRating  = loserNewRating;
    loser.losses     += 1;

    await winner.save();
    await loser.save();

    challenge.winnerId = winnerId;
    challenge.disputed  = false; // resolved
    await challenge.save();

    const { badgeAwarded, zone, reason } = await checkAndAwardBadge(winnerId, loserId);

    const io = req.app.get('io');
    if (io) {
      io.to(winnerId.toString()).emit('challenge:completed', {
        challengeId: challenge._id, disputed: false, youWon: true,
        newRating: winnerNewRating, badgeAwarded, badgeName: zone?.name || null, resolvedByAdmin: true,
      });
      io.to(loserId).emit('challenge:completed', {
        challengeId: challenge._id, disputed: false, youWon: false,
        newRating: loserNewRating, resolvedByAdmin: true,
      });
    }

    res.json({ message: 'Dispute resolved', winnerNewRating, loserNewRating, badgeAwarded });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/fighters/:id/ban ──────────────────────────────────────
// Toggle a user's isActive flag (soft ban — they can't log in but data stays)
const toggleBanFighter = async (req, res, next) => {
  try {
    const fighter = await Fighter.findById(req.params.id);
    if (!fighter) return res.status(404).json({ error: 'Fighter not found' });

    const user = await User.findById(fighter.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ message: user.isActive ? 'User unbanned' : 'User banned', isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getAllFighters,
  getAllFights,
  getDisputes,
  resolveDispute,
  toggleBanFighter,
};
