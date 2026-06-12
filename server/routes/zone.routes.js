const express = require('express');
const router  = express.Router();
const { getAllZones, getLeaderboard, getMyZones, seedZones } = require('../controllers/zone.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/all',         getAllZones);
router.get('/leaderboard', getLeaderboard);
router.get('/mine',        protect, getMyZones);
router.post('/seed',       seedZones); // dev only

module.exports = router;
