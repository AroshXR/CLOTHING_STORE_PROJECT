const mongoose = require('mongoose');
const { statuses, normalizeStatus } = require('../config/production');

const MeasurementSchema = new mongoose.Schema(
  {
    chest: Number,
    waist: Number,
    hip: Number,
    sleeve: Number,
    length: Number,
  },
  { _id: false }
);

const ConfigSchema = new mongoose.Schema(
  {
    clothingType: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    notes: { type: String },
  },
  { _id: false }
);

const DesignSchema = new mongoose.Schema(
  {
    designImageUrl: { type: String },
    designMeta: { type: Object },
  },
  { _id: false }
);

const CustomOrderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceDesignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothCustomizer', index: true },
    salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', unique: true, sparse: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentDetails' },
    config: { type: ConfigSchema, required: true },
    design: { type: DesignSchema },
    measurements: { type: MeasurementSchema },
    status: {
      type: String,
      enum: statuses,
      default: 'pending',
      index: true,
    },
    previewGallery: [{ type: String }],
    price: { type: Number },
  },
  { timestamps: true }
);

CustomOrderSchema.set('toJSON', { transform(_doc, value) {
  value.status = normalizeStatus(value.status);
  for (const field of ['assignedTailor', 'assignedAt', 'payoutAmount', 'paidOutAt']) delete value[field];
  return value;
} });

module.exports = mongoose.model('CustomOrder', CustomOrderSchema);
