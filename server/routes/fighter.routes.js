const express = require('express');
const router  = express.Router();
const {
  getMyProfile,
  getProfileById,
  updateMyProfile,
  getNearbyFighters,
  getFightHistory,
} = require('../controllers/fighter.controller');
const { protect } = require('../middleware/auth.middleware');

// Protected
router.get('/me',          protect, getMyProfile);
router.patch('/me',        protect, updateMyProfile);

// Public — no auth needed
router.get('/nearby',      getNearbyFighters);
router.get('/:id/history', getFightHistory);
router.get('/:id',         getProfileById);

module.exports = router;
