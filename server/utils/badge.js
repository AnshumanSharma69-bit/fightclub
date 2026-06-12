const Zone    = require('../models/Zone');
const Fighter = require('../models/Fighter');

// ─── checkAndAwardBadge ───────────────────────────────────────────────────────
// Called after a fight result is confirmed.
// winnerId: Fighter _id of the winner (string)
// winnerLocation: { coordinates: [lon, lat] } — winner's saved location
//
// Logic:
// 1. Find which zone the winner is in (using their location)
// 2. If zone is unclaimed → winner claims it automatically
// 3. If zone holder is the loser → winner takes the badge
// 4. Otherwise → no badge change
//
// Returns: { badgeAwarded: bool, zone: Zone | null }

async function checkAndAwardBadge(winnerId, loserId) {
  try {
    const winner = await Fighter.findById(winnerId);
    if (!winner || !winner.location?.coordinates) return { badgeAwarded: false, zone: null };

    const [lon, lat] = winner.location.coordinates;
    if (lon === 0 && lat === 0) return { badgeAwarded: false, zone: null };

    // Find the zone that contains the winner's location
    // $geoIntersects: returns the zone whose polygon contains this point
    const zone = await Zone.findOne({
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
        },
      },
    });

    if (!zone) return { badgeAwarded: false, zone: null };

    const currentHolderId = zone.currentHolderId?.toString();
    const winnerIdStr     = winnerId.toString();
    const loserIdStr      = loserId.toString();

    // Case 1: Zone is unclaimed — winner claims it
    if (!currentHolderId) {
      await claimZone(zone, winner);
      return { badgeAwarded: true, zone, reason: 'claimed' };
    }

    // Case 2: Loser was the holder — winner takes the badge
    if (currentHolderId === loserIdStr) {
      await claimZone(zone, winner);
      // Remove badge from loser
      await Fighter.findByIdAndUpdate(loserId, {
        $pull: { badgesEarned: zone._id },
      });
      return { badgeAwarded: true, zone, reason: 'captured' };
    }

    // Case 3: Neither — no badge change (fight didn't involve the holder)
    return { badgeAwarded: false, zone };
  } catch (err) {
    console.error('Badge check error:', err);
    return { badgeAwarded: false, zone: null };
  }
}

async function claimZone(zone, winner) {
  zone.currentHolderId = winner._id;
  zone.capturedAt      = new Date();
  zone.captureCount    += 1;
  await zone.save();

  // Add badge to winner's profile if not already there
  await Fighter.findByIdAndUpdate(winner._id, {
    $addToSet: { badgesEarned: zone._id },
  });
}

module.exports = { checkAndAwardBadge };
