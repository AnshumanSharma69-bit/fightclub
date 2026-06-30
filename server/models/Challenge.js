const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    challengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      required: true,
    },
    defenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed', 'expired'],
      default: 'pending',
    },
    meetupCode: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      maxlength: 200,
      default: '',
    },

    // ── Scheduling ──────────────────────────────────────────────────────────
    // Proposed by the challenger when sending the challenge.
    // Must be a future date — validated in the controller.
    scheduledFor: {
      type: Date,
      default: null,
    },

    // Free-text meeting place, e.g. "Shivaji Park, near the basketball court"
    meetingPlace: {
      type: String,
      maxlength: 150,
      default: '',
    },

    challengerProofUrl: { type: String, default: null },
    defenderProofUrl:   { type: String, default: null },
    challengerConfirmed: { type: Boolean, default: false },
    defenderConfirmed:   { type: Boolean, default: false },
    challengerReportedWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Fighter', default: null },
    defenderReportedWinner:   { type: mongoose.Schema.Types.ObjectId, ref: 'Fighter', default: null },

    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fighter',
      default: null,
    },
    disputed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

challengeSchema.index({ challengerId: 1, status: 1 });
challengeSchema.index({ defenderId: 1,   status: 1 });

const Challenge = mongoose.model('Challenge', challengeSchema);
module.exports = Challenge;
