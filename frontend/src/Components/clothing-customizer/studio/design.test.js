import { emptyDesign, historyReducer, initialHistory, loadDesign, studioPrice, updateLayer } from './design';
test('undo groups drag updates and a new edit discards the redo branch', () => {
  let state = initialHistory(emptyDesign());
  for (const color of ['#111111','#222222','#333333']) state = historyReducer(state, { type: 'change', update: { ...state.present, color }, group: 'drag' });
  expect(state.past).toHaveLength(1);
  state = historyReducer(state, { type: 'undo' }); expect(state.present.color).toBe('#f5f5f5');
  state = historyReducer(state, { type: 'redo' }); expect(state.present.color).toBe('#333333');
  state = historyReducer(state, { type: 'undo' }); state = historyReducer(state, { type: 'change', update: { ...state.present, size: 'L' } });
  expect(state.future).toHaveLength(0); expect(state.present.size).toBe('L');
});
test('legacy designs open as one front layer while modern panel layouts retain their own placements', () => {
  const legacy = loadDesign({ color: '#ffffff', selectedDesign: { id: 2, preview: '/static/media/art.jpg', size: 90, position: { x: 17, y: -5 } } });
  expect(legacy.placedDesigns).toHaveLength(1); expect(legacy.placedDesigns[0]).toMatchObject({ side: 'front', size: 90, position: { x: 17, y: -5 } });
  const modern = loadDesign({ ...legacy, panelColors: { back: '#000000' }, placedDesigns: [{ ...legacy.placedDesigns[0], side: 'back' }] });
  expect(modern.placedDesigns[0].side).toBe('back'); expect(modern.panelColors.back).toBe('#000000');
  const moved = updateLayer(modern, modern.placedDesigns[0].layerId, { rotation: 30 });
  expect(moved.placedDesigns[0].rotation).toBe(30); expect(modern.placedDesigns[0].rotation).toBe(0);
});
test('the estimate prices every panel and honors zero-cost presets and lettering', () => {
  const design = { ...emptyDesign(), size: 'L', quantity: 2, placedDesigns: [{ id: 1, price: 1000 }, { id: 1, price: 1000 }, { isCustomUpload: true }], lettering: [{ text: 'Hello' }] };
  expect(studioPrice(design, { basePrices: { tshirt: 25 }, sizePrices: { L: 3 }, presetDesigns: [{ id: 1, price: 0 }], customUploadPrice: 10, customTextPrice: 2 }).total).toBe(80);
});
