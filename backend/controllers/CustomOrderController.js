const mongoose = require('mongoose');
const CustomOrder = require('../models/CustomOrder');
const Tailor = require('../models/Tailor');
const Order = require('../models/OrderModel');
const History = require('../models/OrderStatus');
const HttpError = require('../utils/HttpError');
const { isAdmin } = require('../middleware/auth');
const { runTransaction } = require('../services/checkoutService');
const states = ['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'delivered', 'cancelled'];
const nextStates = { assigned: ['accepted'], accepted: ['in_progress'], in_progress: ['completed'], completed: ['delivered'] };
const checkId = id => { if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid order ID'); };
const populate = query => query.populate('customerId', 'username email').populate('assignedTailor', 'name userId isActive');

async function authorizedOrder(user, id) {
  checkId(id);
  const order = await populate(CustomOrder.findById(id));
  if (!order) throw new HttpError(404, 'Order not found');
  if (isAdmin(user) || String(order.customerId?._id || order.customerId) === String(user._id) ||
      String(order.assignedTailor?.userId) === String(user._id)) return order;
  throw new HttpError(404, 'Order not found');
}
exports.authorizedOrder = authorizedOrder;
exports.createOrder = async () => { throw new HttpError(409, 'Place custom clothing orders through checkout'); };
exports.listAll = async (req, res) => {
  const query = {};
  if (req.query.status) {
    if (!states.includes(req.query.status)) throw new HttpError(400, 'Invalid order status');
    query.status = req.query.status;
  }
  if (req.query.tailorId) { checkId(req.query.tailorId); query.assignedTailor = req.query.tailorId; }
  if (req.query.id) { checkId(req.query.id); query._id = req.query.id; }
  if (req.query.unassigned === 'true') query.assignedTailor = null;
  const docs = await populate(CustomOrder.find(query).sort({ createdAt: -1 }));
  res.json({ status: 'ok', count: docs.length, data: docs });
};
exports.listMine = async (req, res) => {
  const docs = await populate(CustomOrder.find({ customerId: req.user._id }).sort({ createdAt: -1 }));
  res.json({ status: 'ok', count: docs.length, data: docs });
};
exports.listAssignedToMe = async (req, res) => {
  const tailor = await Tailor.findOne({ userId: req.user._id, isActive: true });
  if (!tailor) return res.json({ status: 'ok', count: 0, data: [] });
  const docs = await populate(CustomOrder.find({ assignedTailor: tailor._id }).sort({ createdAt: -1 }));
  res.json({ status: 'ok', count: docs.length, data: docs });
};
exports.getOne = async (req, res) => res.json({ status: 'ok', data: await authorizedOrder(req.user, req.params.id) });
exports.assignTailor = async (req, res) => {
  checkId(req.params.id); checkId(req.body.tailorId);
  const data = await runTransaction(async session => {
    const order = await CustomOrder.findById(req.params.id).session(session);
    if (!order) throw new HttpError(404, 'Order not found');
    if (!['pending', 'assigned'].includes(order.status)) throw new HttpError(409, 'Only orders awaiting production can be reassigned');
    const tailor = await Tailor.findOne({ _id: req.body.tailorId, isActive: true }).session(session);
    if (!tailor) throw new HttpError(400, 'Select an active tailor');
    order.assignedTailor = tailor._id; order.assignedAt = new Date(); order.status = 'assigned';
    await order.save({ session });
    if (order.salesOrderId) await Order.updateOne({ _id: order.salesOrderId }, { $set: { fulfillmentStatus: 'assigned', status: 'processing' } }, { session });
    await History.create([{ customOrderId: order._id, clothCustomizerId: order.sourceDesignId,
      status: 'assigned', tailorId: tailor._id, createdBy: req.user._id }], { session });
    return order;
  });
  res.json({ status: 'ok', message: 'Tailor assigned', data });
};
exports.updateStatus = async (req, res) => {
  checkId(req.params.id);
  const status = req.body.status;
  if (!states.includes(status)) throw new HttpError(400, 'Invalid production status');
  if (status === 'cancelled') throw new HttpError(409, 'Cancel the payment arrangement to cancel its orders and release stock');
  const data = await runTransaction(async session => {
    const order = await CustomOrder.findById(req.params.id).session(session);
    if (!order) throw new HttpError(404, 'Order not found');
    if (!isAdmin(req.user)) {
      const tailor = await Tailor.findOne({ userId: req.user._id, isActive: true }).session(session);
      if (!tailor || String(order.assignedTailor) !== String(tailor._id)) throw new HttpError(403, 'You are not assigned to this order');
    }
    if (order.status === status) return order;
    if (!(nextStates[order.status] || []).includes(status)) throw new HttpError(409, 'Invalid production status transition');
    order.status = status;
    await order.save({ session });
    if (order.salesOrderId) await Order.updateOne({ _id: order.salesOrderId }, {
      $set: { fulfillmentStatus: status, status: status === 'delivered' ? 'completed' : 'processing' }
    }, { session });
    await History.create([{ customOrderId: order._id, clothCustomizerId: order.sourceDesignId,
      status, tailorId: order.assignedTailor, createdBy: req.user._id }], { session });
    return order;
  });
  res.json({ status: 'ok', data });
};
