const CustomizerPrices = require('../models/CustomizerPricesModel');
const HttpError = require('../utils/HttpError');
const { defaultPrices, shippingPrices, taxRate, giftWrapPrice } = require('../config/commerce');

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const quantity = value => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1 || result > 999) {
    throw new HttpError(400, 'Quantity must be a whole number between 1 and 999');
  }
  return result;
};
const priceValue = value => {
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw new HttpError(503, 'Pricing is not configured correctly');
  return money(result);
};

async function getPrices(session) {
  const query = CustomizerPrices.findOne().sort({ lastUpdated: -1 });
  if (session) query.session(session);
  return (await query) || defaultPrices;
}

function artwork(input, prices) {
  if (!input || (!input.id && !input.preview)) return null;
  const uploaded = input.isCustomUpload === true;
  const preset = uploaded ? null : prices.presetDesigns.find(p => String(p.id) === String(input.id) && p.isActive !== false);
  if (!uploaded && !preset) throw new HttpError(400, 'Select an available preset design');
  const preview = String(input.preview || '').trim();
  let url;
  try { url = new URL(preview, 'http://local.invalid'); } catch (_) { throw new HttpError(400, 'Invalid artwork URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || preview.length > 2048) throw new HttpError(400, 'Invalid artwork URL');
  if (uploaded && !/^\/uploads\/image-[\w.-]+\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) {
    throw new HttpError(400, 'Upload your artwork using the image uploader');
  }
  if (!uploaded && !/^\/static\/media\/[^/]+\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) {
    throw new HttpError(400, 'Invalid preset artwork');
  }
  if (!preview) throw new HttpError(400, 'Artwork preview is required');
  const size = Number(input.size ?? 80);
  const x = Number(input.position?.x ?? 0), y = Number(input.position?.y ?? 0);
  if (!Number.isFinite(size) || size <= 0 || size > 1000 || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 100 || Math.abs(y) > 100) {
    throw new HttpError(400, 'Invalid artwork placement');
  }
  return {
    id: uploaded ? String(input.id || 'custom-image').slice(0, 100) : String(preset.id),
    name: uploaded ? 'Custom Image' : preset.name,
    price: priceValue(uploaded ? prices.customUploadPrice : preset.price),
    preview: url.pathname, position: { x, y }, size, isCustomUpload: uploaded
  };
}

function priceCustomization(input, prices = defaultPrices) {
  const clothingType = input.clothingType || 'tshirt';
  if (clothingType !== 'tshirt') throw new HttpError(400, 'Unsupported clothing type');
  const size = String(input.size || '');
  if (!['S', 'M', 'L', 'XL', 'XXL'].includes(size)) throw new HttpError(400, 'Select a valid clothing size');
  const namedColors = { white: '#ffffff', black: '#000000' };
  const color = namedColors[input.color] || String(input.color || '');
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new HttpError(400, 'Select a valid clothing color');
  const selectedDesign = artwork(input.selectedDesign, prices);
  const count = quantity(input.quantity ?? 1);
  const unitPrice = money(priceValue(prices.basePrices[clothingType]) + priceValue(prices.sizePrices[size] ?? 0) + (selectedDesign?.price || 0));
  const design = {
    clothingType, nickname: String(input.nickname || 'My Custom T-Shirt').trim().slice(0, 50), color,
    selectedDesign, placedDesigns: selectedDesign ? [{ ...selectedDesign, side: 'front' }] : [],
    size, quantity: count, totalPrice: money(unitPrice * count), designVersion: 1
  };
  return { design, unitPrice };
}

function totals(items, shippingMethod = 'standard', giftWrap = false) {
  if (!Object.prototype.hasOwnProperty.call(shippingPrices, shippingMethod)) throw new HttpError(400, 'Invalid shipping method');
  if (typeof giftWrap !== 'boolean') throw new HttpError(400, 'Invalid gift wrap selection');
  const collectionOnly = items.every(item => item.kind === 'booking');
  const method = collectionOnly ? 'collection' : shippingMethod;
  const subtotal = money(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const tax = money(items.reduce((sum, item) => sum + money(item.totalPrice * taxRate), 0));
  const shipping = shippingPrices[method];
  const giftWrapFee = giftWrap && !collectionOnly ? giftWrapPrice : 0;
  return { subtotal, tax, shipping, shippingMethod: method, giftWrap: giftWrapFee > 0, giftWrapFee, total: money(subtotal + tax + shipping + giftWrapFee) };
}

module.exports = { money, quantity, priceValue, getPrices, priceCustomization, totals };
