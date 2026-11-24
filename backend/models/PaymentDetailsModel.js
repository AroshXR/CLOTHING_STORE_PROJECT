const mongoose = require('mongoose');
const snapshotSchema = require('./schemas/OrderItemSnapshot');
const text = (maxlength, required = true) => ({ type: String, trim: true, maxlength, required });
const schema = new mongoose.Schema({
  deliveryDetails: {
    firstName: text(50), lastName: text(50), email: { ...text(254), lowercase: true }, phone: text(25),
    address: text(200, false), city: text(50, false), state: text(50, false), zipCode: text(10, false), country: text(50, false)
  },
  shippingDetails: {
    method: { type: String, enum: ['standard', 'express', 'overnight', 'collection'], required: true },
    cost: { type: Number, min: 0, required: true }
  },
  paymentDetails: {
    // Historical values remain readable; new checkouts accept cash only.
    method: { type: String, enum: ['cash_on_delivery', 'cash_on_collection', 'card', 'paypal', 'apple', 'google'], required: true }
  },
  orderDetails: {
    subtotal: { type: Number, min: 0, required: true }, tax: { type: Number, min: 0, required: true },
    giftWrap: { type: Boolean, default: false }, giftWrapFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, required: true }, cartItems: [snapshotSchema]
  },
  giftMessage: text(500, false),
  status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'], default: 'pending' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  checkoutKey: String, requestFingerprint: { type: String, select: false }
}, { timestamps: true });
schema.index({ userId: 1, checkoutKey: 1 }, { unique: true, partialFilterExpression: { checkoutKey: { $type: 'string' } } });
schema.index({ status: 1, createdAt: -1 });
schema.virtual('deliveryDetails.fullName').get(function () { return `${this.deliveryDetails.firstName} ${this.deliveryDetails.lastName}`; });
schema.virtual('deliveryDetails.fullAddress').get(function () {
  const d = this.deliveryDetails;
  return `${d.address}, ${d.city}, ${d.state} ${d.zipCode}, ${d.country}`;
});
const redact = (_doc, value) => {
  if (value.paymentDetails) delete value.paymentDetails.cardDetails;
  delete value.requestFingerprint;
  return value;
};
schema.set('toJSON', { virtuals: true, transform: redact });
schema.set('toObject', { virtuals: true, transform: redact });
module.exports = mongoose.model('PaymentDetails', schema);
