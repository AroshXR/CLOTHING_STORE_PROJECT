const mongoose = require('mongoose');
const { Schema } = mongoose;
const panels = ['front', 'back', 'leftSleeve', 'rightSleeve'];
const placement = { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } };
const artworkFields = {
  id: String, name: String, price: { type: Number, default: 0 }, preview: String,
  position: placement, size: { type: Number, default: 80 },
  isCustomUpload: { type: Boolean, default: false },
  layerId: String, side: { type: String, enum: panels, default: 'front' },
  mode: { type: String, enum: ['graphic', 'repeat', 'half-left', 'half-right'], default: 'graphic' },
  rotation: { type: Number, default: 0 }, repeat: { type: Number, default: 3 }
};
const artworkSchema = new Schema(artworkFields, { _id: false });
const textSchema = new Schema({
  layerId: String, side: { type: String, enum: ['front', 'back'] }, text: { type: String, maxlength: 40 },
  font: { type: String, enum: ['sans', 'serif', 'mono'], default: 'sans' }, color: String,
  size: { type: Number, default: 12 }, position: placement, rotation: { type: Number, default: 0 }
}, { _id: false });
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clothingType: { type: String, enum: ['tshirt'], required: true, default: 'tshirt' },
  nickname: { type: String, trim: true, maxlength: 50, default: 'My Custom T-Shirt' },
  color: { type: String, required: true },
  selectedDesign: { type: artworkSchema, default: null },
  placedDesigns: [artworkSchema],
  panelColors: { front: String, back: String, leftSleeve: String, rightSleeve: String },
  trimColor: String, lettering: [textSchema],
  size: { type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'], required: true },
  quantity: { type: Number, min: 1, required: true },
  totalPrice: { type: Number, required: true },
  inCart: { type: Boolean, default: true, index: true },
  designVersion: { type: Number, default: 1 }, revision: { type: Number, default: 1 }
}, { timestamps: true });
module.exports = mongoose.model('ClothCustomizer', schema);
