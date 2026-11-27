const mongoose = require('mongoose');
const { statuses } = require('../config/production');

const OrderStatusSchema = new mongoose.Schema({
  clothCustomizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothCustomizer', index: true },
  customOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomOrder', required: true, index: true },
  status: { type: String, required: true, enum: statuses },
  note: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('OrderStatus', OrderStatusSchema);
