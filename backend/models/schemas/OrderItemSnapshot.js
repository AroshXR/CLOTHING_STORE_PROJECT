const { Schema } = require('mongoose');

// An order owns a copy of its item. Later catalog/design edits cannot change it.
module.exports = new Schema({
  kind: { type: String, enum: ['custom', 'product', 'booking'], required: true },
  sourceId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  size: String,
  color: String,
  imageUrl: String,
  variantId: Schema.Types.ObjectId,
  designVersion: Number,
  design: Schema.Types.Mixed,
  rentalPeriod: { reservationDate: Date, returnDate: Date },
}, { _id: false });
