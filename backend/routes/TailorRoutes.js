const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { registerTailor, getMyTailorProfile, listTailors, syncTailorsFromUsers, adminOverview } = require('../controllers/TailorController');

// Tailor self registration / update
router.post('/register', protect, (req, res, next) => req.user.type === 'Tailor' ? next() : res.sendStatus(403), registerTailor);

// Tailor profile
router.get('/me', protect, getMyTailorProfile);

// Admin: list tailors
router.get('/', protect, adminOnly, listTailors);

// Admin: combined overview (tailors + custom orders)
router.get('/overview', protect, adminOnly, adminOverview);

// Admin: sync Tailors from Users(type='Tailor')
router.post('/sync', protect, adminOnly, syncTailorsFromUsers);

module.exports = router;
