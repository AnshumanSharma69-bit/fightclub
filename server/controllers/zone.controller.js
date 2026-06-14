const Zone    = require('../models/Zone');
const Fighter = require('../models/Fighter');

// ─── GET /api/zone/all ────────────────────────────────────────────────────────
const getAllZones = async (req, res, next) => {
  try {
    const zones = await Zone.find()
      .populate({
        path: 'currentHolderId',
        populate: { path: 'userId', select: 'username' },
      });

    const result = zones.map(z => ({
      _id:          z._id,
      name:         z.name,
      city:         z.city,
      boundary:     z.boundary,
      color:        z.color,
      badgeEmoji:   z.badgeEmoji,
      capturedAt:   z.capturedAt,
      captureCount: z.captureCount,
      holder: z.currentHolderId ? {
        _id:       z.currentHolderId._id,
        username:  z.currentHolderId.userId?.username || 'Unknown',
        eloRating: z.currentHolderId.eloRating,
      } : null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/zone/leaderboard ────────────────────────────────────────────────
// Returns fighters who hold at least one badge, sorted by badge count then ELO.
// Sorting is done in JS after fetching — MongoDB can't reliably sort by
// array length directly via .sort(), so we use .lean() + a plain JS sort.
const getLeaderboard = async (req, res, next) => {
  try {
    const fighters = await Fighter.find({ 'badgesEarned.0': { $exists: true } })
      .populate('userId', 'username avatarUrl')
      .populate('badgesEarned', 'name badgeEmoji')
      .lean();

    const result = fighters
      .map(f => ({
        _id:        f._id,
        username:   f.userId?.username || 'Fighter',
        eloRating:  f.eloRating,
        wins:       f.wins,
        losses:     f.losses,
        badgeCount: (f.badgesEarned || []).length,
        badges:     (f.badgesEarned || []).map(b => ({ name: b.name, emoji: b.badgeEmoji })),
      }))
      .sort((a, b) => (b.badgeCount - a.badgeCount) || (b.eloRating - a.eloRating))
      .slice(0, 20);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/zone/mine ───────────────────────────────────────────────────────
const getMyZones = async (req, res, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: req.user._id });
    if (!fighter) return res.status(404).json({ error: 'Fighter not found' });

    const zones = await Zone.find({ currentHolderId: fighter._id });
    res.json(zones);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/zone/seed ──────────────────────────────────────────────────────
const seedZones = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Cannot seed in production' });
    }

    const cityData = [
      { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', color: '#e63946', badgeEmoji: '🔴',
        coords: [[72.77, 18.89], [72.99, 18.89], [72.99, 19.28], [72.77, 19.28], [72.77, 18.89]] },
      { name: 'Delhi', city: 'Delhi', state: 'Delhi', color: '#3b82f6', badgeEmoji: '🔵',
        coords: [[76.84, 28.40], [77.35, 28.40], [77.35, 28.88], [76.84, 28.88], [76.84, 28.40]] },
      { name: 'Nagpur', city: 'Nagpur', state: 'Maharashtra', color: '#f59e0b', badgeEmoji: '🟡',
        coords: [[78.99, 21.05], [79.18, 21.05], [79.18, 21.22], [78.99, 21.22], [78.99, 21.05]] },
      { name: 'Pune', city: 'Pune', state: 'Maharashtra', color: '#8b5cf6', badgeEmoji: '🟣',
        coords: [[73.72, 18.42], [73.98, 18.42], [73.98, 18.64], [73.72, 18.64], [73.72, 18.42]] },
      { name: 'Bangalore', city: 'Bangalore', state: 'Karnataka', color: '#10b981', badgeEmoji: '🟢',
        coords: [[77.46, 12.83], [77.75, 12.83], [77.75, 13.14], [77.46, 13.14], [77.46, 12.83]] },
      { name: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', color: '#f97316', badgeEmoji: '🟠',
        coords: [[78.31, 17.27], [78.60, 17.27], [78.60, 17.53], [78.31, 17.53], [78.31, 17.27]] },
      { name: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', color: '#ec4899', badgeEmoji: '🩷',
        coords: [[80.18, 12.93], [80.32, 12.93], [80.32, 13.15], [80.18, 13.15], [80.18, 12.93]] },
      { name: 'Kolkata', city: 'Kolkata', state: 'West Bengal', color: '#14b8a6', badgeEmoji: '🩵',
        coords: [[88.25, 22.45], [88.45, 22.45], [88.45, 22.65], [88.25, 22.65], [88.25, 22.45]] },
      { name: 'Aurangabad', city: 'Aurangabad', state: 'Maharashtra', color: '#a855f7', badgeEmoji: '💜',
        coords: [[75.28, 19.82], [75.42, 19.82], [75.42, 19.95], [75.28, 19.95], [75.28, 19.82]] },
    ];

    let created = 0;
    for (const city of cityData) {
      const exists = await Zone.findOne({ name: city.name });
      if (!exists) {
        await Zone.create({
          name:       city.name,
          city:       city.city,
          state:      city.state,
          color:      city.color,
          badgeEmoji: city.badgeEmoji,
          boundary: { type: 'Polygon', coordinates: [city.coords] },
        });
        created++;
      }
    }

    res.json({ message: `Seeded ${created} zones`, total: cityData.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllZones, getLeaderboard, getMyZones, seedZones };
