const parse = (storage, key, fallback) => {
  try { return JSON.parse(storage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; }
};
const rawItem = item => {
  const kind = item.type === 'booking' ? 'booking' : 'product';
  return { kind, id: String(kind === 'booking' ? item.bookingId || item._id : item._id || item.id),
    quantity: kind === 'booking' ? 1 : Number(item.quantity) || 1,
    ...(item.size && item.size !== 'N/A' ? { size: item.size } : {}),
    ...(item.color && item.color !== 'N/A' ? { color: item.color } : {}) };
};
export function cartRequest(designs, local = localStorage, session = sessionStorage) {
  const direct = parse(session, 'directPurchase', null);
  if (direct) return { direct: true, items: [rawItem({ ...direct, _id: direct.id || direct._id })] };
  return { direct: false, items: [...designs.map(item => ({ kind: 'custom', id: item._id, quantity: item.quantity })),
    ...parse(local, 'outletCart', []).map(rawItem)] };
}
const key = item => [item.kind, item.id, item.size || '', item.color || ''].join(':');
export function clearPurchasedCart(request, local = localStorage, session = sessionStorage) {
  if (request.direct) { session.removeItem('directPurchase'); return; }
  const purchased = new Map(request.items.filter(item => item.kind !== 'custom').map(item => [key(item), item.quantity]));
  const remaining = parse(local, 'outletCart', []).flatMap(item => {
    const source = rawItem(item), bought = purchased.get(key(source));
    if (!bought) return [item];
    if (source.kind === 'booking' || source.quantity <= bought) return [];
    return [{ ...item, quantity: source.quantity - bought }];
  });
  local.setItem('outletCart', JSON.stringify(remaining));
}
