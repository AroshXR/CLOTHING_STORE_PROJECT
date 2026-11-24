const mongoose = require('mongoose');
const Order = require('../models/OrderModel');
const Payment = require('../models/PaymentDetailsModel');
const HttpError = require('../utils/HttpError');
const { isAdmin } = require('../middleware/auth');
exports.createOrder = async () => { throw new HttpError(409, 'Create orders through checkout'); };
exports.getAllOrders = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1), limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const query = {};
  if (req.query.AdminID) {
    if (!mongoose.isValidObjectId(req.query.AdminID)) throw new HttpError(400, 'Invalid customer ID');
    query.AdminID = req.query.AdminID;
  }
  const [orders, total] = await Promise.all([Order.find(query).sort({ CreatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(query)]);
  res.json({ status: 'ok', data: orders, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, itemsPerPage: limit } });
};
exports.getMyOrders = async (req, res) => {
  const paymentIds = (await Payment.find({ userId: req.user._id }).select('_id')).map(p => String(p._id));
  const data = await Order.find({ $or: [{ AdminID: req.user._id }, { PaymentID: { $in: paymentIds } }] }).sort({ CreatedAt: -1 })
    .populate('DesignID', 'clothingType color size selectedDesign totalPrice');
  res.json({ status: 'ok', data });
};
exports.getOrderById = async (req, res) => {
  const query = mongoose.isValidObjectId(req.params.id) ? { $or: [{ _id: req.params.id }, { OrderID: req.params.id }] } : { OrderID: req.params.id };
  if (!isAdmin(req.user)) query.AdminID = req.user._id;
  const order = await Order.findOne(query).populate('DesignID', 'clothingType color size selectedDesign totalPrice');
  if (!order) throw new HttpError(404, 'Order not found');
  res.json({ status: 'ok', data: order });
};
exports.deleteOrder = async () => { throw new HttpError(409, 'Cancel the payment arrangement instead; order history is retained'); };
exports.getOrderStatistics = async (_req, res) => {
  const rows = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$Price' } } }]);
  res.json({ status: 'ok', data: { totalOrders: rows.reduce((n, row) => n + row.count, 0), statusBreakdown: rows } });
};
exports.updateFulfillment = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !['in_progress', 'completed', 'delivered'].includes(req.body.status)) throw new HttpError(400, 'Invalid order status');
  const order = await Order.findById(req.params.id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.itemType === 'custom') throw new HttpError(409, 'Update custom clothing from the production order');
  const next = { pending: ['in_progress'], in_progress: ['completed'], completed: ['delivered'] };
  if (!(next[order.fulfillmentStatus] || []).includes(req.body.status)) throw new HttpError(409, 'Invalid order status transition');
  const updated = await Order.findOneAndUpdate({
    _id: order._id, fulfillmentStatus: order.fulfillmentStatus, paymentStatus: { $ne: 'cancelled' }
  }, { $set: { fulfillmentStatus: req.body.status, status: req.body.status === 'delivered' ? 'completed' : 'processing' } }, { new: true, runValidators: true });
  if (!updated) throw new HttpError(409, 'Order changed; please refresh');
  res.json({ status: 'ok', data: updated });
};
