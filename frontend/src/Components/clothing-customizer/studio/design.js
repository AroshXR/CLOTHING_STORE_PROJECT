export const PANELS = [{ id: 'front', label: 'Front' }, { id: 'back', label: 'Back' }, { id: 'leftSleeve', label: 'Left sleeve' }, { id: 'rightSleeve', label: 'Right sleeve' }];
export const COLORS = ['#f5f5f5','#2e2e2e','#e57373','#81c784','#64b5f6','#fff176','#ba68c8','#4dd0e1','#ff8a65','#aed581','#7986cb','#4db6ac','#ffb74d','#90caf9','#f06292','#a1887f','#ff7043','#263238','#37474f','#424242','#4a148c','#880e4f','#b71c1c','#0d47a1'];
let sequence = 0;
export const newLayerId = () => 'layer-' + Date.now().toString(36) + '-' + (++sequence);
export const panelLabel = side => PANELS.find(panel => panel.id === side)?.label || side;
export function emptyDesign() {
  return { designVersion: 2, clothingType: 'tshirt', nickname: '', color: '#f5f5f5', panelColors: Object.fromEntries(PANELS.map(panel => [panel.id, '#f5f5f5'])), trimColor: '#f5f5f5', placedDesigns: [], lettering: [], size: 'M', quantity: 1 };
}
export function loadDesign(source = {}) {
  const named = { white: '#ffffff', black: '#000000' };
  const color = named[source.color] || (/^#[a-f\d]{6}$/i.test(source.color || '') ? source.color : '#f5f5f5');
  const layers = source.designVersion === 2 ? source.placedDesigns || [] : source.selectedDesign ? [{ ...source.selectedDesign, side: 'front' }] : [];
  return { ...emptyDesign(), ...source, designVersion: 2, color,
    panelColors: Object.fromEntries(PANELS.map(panel => [panel.id, source.panelColors?.[panel.id] || color])), trimColor: source.trimColor || color,
    placedDesigns: layers.map(layer => ({ mode: 'graphic', rotation: 0, repeat: 3, size: 80, position: { x: 0, y: 0 }, ...layer, layerId: layer.layerId || newLayerId() })),
    lettering: (source.lettering || []).map(layer => ({ ...layer, layerId: layer.layerId || newLayerId() })) };
}
export function studioPrice(design, prices) {
  const base = Number(prices?.basePrices?.tshirt ?? 25), size = Number(prices?.sizePrices?.[design.size] ?? 0);
  const artwork = design.placedDesigns.reduce((sum, layer) => sum + Number(layer.isCustomUpload ? prices?.customUploadPrice ?? 25 : prices?.presetDesigns?.find(preset => String(preset.id) === String(layer.id))?.price ?? layer.price ?? 0), 0);
  const text = design.lettering.length * Number(prices?.customTextPrice ?? 0);
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  return { base, size, artwork, text, unit: round(base + size + artwork + text), total: round((base + size + artwork + text) * design.quantity) };
}
export const initialHistory = design => ({ past: [], present: design, future: [], group: null });
export function historyReducer(state, action) {
  if (action.type === 'reset') return initialHistory(action.design);
  if (action.type === 'end') return { ...state, group: null };
  if (action.type === 'undo') return state.past.length ? { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future], group: null } : state;
  if (action.type === 'redo') return state.future.length ? { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1), group: null } : state;
  if (action.type !== 'change') return state;
  const next = typeof action.update === 'function' ? action.update(state.present) : action.update;
  if (next === state.present) return state;
  return { past: action.group && action.group === state.group ? state.past : [...state.past, state.present].slice(-50), present: next, future: [], group: action.group || null };
}
export function updateLayer(design, layerId, changes) {
  const update = layer => layer.layerId === layerId ? { ...layer, ...changes } : layer;
  return { ...design, placedDesigns: design.placedDesigns.map(update), lettering: design.lettering.map(update) };
}
