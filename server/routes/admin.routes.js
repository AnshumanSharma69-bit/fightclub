const express = require('express');
const router  = express.Router();
const {
  getStats,
  getAllFighters,
  getAllFights,
  getDisputes,
  resolveDispute,
  toggleBanFighter,
} = require('../controllers/admin.controller');
const { protect }      = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

// Every route here requires login AND isAdmin: true
router.use(protect, requireAdmin);

router.get('/stats',                       getStats);
router.get('/fighters',                    getAllFighters);
router.get('/fights',                      getAllFights);
router.get('/disputes',                    getDisputes);
router.post('/disputes/:id/resolve',       resolveDispute);
router.patch('/fighters/:id/ban',          toggleBanFighter);

module.exports = router;
