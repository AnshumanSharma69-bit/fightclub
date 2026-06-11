const express = require('express');
const router  = express.Router();
const {
  sendChallenge,
  acceptChallenge,
  declineChallenge,
  confirmResult,
  getMyChallenges,
} = require('../controllers/challenge.controller');
const { protect } = require('../middleware/auth.middleware');

// All challenge routes require login
router.get( '/mine',          protect, getMyChallenges);
router.post('/send',          protect, sendChallenge);
router.post('/:id/accept',    protect, acceptChallenge);
router.post('/:id/decline',   protect, declineChallenge);
router.post('/:id/confirm',   protect, confirmResult);

module.exports = router;
