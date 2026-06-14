const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const jwt      = require('jsonwebtoken');
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Local auth ────────────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login',    login);
router.get('/me',        protect, getMe);

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Step 1: redirect to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects back here with a code
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google' }),
  async (req, res) => {
    try {
      const token = signToken(req.user._id);
      const clientURL = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

      // Redirect to frontend with token in query param
      // Frontend reads it, stores in localStorage, then redirects to /map
      res.redirect(`${clientURL}/auth/callback?token=${token}`);
    } catch (err) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=server`);
    }
  }
);

module.exports = router;
