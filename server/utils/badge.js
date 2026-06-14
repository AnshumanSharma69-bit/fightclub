const Zone    = require('../models/Zone');
const Fighter = require('../models/Fighter');
const { reverseGeocode }    = require('./geocode');
const { createCirclePolygon } = require('./geo');

// New auto-created zones get a 10km-radius circle around the winner's location
const ZONE_RADIUS_KM = 10;

// Visual style cycled through for newly-discovered zones
const ZONE_PALETTE = [
  { color: '#e63946', emoji: '🔴' },
  { color: '#3b82f6', emoji: '🔵' },
  { color: '#f59e0b', emoji: '🟡' },
  { color: '#8b5cf6', emoji: '🟣' },
  { color: '#10b981', emoji: '🟢' },
  { color: '#f97316', emoji: '🟠' },
  { color: '#ec4899', emoji: '🩷' },
  { color: '#06b6d4', emoji: '🩵' },
  { color: '#a855f7', emoji: '💜' },
  { color: '#eab308', emoji: '🟨' },
];

function randomZoneStyle() {
  return ZONE_PALETTE[Math.floor(Math.random() * ZONE_PALETTE.length)];
}

// ─── checkAndAwardBadge ───────────────────────────────────────────────────────
// Called after a fight result is confirmed.
//
// 1. Find which zone the winner's saved location falls inside.
// 2. If NO zone covers that spot, reverse-geocode it to find the
//    city/town/village name and create a brand-new zone (a 10km circle)
//    centered on the winner — this is how new "gyms" appear on the map.
// 3. Unclaimed zone → winner claims it.
//    Loser was the holder → winner captures it from them.
//    Otherwise → no change.
//
// Returns: { badgeAwarded: bool, zone: Zone | null, reason?: 'claimed'|'captured' }
async function checkAndAwardBadge(winnerId, loserId) {
  try {
    const winner = await Fighter.findById(winnerId);
    if (!winner || !winner.location?.coordinates) return { badgeAwarded: false, zone: null };

    const [lon, lat] = winner.location.coordinates;
    if (lon === 0 && lat === 0) return { badgeAwarded: false, zone: null };

    // 1. Does an existing zone already cover this location?
    let zone = await Zone.findOne({
      boundary: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [lon, lat] },
        },
      },
    });

    // 2. No zone here yet — discover this place and create one
    if (!zone) {
      const place = await reverseGeocode(lat, lon);
      const placeName = place?.name;

      // Couldn't determine a place name (geocoding failed/offline) —
      // skip badge logic for this fight rather than crashing it
      if (!placeName) return { badgeAwarded: false, zone: null };

      // Reuse a zone with this name if it already exists (e.g. someone
      // else in the same town created it from a slightly different spot)
      zone = await Zone.findOne({ name: placeName });

      if (!zone) {
        const style = randomZoneStyle();
        try {
          zone = await Zone.create({
            name:       placeName,
            city:       placeName,
            state:      place.state || '',
            color:      style.color,
            badgeEmoji: style.emoji,
            boundary: {
              type: 'Polygon',
              coordinates: [createCirclePolygon(lon, lat, ZONE_RADIUS_KM)],
            },
          });
        } catch (err) {
          // Race condition: another request created the same-named zone
          // a moment ago — just use that one
          if (err.code === 11000) {
            zone = await Zone.findOne({ name: placeName });
          } else {
            throw err;
          }
        }
      }
    }

    if (!zone) return { badgeAwarded: false, zone: null };

    const currentHolderId = zone.currentHolderId?.toString();
    const loserIdStr      = loserId.toString();

    // Unclaimed — winner claims it (this covers brand-new zones too,
    // since currentHolderId is null on creation)
    if (!currentHolderId) {
      await claimZone(zone, winner);
      return { badgeAwarded: true, zone, reason: 'claimed' };
    }

    // Loser was the holder — winner captures it
    if (currentHolderId === loserIdStr) {
      await claimZone(zone, winner);
      await Fighter.findByIdAndUpdate(loserId, { $pull: { badgesEarned: zone._id } });
      return { badgeAwarded: true, zone, reason: 'captured' };
    }

    // Neither — no badge change
    return { badgeAwarded: false, zone };
  } catch (err) {
    console.error('Badge check error:', err);
    return { badgeAwarded: false, zone: null };
  }
}

async function claimZone(zone, winner) {
  zone.currentHolderId = winner._id;
  zone.capturedAt      = new Date();
  zone.captureCount   += 1;
  await zone.save();

  await Fighter.findByIdAndUpdate(winner._id, {
    $addToSet: { badgesEarned: zone._id },
  });
}

module.exports = { checkAndAwardBadge };
