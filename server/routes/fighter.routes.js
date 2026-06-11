const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  getProfileById,
  updateMyProfile,
  getNearbyFighters,
} = require('../controllers/fighter.controller');
const { protect } = require('../middleware/auth.middleware');

// Protected
router.get('/me',       protect, getMyProfile);
router.patch('/me',     protect, updateMyProfile);

// Nearby fighters — used by the map
// Public so even logged-out users can see the map
// Query params: ?lon=<lng>&lat=<lat>&radius=<meters>
router.get('/nearby',   getNearbyFighters);

// Public profile by id — used when clicking a pin
router.get('/:id',      getProfileById);

module.exports = router;
