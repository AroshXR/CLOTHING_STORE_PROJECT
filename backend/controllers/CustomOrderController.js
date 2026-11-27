const mongoose = require('mongoose');
const CustomOrder = require('../models/CustomOrder');
const Order = require('../models/OrderModel');
const History = require('../models/OrderStatus');
const HttpError = require('../utils/HttpError');
const { isAdmin } = require('../middleware/auth');
const { runTransaction } = require('../services/checkoutService');
const { statuses: states, pendingStatuses, normalizeStatus, nextStates } = require('../config/production');
const checkId = id => { if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid order ID'); };
const populate = query => query.populate('customerId', 'username email');

async function authorizedOrder(user, id) {
  checkId(id);
  const order = await populate(CustomOrder.findById(id));
  if (!order) throw new HttpError(404, 'Order not found');
  if (isAdmin(user) || String(order.customerId?._id || order.customerId) === String(user._id)) return order;
  throw new HttpError(404, 'Order not found');
}
exports.authorizedOrder = authorizedOrder;
exports.createOrder = async () => { throw new HttpError(409, 'Place custom clothing orders through checkout'); };
exports.listAll = async (req, res) => {
  const query = {};
  if (req.query.status) {
    if (!states.includes(req.query.status)) throw new HttpError(400, 'Invalid order status');
    query.status = req.query.status === 'pending' ? { $in: pendingStatuses } : req.query.status;
  }
  if (req.query.id) { checkId(req.query.id); query._id = req.query.id; }
  const docs = await populate(CustomOrder.find(query).sort({ createdAt: -1 }));
  res.json({ status: 'ok', count: docs.length, data: docs });
};
exports.listMine = async (req, res) => {
  const docs = await populate(CustomOrder.find({ customerId: req.user._id }).sort({ createdAt: -1 }));
  res.json({ status: 'ok', count: docs.length, data: docs });
};
exports.getOne = async (req, res) => res.json({ status: 'ok', data: await authorizedOrder(req.user, req.params.id) });
exports.updateStatus = async (req, res) => {
  checkId(req.params.id);
  const status = req.body.status;
  if (!states.includes(status)) throw new HttpError(400, 'Invalid production status');
  if (status === 'cancelled') throw new HttpError(409, 'Cancel the payment arrangement to cancel its orders and release stock');
  const data = await runTransaction(async session => {
    const order = await CustomOrder.findById(req.params.id).session(session);
    if (!order) throw new HttpError(404, 'Order not found');
    const currentStatus = normalizeStatus(order.status);
    if (currentStatus === status) return order;
    if (!(nextStates[currentStatus] || []).includes(status)) throw new HttpError(409, 'Invalid production status transition');
    order.status = status;
    await order.save({ session });
    if (order.salesOrderId) await Order.updateOne({ _id: order.salesOrderId }, {
      $set: { fulfillmentStatus: status, status: status === 'delivered' ? 'completed' : 'processing' }
    }, { session });
    await History.create([{ customOrderId: order._id, clothCustomizerId: order.sourceDesignId,
      status, createdBy: req.user._id }], { session });
    return order;
  });
  res.json({ status: 'ok', data });
};
