const Fighter = require('../models/Fighter');

// ─── GET /api/fighter/me ──────────────────────────────────────────────────────
const getMyProfile = async (req, res, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });
    res.json(fighter.toPublicJSON());
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/fighter/nearby ──────────────────────────────────────────────────
const getNearbyFighters = async (req, res, next) => {
  try {
    const { lon, lat, radius = 50000 } = req.query;

    let fighters;

    if (lon && lat) {
      fighters = await Fighter.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] },
            $maxDistance: parseInt(radius),
          },
        },
      }).populate('userId', 'username avatarUrl');
    } else {
      fighters = await Fighter.find({ availableToFight: true })
        .populate('userId', 'username avatarUrl')
        .limit(100);
    }

    const result = fighters.map((f) => ({
      ...f.toPublicJSON(),
      username:  f.userId?.username  || 'Fighter',
      avatarUrl: f.userId?.avatarUrl || null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/fighter/:id ─────────────────────────────────────────────────────
// Public profile — shareable link. Populates badge details (name + emoji)
// so the profile page can render them without a separate request.
const getProfileById = async (req, res, next) => {
  try {
    const fighter = await Fighter.findById(req.params.id)
      .populate('userId', 'username avatarUrl')
      .populate('badgesEarned', 'name badgeEmoji color city');

    if (!fighter) return res.status(404).json({ error: 'Fighter not found' });

    res.json({
      ...fighter.toPublicJSON(),
      username:  fighter.userId?.username  || 'Fighter',
      avatarUrl: fighter.userId?.avatarUrl || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/fighter/me ────────────────────────────────────────────────────
const updateMyProfile = async (req, res, next) => {
  try {
    const allowedFields = ['heightCm', 'weightKg', 'reachCm', 'availableToFight', 'location', 'needsOnboarding'];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    if (updates.location) {
      const { coordinates } = updates.location;
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({ error: 'location.coordinates must be [longitude, latitude]' });
      }
      const [lon, lat] = coordinates;
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Coordinates are out of valid range' });
      }
      updates.location = { type: 'Point', coordinates };
    }

    const fighter = await Fighter.findOneAndUpdate(
      { userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'username avatarUrl');

    if (!fighter) return res.status(404).json({ error: 'Fighter profile not found' });

    res.json({
      ...fighter.toPublicJSON(),
      username: fighter.userId?.username || 'Fighter',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/fighter/:id/history ────────────────────────────────────────────
// Returns completed fights involving this fighter, sorted newest first.
// Public endpoint — no auth required.
const getFightHistory = async (req, res, next) => {
  try {
    const fighter = await Fighter.findById(req.params.id);
    if (!fighter) return res.status(404).json({ error: 'Fighter not found' });

    const challenges = await Challenge.find({
      $or: [
        { challengerId: fighter._id },
        { defenderId:   fighter._id },
      ],
      status: 'completed',
    })
      .populate({ path: 'challengerId', populate: { path: 'userId', select: 'username' } })
      .populate({ path: 'defenderId',   populate: { path: 'userId', select: 'username' } })
      .sort({ updatedAt: -1 })
      .limit(20);

    const history = challenges.map(c => {
      const isChallenger  = c.challengerId?._id?.toString() === fighter._id.toString();
      const opponent      = isChallenger ? c.defenderId : c.challengerId;
      const won           = c.winnerId?.toString() === fighter._id.toString();
      const myProofUrl    = isChallenger ? c.challengerProofUrl : c.defenderProofUrl;
      const oppProofUrl   = isChallenger ? c.defenderProofUrl   : c.challengerProofUrl;

      return {
        _id:          c._id,
        date:         c.updatedAt,
        opponent: {
          _id:      opponent?._id,
          username: opponent?.userId?.username || 'Unknown',
        },
        result:       c.disputed ? 'disputed' : won ? 'win' : 'loss',
        disputed:     c.disputed,
        myProofUrl,
        oppProofUrl,
        wasChallenger: isChallenger,
      };
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyProfile, getProfileById, updateMyProfile, getNearbyFighters, getFightHistory };
