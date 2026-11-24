const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Outfit = require('../models/Outfit');
const Order = require('../models/OrderModel');
const Payment = require('../models/PaymentDetailsModel');
const HttpError = require('../utils/HttpError');
const { isAdmin } = require('../middleware/auth');
const { runTransaction } = require('./checkoutService');
const { money } = require('./pricingService');
function dates(start, end) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end) || end <= start) throw new HttpError(400, 'Return date must be after the reservation date');
  return { reservationDate: new Date(start), returnDate: new Date(end), days: (Date.parse(end) - Date.parse(start)) / 86400000 };
}
function contact(body) {
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
      typeof body.phone !== 'string' || !/^\+?[\d\s()-]{10,25}$/.test(body.phone)) throw new HttpError(400, 'Valid email and phone details are required');
  return { email: body.email.trim().toLowerCase(), phone: body.phone.trim() };
}
async function reserveOutfit(id, period, session, exclude) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid outfit ID');
  // Concurrent transactions contend on this document before checking overlap.
  const outfit = await Outfit.findOneAndUpdate({ _id: id, isAvailable: true, archivedAt: null },
    { $inc: { bookingVersion: 1 } }, { new: true, session });
  if (!outfit) throw new HttpError(409, 'Outfit is not available');
  const filter = { outfit: id, status: { $in: ['pending', 'confirmed'] },
    reservationDate: { $lte: period.returnDate }, returnDate: { $gte: period.reservationDate } };
  if (exclude) filter._id = { $ne: exclude };
  if (await Booking.exists(filter).session(session)) throw new HttpError(409, 'Outfit is not available for these dates');
  return outfit;
}
exports.dates = dates;
exports.create = async (user, body, document) => {
  if (!document) throw new HttpError(400, 'A booking document is required');
  const period = dates(body.reservationDate, body.returnDate), details = contact(body);
  return runTransaction(async session => {
    const outfit = await reserveOutfit(body.outfit, period, session);
    const [booking] = await Booking.create([{
      outfit: outfit._id, owner: outfit.owner, user: user._id,
      reservationDate: period.reservationDate, returnDate: period.returnDate,
      price: money(outfit.pricePerDay * period.days), ...details, document: document.path
    }], { session });
    return booking;
  });
};
exports.update = async (user, id, body, document) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid booking ID');
  const period = dates(body.reservationDate, body.returnDate), details = contact(body);
  return runTransaction(async session => {
    const booking = await Booking.findOne({ _id: id, user: user._id, status: 'pending', paymentStatus: { $nin: ['pending', 'paid'] } }).session(session);
    if (!booking) throw new HttpError(409, 'Only your pending unpaid booking can be edited');
    const outfit = await reserveOutfit(booking.outfit, period, session, booking._id);
    booking.reservationDate = period.reservationDate; booking.returnDate = period.returnDate;
    booking.email = details.email; booking.phone = details.phone; booking.price = money(outfit.pricePerDay * period.days);
    if (document) booking.document = document.path;
    await booking.save({ session });
    return booking;
  });
};
exports.changeStatus = async (user, id, status) => {
  if (!mongoose.isValidObjectId(id) || !['confirmed', 'cancelled'].includes(status)) throw new HttpError(400, 'Invalid booking status');
  const booking = await Booking.findById(id);
  if (!booking || (!isAdmin(user) && String(booking.owner) !== String(user._id))) throw new HttpError(404, 'Booking not found');
  if (booking.status === status) return booking;
  if (booking.status === 'cancelled' || (status === 'confirmed' && booking.status !== 'pending')) throw new HttpError(409, 'Invalid booking status transition');
  if (status === 'cancelled' && ['pending', 'paid'].includes(booking.paymentStatus)) throw new HttpError(409, 'Cancel the payment arrangement before cancelling this booking');
  const filter = { _id: id, status: booking.status };
  if (status === 'cancelled') filter.paymentStatus = { $nin: ['pending', 'paid'] };
  const updated = await Booking.findOneAndUpdate(filter, { $set: { status } }, { new: true, runValidators: true });
  if (!updated) throw new HttpError(409, 'Booking changed; please refresh');
  return updated;
};
exports.remove = async (user, id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid booking ID');
  const booking = await Booking.findOneAndDelete({ _id: id, user: user._id, status: 'pending', paymentStatus: { $nin: ['pending', 'paid'] } });
  if (!booking) throw new HttpError(409, 'Only your pending unpaid bookings can be deleted');
};
exports.recordCollection = async (user, id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid booking ID');
  return runTransaction(async session => {
    const booking = await Booking.findById(id).session(session);
    if (!booking || (!isAdmin(user) && String(booking.owner) !== String(user._id))) throw new HttpError(404, 'Booking not found');
    if (booking.paymentStatus === 'paid') return booking;
    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'pending' || !booking.paymentId) throw new HttpError(409, 'A cash collection arrangement is required first');
    booking.paymentStatus = 'paid'; await booking.save({ session });
    await Order.updateMany({ BookingID: booking._id, PaymentID: String(booking.paymentId) },
      { $set: { paymentStatus: 'completed', fulfillmentStatus: 'in_progress', status: 'processing' } }, { session });
    const remaining = await Order.exists({ PaymentID: String(booking.paymentId), paymentStatus: { $ne: 'completed' } }).session(session);
    await Payment.updateOne({ _id: booking.paymentId }, { $set: { status: remaining ? 'processing' : 'completed' } }, { session });
    return booking;
  });
};
