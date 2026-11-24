const mongoose = require('mongoose');
const defaults = require('../config/siteDefaults');
const schema = new mongoose.Schema({
  _id: { type: String, default: 'site', enum: ['site'] },
  name: { type: String, required: true, maxlength: 80, default: defaults.name },
  tagline: { type: String, maxlength: 160, default: defaults.tagline },
  logoUrl: { type: String, maxlength: 2048, default: '' },
  primaryColor: { type: String, default: defaults.primaryColor },
  accentColor: { type: String, default: defaults.accentColor },
  contactEmail: { type: String, maxlength: 254, default: '' },
  contactPhone: { type: String, maxlength: 40, default: '' },
  address: { type: String, maxlength: 500, default: '' },
  websiteUrl: { type: String, maxlength: 2048, default: '' },
  socialLinks: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  heroTitle: { type: String, maxlength: 120, default: defaults.heroTitle },
  heroDescription: { type: String, maxlength: 600, default: defaults.heroDescription },
  aboutText: { type: String, maxlength: 8000, default: defaults.aboutText },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('SiteSettings', schema);
