const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    // The fighter who sent the challenge
    challengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      required: true,
    },

    // The fighter being challenged
    defenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      required: true,
    },

    // pending → accepted → completed / declined / expired
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed', 'expired'],
      default: 'pending',
    },

    // Generated when defender accepts — both fighters get this code
    // They use it to confirm they actually met up
    meetupCode: {
      type: String,
      default: null,
    },

    // Optional message from challenger
    message: {
      type: String,
      maxlength: 200,
      default: '',
    },

    // After fight: challenger confirms result
    challengerConfirmed: {
      type: Boolean,
      default: false,
    },

    // After fight: defender confirms result
    defenderConfirmed: {
      type: Boolean,
      default: false,
    },

    // Who won — set when both confirm
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      default: null,
    },

    // If the two confirmations don't match — flag for review
    disputed: {
      type: Boolean,
      default: false,
    },

    // Challenge expires after 48 hours if not accepted
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup of all challenges involving a fighter
challengeSchema.index({ challengerId: 1, status: 1 });
challengeSchema.index({ defenderId: 1, status: 1 });

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;
