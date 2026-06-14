const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    // For Google OAuth users this holds a sentinel value like "google_oauth_<id>"
    // For local users it holds the bcrypt hash
    passwordHash: {
      type: String,
      required: true,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    // Google OAuth
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },

    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Only hash if it's a real password — not the Google sentinel value
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  if (this.passwordHash?.startsWith('google_oauth_')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = async function (plainTextPassword) {
  // Google-only accounts can't log in with password
  if (this.passwordHash?.startsWith('google_oauth_')) return false;
  return bcrypt.compare(plainTextPassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id:          this._id,
    username:     this.username,
    email:        this.email,
    avatarUrl:    this.avatarUrl,
    authProvider: this.authProvider,
    createdAt:    this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = User;
