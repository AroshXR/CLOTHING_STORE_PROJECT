const Upload = require('../models/Upload');
const Design = require('../models/ClothCustomizerModel');
const HttpError = require('../utils/HttpError');
module.exports = async function authorizeArtwork(userId, design) {
  if (!design?.isCustomUpload) return;
  let filename;
  try { filename = new URL(design.preview, 'http://local.invalid').pathname.split('/').pop(); }
  catch (_) { throw new HttpError(400, 'Invalid artwork'); }
  if (!/^image-[\w.-]+\.(png|jpe?g|gif|webp)$/i.test(filename || '')) throw new HttpError(400, 'Invalid artwork');
  if (await Upload.exists({ filename, userId })) return;
  const preview = new RegExp('/uploads/' + filename.replace(/\./g, '\\.') + '$');
  if (await Design.exists({ userId, 'selectedDesign.preview': preview })) return;
  throw new HttpError(403, 'You can only use artwork uploaded to your account');
};
