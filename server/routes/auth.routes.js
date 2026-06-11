const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Public routes — no token needed
router.post('/register', register);
router.post('/login',    login);

// Protected route — must be logged in
// GET /api/auth/me → "who am I right now?"
router.get('/me', protect, getMe);

module.exports = router;
