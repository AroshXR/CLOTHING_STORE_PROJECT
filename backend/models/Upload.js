const { Schema, model } = require('mongoose');
module.exports = model('Upload', new Schema({
  filename: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalName: String, mimeType: String, size: Number
}, { timestamps: true }));
