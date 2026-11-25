const HttpError = require('../utils/HttpError');
const sides = ['front', 'back', 'leftSleeve', 'rightSleeve'];
const color = (value, fallback) => {
  const result = value || fallback;
  if (typeof result !== 'string' || !/^#[a-f\d]{6}$/i.test(result)) throw new HttpError(400, 'Choose a valid panel color');
  return result;
};
const number = (value, fallback, min, max, label) => {
  const result = Number(value ?? fallback);
  if (!Number.isFinite(result) || result < min || result > max) throw new HttpError(400, 'Invalid ' + label);
  return result;
};
function key(value, fallback, used) {
  const result = value || fallback;
  if (typeof result !== 'string' || !/^[\w-]{1,80}$/.test(result) || used.has(result)) throw new HttpError(400, 'Each design layer needs a unique ID');
  used.add(result); return result;
}
function canonicalStudio(input, baseColor, prices, parseArtwork, priceValue) {
  if (!Array.isArray(input.placedDesigns) || input.placedDesigns.length > 8) throw new HttpError(400, 'Use up to eight artwork layers');
  const used = new Set();
  const placedDesigns = input.placedDesigns.map((layer, index) => {
    if (!layer || !sides.includes(layer.side)) throw new HttpError(400, 'Invalid garment panel');
    const parsed = parseArtwork(layer, prices);
    if (!parsed) throw new HttpError(400, 'Select artwork for each layer');
    return { ...parsed, side: layer.side, layerId: key(layer.layerId, 'artwork-' + index, used) };
  });
  const source = input.panelColors || {};
  if (typeof source !== 'object' || Array.isArray(source) || Object.keys(source).some(side => !sides.includes(side))) throw new HttpError(400, 'Invalid panel colors');
  const panelColors = Object.fromEntries(sides.map(side => [side, color(source[side], baseColor)]));
  if (!Array.isArray(input.lettering ?? []) || (input.lettering || []).length > 2) throw new HttpError(400, 'Use up to two text layers');
  const lettering = (input.lettering || []).map((layer, index) => {
    if (!layer || !['front', 'back'].includes(layer.side) || typeof layer.text !== 'string' || !layer.text.trim() || layer.text.length > 40 || /[\u0000-\u001f]/.test(layer.text)) throw new HttpError(400, 'Text must contain 1 to 40 characters on the front or back');
    if (!['sans', 'serif', 'mono'].includes(layer.font || 'sans')) throw new HttpError(400, 'Select a supported lettering style');
    return {
      layerId: key(layer.layerId, 'text-' + index, used), side: layer.side, text: layer.text.trim(),
      font: layer.font || 'sans', color: color(layer.color, '#ffffff'),
      size: number(layer.size, 12, 4, 25, 'text size'),
      rotation: number(layer.rotation, 0, -180, 180, 'text rotation'),
      position: { x: number(layer.position?.x, 0, -100, 100, 'text position'), y: number(layer.position?.y, 0, -100, 100, 'text position') }
    };
  });
  return { placedDesigns, lettering, panelColors, trimColor: color(input.trimColor, baseColor),
    selectedDesign: placedDesigns.find(layer => layer.side === 'front') || placedDesigns[0] || null,
    designPrice: placedDesigns.reduce((sum, layer) => sum + layer.price, 0) + lettering.length * priceValue(prices.customTextPrice ?? 0),
    designVersion: 2 };
}
module.exports = { canonicalStudio, sides, number };
