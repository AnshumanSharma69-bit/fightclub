const mongoose = require('mongoose');

// ─── Weight class helper ───────────────────────────────────────────────────────
// Auto-assigns a weight class string from a weight in kg.
// Used in the pre-save hook so it's always in sync with weightKg.
function getWeightClass(weightKg) {
  if (weightKg <= 52)  return 'Strawweight';
  if (weightKg <= 56)  return 'Flyweight';
  if (weightKg <= 61)  return 'Bantamweight';
  if (weightKg <= 66)  return 'Featherweight';
  if (weightKg <= 70)  return 'Lightweight';
  if (weightKg <= 77)  return 'Welterweight';
  if (weightKg <= 84)  return 'Middleweight';
  if (weightKg <= 93)  return 'Light Heavyweight';
  if (weightKg <= 120) return 'Heavyweight';
  return 'Super Heavyweight';
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const fighterSchema = new mongoose.Schema(
  {
    // One-to-one link back to the User who owns this profile
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one fighter profile per user account
    },

    // True for Google OAuth users until they fill in their real stats
    needsOnboarding: {
      type: Boolean,
      default: false,
    },

    // ── Body stats ────────────────────────────────────────────────────────────
    heightCm: {
      type: Number,
      required: [true, 'Height is required'],
      min: [100, 'Height must be at least 100 cm'],
      max: [250, 'Height must be at most 250 cm'],
    },

    weightKg: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [40, 'Weight must be at least 40 kg'],
      max: [200, 'Weight must be at most 200 kg'],
    },

    reachCm: {
      type: Number,
      default: null,
      min: [100, 'Reach must be at least 100 cm'],
      max: [260, 'Reach must be at most 260 cm'],
    },

    // Auto-derived from weightKg in the pre-save hook (never set manually)
    weightClass: {
      type: String,
      enum: [
        'Strawweight',
        'Flyweight',
        'Bantamweight',
        'Featherweight',
        'Lightweight',
        'Welterweight',
        'Middleweight',
        'Light Heavyweight',
        'Heavyweight',
        'Super Heavyweight',
      ],
    },

    // ── Ranking ───────────────────────────────────────────────────────────────
    // ELO starts at 1000 (standard starting point, same as chess)
    eloRating: {
      type: Number,
      default: 1000,
      min: 0,
    },

    wins: {
      type: Number,
      default: 0,
      min: 0,
    },

    losses: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Availability ─────────────────────────────────────────────────────────
    // Toggled by the user from the map page ("I'm available to fight")
    availableToFight: {
      type: Boolean,
      default: false,
    },

    // ── Location (GeoJSON Point) ──────────────────────────────────────────────
    // MongoDB's native geospatial format.
    // coordinates: [longitude, latitude]  ← NOTE: lon first, lat second (GeoJSON standard)
    // Set when the user enables availableToFight from the frontend.
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // ── Territory badges ──────────────────────────────────────────────────────
    // Array of Zone ObjectIds this fighter has earned badges for
    badgesEarned: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// 2dsphere index: required for MongoDB geospatial queries ($near, $geoWithin, etc.)
// Without this, map queries that find "fighters near me" will fail.
fighterSchema.index({ location: '2dsphere' });

// Compound index: speeds up the matchmaking query
// "find available fighters near me in the same weight class"
fighterSchema.index({ weightClass: 1, availableToFight: 1, eloRating: -1 });

// ─── Pre-save hook: auto-assign weight class ──────────────────────────────────
fighterSchema.pre('save', function () {
  if (this.isModified('weightKg')) {
    this.weightClass = getWeightClass(this.weightKg);
  }
});

// ─── Virtual: win rate ────────────────────────────────────────────────────────
// Virtuals are computed fields — they don't live in the DB, just on the JS object.
// Usage: fighter.winRate  → returns e.g. "72.5%"
fighterSchema.virtual('winRate').get(function () {
  const total = this.wins + this.losses;
  if (total === 0) return '0%';
  return ((this.wins / total) * 100).toFixed(1) + '%';
});

// ─── Virtual: total fights ────────────────────────────────────────────────────
fighterSchema.virtual('totalFights').get(function () {
  return this.wins + this.losses;
});

// Make virtuals show up in JSON responses (e.g. res.json(fighter))
fighterSchema.set('toJSON', { virtuals: true });

// ─── Instance method: public profile ─────────────────────────────────────────
// Strips internal fields before sending to other users.
// Your own profile gets more detail; a stranger only sees this.
fighterSchema.methods.toPublicJSON = function () {
  return {
    _id:              this._id,
    userId:           this.userId,
    heightCm:         this.heightCm,
    weightKg:         this.weightKg,
    reachCm:          this.reachCm,
    weightClass:      this.weightClass,
    eloRating:        this.eloRating,
    wins:             this.wins,
    losses:           this.losses,
    winRate:          this.winRate,
    totalFights:      this.totalFights,
    availableToFight: this.availableToFight,
    badgesEarned:     this.badgesEarned,
    location:         this.location,
    needsOnboarding:  this.needsOnboarding,
  };
};

const Fighter = mongoose.model('Fighter', fighterSchema);

module.exports = Fighter;
