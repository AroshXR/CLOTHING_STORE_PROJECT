const mongoose = require('mongoose');
const PaymentDetails = require('../models/PaymentDetailsModel');
const checkout = require('../services/checkoutService');
const HttpError = require('../utils/HttpError');
const { isAdmin } = require('../middleware/auth');
const pageNumber = (value, fallback, max) => Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));
const safeProjection = '-paymentDetails.cardDetails -requestFingerprint';

exports.quote = async (req, res) => res.json({ status: 'ok', data: await checkout.quote(req.user._id, req.body) });
exports.createPaymentDetails = async (req, res) => {
  const data = await checkout.checkout(req.user._id, req.body, req.get('Idempotency-Key'));
  res.status(data.replayed ? 200 : 201).json({ status: 'ok', message: 'Order placed. Cash payment is due on delivery or collection.', data });
};
exports.getAllPaymentDetails = async (req, res) => {
  const page = pageNumber(req.query.page, 1, 100000), limit = pageNumber(req.query.limit, 10, 100);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const search = req.query.search.trim().slice(0, 200).replace(/[.*+?^{}()|[\]\\$]/g, '\\$&');
    query.$or = ['email', 'firstName', 'lastName'].map(field => ({ ['deliveryDetails.' + field]: { $regex: search, $options: 'i' } }));
  }
  if (req.query.userId) {
    if (!mongoose.isValidObjectId(req.query.userId)) throw new HttpError(400, 'Invalid user ID');
    query.userId = req.query.userId;
  }
  const [data, total] = await Promise.all([
    PaymentDetails.find(query).select(safeProjection).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'username email').lean(),
    PaymentDetails.countDocuments(query)
  ]);
  res.json({ status: 'ok', data, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, itemsPerPage: limit } });
};
exports.getPaymentDetailsById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid payment ID');
  const query = { _id: req.params.id };
  if (!isAdmin(req.user)) query.userId = req.user._id;
  const data = await PaymentDetails.findOne(query).select(safeProjection).lean();
  if (!data) throw new HttpError(404, 'Payment not found');
  res.json({ status: 'ok', data });
};
exports.updatePaymentStatus = async (req, res) => {
  const data = await checkout.updatePaymentStatus(req.params.id, req.body.status, req.user._id);
  res.json({ status: 'ok', message: 'Cash payment status updated', data });
};
exports.deletePaymentDetails = async (req, res) => {
  await checkout.updatePaymentStatus(req.params.id, 'cancelled', req.user._id);
  res.json({ status: 'ok', message: 'Payment arrangement cancelled; order history has been retained' });
};
exports.getPaymentStatistics = async (_req, res) => {
  const rows = await PaymentDetails.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$orderDetails.total' } } }]);
  const totalPayments = rows.reduce((sum, row) => sum + row.count, 0);
  const totalRevenue = rows.filter(row => row._id === 'completed').reduce((sum, row) => sum + row.total, 0);
  const completedCount = rows.filter(row => row._id === 'completed').reduce((sum, row) => sum + row.count, 0);
  res.json({ status: 'ok', data: { totalPayments, totalRevenue, averageOrderValue: completedCount ? totalRevenue / completedCount : 0, statusDistribution: Object.fromEntries(rows.map(row => [row._id, row.count])), statusBreakdown: rows } });
};
