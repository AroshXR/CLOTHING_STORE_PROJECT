const path = require('path');
const fs = require('fs');
const Upload = require('../models/Upload');
const Design = require('../models/ClothCustomizerModel');
const ClothingItem = require('../models/ClothingItemModel');
const Order = require('../models/OrderModel');
const Production = require('../models/CustomOrder');
const SiteSettings = require('../models/SiteSettings');
const { isAdmin } = require('../middleware/auth');
exports.serve = async (req, res) => {
  const filename = req.params.filename;
  if (!/^image-[\w.-]+\.(png|jpe?g|gif|webp)$/i.test(filename)) return res.sendStatus(404);
  const imageUrl = new RegExp('/uploads/' + filename.replace(/\./g, '\\.') + '$');
  // Only an image published in an active product is public. Publishing is
  // administrator-only. Unpublished artwork requires record ownership.
  // A logo becomes public only after an administrator explicitly publishes it.
  // Site settings restrict uploaded logos to the administrator's own uploads.
  const published = await SiteSettings.exists({ _id: 'site', logoUrl: '/uploads/' + filename }) ||
    await ClothingItem.exists({ status: 'active', $or: [{ imageUrl }, { gallery: imageUrl }, { imagePlaceholderUrl: imageUrl }] });
  if (!published) {
    if (!req.user) return res.status(401).json({ status: 'error', message: 'Sign in to view this image' });
    if (!isAdmin(req.user)) {
      const userId = req.user._id;
      let allowed = await Upload.exists({ filename, userId });
      if (!allowed) allowed = await Design.exists({ userId, $or: [{ 'selectedDesign.preview': imageUrl }, { 'placedDesigns.preview': imageUrl }] });
      if (!allowed) allowed = await Order.exists({ AdminID: userId, $or: [{ 'itemSnapshot.imageUrl': imageUrl }, { 'itemSnapshot.design.placedDesigns.preview': imageUrl }] });
      if (!allowed) {
        allowed = await Production.exists({ customerId: userId, $or: [{ 'design.designImageUrl': imageUrl }, { 'design.designMeta.placedDesigns.preview': imageUrl }] });
      }
      if (!allowed) return res.sendStatus(404);
    }
  }
  const file = path.join(__dirname, '..', 'uploads', filename);
  if (!fs.existsSync(file)) return res.sendStatus(404);
  res.set('Cache-Control', published ? 'public, max-age=300' : 'private, no-store');
  res.sendFile(file);
};
