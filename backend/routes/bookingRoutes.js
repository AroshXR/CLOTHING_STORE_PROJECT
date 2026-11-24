const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { protect, adminOnly, ownerOnly, isAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/bookingController');
const service = require('../services/bookingService');
const Booking = require('../models/Booking');
const upload = require('../middleware/multer');
const HttpError = require('../utils/HttpError');

router.post('/check-availability', (req, _res, next) => { service.dates(req.body.reservationDate, req.body.returnDate); next(); }, ctrl.checkAvailabilityOfOutfit);
router.use(protect);
router.post('/create', upload.single('document'), ctrl.createBooking);
router.get('/user', ctrl.getUserBooking);
router.get('/owner', ownerOnly, ctrl.getOwnerBooking);
router.get('/owner/report', ownerOnly, ctrl.generateBookingReport);
router.get('/owner/report/pdf', ownerOnly, ctrl.generateBookingReportPDF);
router.post('/change-status', ownerOnly, ctrl.changeBookingStatus);
router.get('/admin/report', adminOnly, ctrl.generateBookingReport);
router.get('/admin/report/pdf', adminOnly, ctrl.generateBookingReportPDF);
router.get('/upcoming-returns', ownerOnly, async (req, res) => {
  const end = new Date(); end.setDate(end.getDate() + 2);
  const query = { returnDate: { $gte: new Date(), $lte: end }, status: 'confirmed' };
  if (!isAdmin(req.user)) query.owner = req.user._id;
  const data = await Booking.find(query).populate('user', 'username email').populate('outfit');
  res.json({ status: 'ok', count: data.length, data });
});
router.post('/check-reminders', adminOnly, async (_req, res) => {
  await require('../services/reminderScheduler').checkReturnReminders();
  res.json({ status: 'ok', message: 'Reminder check completed' });
});
router.post('/send-return-reminder/:bookingId', ownerOnly, async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking || (!isAdmin(req.user) && String(booking.owner) !== String(req.user._id))) throw new HttpError(404, 'Booking not found');
  const result = await require('../services/reminderScheduler').sendManualReminder(req.params.bookingId);
  res.status(result.success ? 200 : 400).json({ status: result.success ? 'ok' : 'error', message: result.success ? 'Reminder sent' : result.error });
});
router.post('/:bookingId/record-payment', ownerOnly, async (req, res) => {
  const booking = await service.recordCollection(req.user, req.params.bookingId);
  res.json({ success: true, message: 'Cash payment recorded', booking });
});
router.get('/:bookingId/document', async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking || (!isAdmin(req.user) && ![booking.user, booking.owner].some(id => String(id) === String(req.user._id)))) throw new HttpError(404, 'Booking not found');
  const file = path.resolve(booking.document);
  const roots = [path.resolve(__dirname, '..', 'private-uploads'), path.resolve(os.tmpdir())];
  if (!roots.some(root => file.toLowerCase().startsWith(root.toLowerCase() + path.sep)) || !fs.existsSync(file)) throw new HttpError(404, 'Document not found');
  res.set('Cache-Control', 'private, no-store');
  res.download(file);
});
router.get('/:bookingId', ctrl.getBookingById);
router.put('/:bookingId', upload.single('document'), ctrl.updateBooking);
router.delete('/:bookingId', ctrl.deleteBooking);
module.exports = router;
