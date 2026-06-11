const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Fighter = require('../models/Fighter');

// ─── Helper: sign a JWT ───────────────────────────────────────────────────────
// Centralised so both register and login use identical token config.
const signToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Creates a User + a blank Fighter profile in one shot.
// Body: { username, email, password, heightCm, weightKg, reachCm? }
const register = async (req, res, next) => {
  try {
    const { username, email, password, heightCm, weightKg, reachCm } = req.body;

    // ── Basic input checks ────────────────────────────────────────────────────
    // Mongoose validators catch most things, but checking password length here
    // because we never store the plain-text password — only the hash.
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!heightCm || !weightKg) {
      return res.status(400).json({ error: 'heightCm and weightKg are required to create your fighter profile' });
    }

    // ── Check for duplicates before creating anything ─────────────────────────
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already taken` });
    }

    // ── Create User ───────────────────────────────────────────────────────────
    // We store the plain password in passwordHash temporarily.
    // The pre-save hook in User.js hashes it before it ever hits the DB.
    const user = await User.create({
      username,
      email,
      passwordHash: password, // ← hook hashes this
    });

    // ── Create Fighter profile linked to the new user ─────────────────────────
    const fighter = await Fighter.create({
      userId: user._id,
      heightCm,
      weightKg,
      reachCm: reachCm || null,
      // weightClass is auto-derived by the pre-save hook in Fighter.js
    });

    // ── Sign token and respond ────────────────────────────────────────────────
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: user.toPublicJSON(),
      fighter: fighter.toPublicJSON(),
    });
  } catch (err) {
    next(err); // passes to global error handler in index.js
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, password }
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // ── Find user (include passwordHash for comparison) ───────────────────────
    // By default toPublicJSON strips it, but here we need it explicitly.
    const user = await User.findOne({ email: email.toLowerCase() });

    // Deliberately vague error — don't tell attackers whether the email exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // ── Fetch linked fighter profile ──────────────────────────────────────────
    const fighter = await Fighter.findOne({ userId: user._id });

    const token = signToken(user._id);

    res.json({
      token,
      user: user.toPublicJSON(),
      fighter: fighter ? fighter.toPublicJSON() : null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the currently logged-in user + their fighter profile.
// Requires the protect middleware — req.user is already populated.
const getMe = async (req, res, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: req.user._id });

    res.json({
      user: req.user.toPublicJSON(),
      fighter: fighter ? fighter.toPublicJSON() : null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
