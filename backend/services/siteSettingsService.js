const mongoose = require('mongoose');
const SiteSettings = require('../models/SiteSettings');
const Upload = require('../models/Upload');
const defaults = require('../config/siteDefaults');
const HttpError = require('../utils/HttpError');
const fields = Object.keys(defaults);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function text(value, field, limit, required = false, multiline = false) {
  if (typeof value !== 'string' || value.length > limit || (!multiline && /[\r\n]/.test(value)) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(400, 'Invalid ' + field);
  if (required && !value.trim()) throw new HttpError(400, field + ' is required');
  return value.trim();
}
function url(value, field) {
  const input = text(value, field, 2048);
  if (!input) return '';
  let result;
  try { result = new URL(input); } catch (_) { throw new HttpError(400, field + ' must be a full http or https URL'); }
  if (!['http:', 'https:'].includes(result.protocol) || result.username || result.password) throw new HttpError(400, 'Invalid ' + field);
  return result.href;
}
function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Site settings are required');
  if (Object.keys(input).some(key => !fields.includes(key))) throw new HttpError(400, 'Unsupported site setting');
  const result = { ...defaults, ...input };
  if (!['monochrome', 'custom'].includes(result.appearanceMode)) throw new HttpError(400, 'Choose a valid appearance mode');
  for (const [field, limit] of Object.entries({ name: 80, tagline: 160, heroTitle: 120, heroDescription: 600, contactEmail: 254, contactPhone: 40, address: 500, aboutText: 8000 })) {
    result[field] = text(result[field], field, limit, ['name', 'heroTitle'].includes(field), ['aboutText', 'address'].includes(field));
  }
  for (const field of ['primaryColor', 'accentColor']) {
    if (typeof result[field] !== 'string' || !/^#[a-f\d]{6}$/i.test(result[field])) throw new HttpError(400, 'Choose a valid ' + field);
  }
  result.contactEmail = result.contactEmail.toLowerCase();
  if (result.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contactEmail)) throw new HttpError(400, 'Invalid contact email');
  if (result.contactPhone && !/^[+\d\s().-]+$/.test(result.contactPhone)) throw new HttpError(400, 'Invalid contact phone');
  result.websiteUrl = url(result.websiteUrl, 'website URL');
  const social = result.socialLinks;
  if (!social || typeof social !== 'object' || Array.isArray(social) || Object.keys(social).some(key => !['instagram', 'facebook', 'twitter'].includes(key))) throw new HttpError(400, 'Invalid social links');
  result.socialLinks = Object.fromEntries(['instagram', 'facebook', 'twitter'].map(key => [key, url(social[key] || '', key + ' URL')]));
  result.logoUrl = text(result.logoUrl, 'logo URL', 2048);
  if (result.logoUrl.startsWith('/')) {
    if (!/^\/uploads\/image-[\w-]+\.(png|jpe?g|gif|webp)$/i.test(result.logoUrl)) throw new HttpError(400, 'Upload the logo using the image uploader');
  } else {
    result.logoUrl = url(result.logoUrl, 'logo URL');
    // The application's upload URL pattern is reserved for owned local files,
    // including when an absolute API URL was pasted into the settings form.
    if (result.logoUrl) {
      const pathname = new URL(result.logoUrl).pathname;
      if (/^\/uploads\/image-[\w-]+\.(png|jpe?g|gif|webp)$/i.test(pathname)) result.logoUrl = pathname;
    }
  }
  return result;
}
async function getPublicSettings() {
  const stored = mongoose.connection.readyState === 1 ? await SiteSettings.findById('site').lean() : null;
  return Object.fromEntries(fields.map(key => [key, stored?.[key] ?? defaults[key]]));
}
async function update(input, userId) {
  const settings = normalize(input);
  if (settings.logoUrl.startsWith('/uploads/')) {
    const previous = await SiteSettings.findById('site').select('logoUrl');
    if (previous?.logoUrl !== settings.logoUrl && !await Upload.exists({ filename: settings.logoUrl.split('/').pop(), userId })) {
      throw new HttpError(403, 'Upload your own logo before publishing it');
    }
  }
  await SiteSettings.findOneAndUpdate({ _id: 'site' }, { $set: { ...settings, updatedBy: userId } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  return getPublicSettings();
}
async function getEmailBranding() {
  const settings = await getPublicSettings();
  return { ...settings, name: escapeHtml(settings.name), contactEmail: escapeHtml(settings.contactEmail || process.env.EMAIL_USER || process.env.SMTP_USER || 'Contact your store administrator') };
}
module.exports = { getPublicSettings, update, normalize, escapeHtml, getEmailBranding };
