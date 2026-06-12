const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g. "Mumbai", "Delhi", "Nagpur"
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      default: '',
    },

    // GeoJSON Polygon — the city boundary
    // coordinates: [[[lon, lat], [lon, lat], ...]]  (array of rings)
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },

    // The fighter who currently holds this zone's badge
    // null = unclaimed — first winner in the zone claims it
    currentHolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      default: null,
    },

    // Color shown on the map overlay for this zone
    color: {
      type: String,
      default: '#e63946',
    },

    // Emoji shown as the badge icon on profiles
    badgeEmoji: {
      type: String,
      default: '🏅',
    },

    // When was the badge last captured
    capturedAt: {
      type: Date,
      default: null,
    },

    // How many times this badge has changed hands
    captureCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries
// Used to find which zone a fighter is in based on their coordinates
zoneSchema.index({ boundary: '2dsphere' });

const Zone = mongoose.model('Zone', zoneSchema);
module.exports = Zone;
