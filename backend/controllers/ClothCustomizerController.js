const mongoose = require('mongoose');
const Design = require('../models/ClothCustomizerModel');
const pricing = require('../services/pricingService');
const HttpError = require('../utils/HttpError');
const authorizeArtwork = require('../services/artworkService');
const owned = (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid design ID');
  return { _id: req.params.id, userId: req.user._id };
};
exports.getAllClothCustomizers = async (req, res) => {
  const query = { userId: req.user._id };
  if (req.query.scope === 'saved') query.inCart = false;
  else if (req.query.scope !== 'all') query.inCart = { $ne: false };
  res.json({ status: 'ok', data: await Design.find(query).sort({ createdAt: -1 }) });
};
exports.addClothCustomizer = async (req, res) => {
  const { design } = pricing.priceCustomization(req.body, await pricing.getPrices());
  await Promise.all(design.placedDesigns.map(layer => authorizeArtwork(req.user._id, layer)));
  const saved = await Design.create({ ...design, userId: req.user._id, inCart: true });
  res.status(201).json({ status: 'ok', message: 'Design saved to cart', data: saved });
};
exports.getClothCustomizerById = async (req, res) => {
  const design = await Design.findOne(owned(req));
  if (!design) throw new HttpError(404, 'Design not found');
  res.json({ status: 'ok', data: design });
};
exports.updateClothCustomizer = async (req, res) => {
  const filter = owned(req), existing = await Design.findOne(filter);
  if (!existing) throw new HttpError(404, 'Design not found');
  const input = existing.toObject();
  for (const field of ['clothingType', 'nickname', 'color', 'selectedDesign', 'size', 'quantity', 'designVersion', 'placedDesigns', 'panelColors', 'trimColor', 'lettering']) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) input[field] = req.body[field];
  }
  const { design } = pricing.priceCustomization(input, await pricing.getPrices());
  await Promise.all(design.placedDesigns.map(layer => authorizeArtwork(req.user._id, layer)));
  const updates = { ...design };
  if (req.body.inCart === true) updates.inCart = true;
  const saved = await Design.findOneAndUpdate(filter, { $set: updates, $inc: { revision: 1 } }, { new: true, runValidators: true });
  res.json({ status: 'ok', message: 'Design updated', data: saved });
};
exports.deleteClothCustomizer = async (req, res) => {
  // A purchased order owns an immutable snapshot, independent of this saved design.
  const deleted = await Design.findOneAndDelete(owned(req));
  if (!deleted) throw new HttpError(404, 'Design not found');
  res.json({ status: 'ok', message: 'Design removed' });
};
