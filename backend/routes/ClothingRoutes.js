const express = require('express');
const router = express.Router();
const controller = require('../controllers/ClothingController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, controller.getAll);
router.post('/report', protect, adminOnly, controller.report);
router.post('/sales-timeseries', protect, adminOnly, controller.salesTimeSeries);
router.post('/', protect, adminOnly, controller.create);
router.get('/:id', optionalAuth, controller.getById);
router.put('/:id', protect, adminOnly, controller.update);
router.delete('/:id', protect, adminOnly, controller.remove);
router.post('/:id/reviews', optionalAuth, controller.addReview);

module.exports = router;


