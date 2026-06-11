const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── protect ──────────────────────────────────────────────────────────────────
// Add this middleware to any route that requires a logged-in user.
// Usage in a route file:
//   router.get('/profile', protect, fighterController.getProfile);
//
// It expects the request to carry:
//   Authorization: Bearer <token>
//
// On success it attaches the full user object to req.user so the next
// controller can use it without a second DB lookup.

const protect = async (req, res, next) => {
  try {
    // 1. Pull the token out of the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer abc123" → "abc123"

    // 2. Verify the token is valid and not expired
    // jwt.verify throws if anything is wrong — caught below
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId: '...', iat: ..., exp: ... }

    // 3. Fetch the user from DB to confirm they still exist
    // .select('-passwordHash') strips the hash so it never accidentally
    // ends up in a response body downstream
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // 4. Attach user to the request — controllers access it via req.user
    req.user = user;
    next();
  } catch (err) {
    // Pass JWT errors to the global error handler in index.js
    // which formats them as 401 responses
    next(err);
  }
};

module.exports = { protect };
