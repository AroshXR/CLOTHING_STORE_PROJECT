const cleanOption = value => value && value !== 'N/A' ? String(value) : '';
const amount = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
export const lineKey = item => JSON.stringify([item.kind, item.sourceId, item.kind === 'product' ? item.size || '' : '', item.kind === 'product' ? item.color || '' : '']);
export function readBrowserCart(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem('outletCart') || '[]');
    if (!Array.isArray(value)) throw new Error();
    const items = value.filter(item => item && (item._id || item.id || item.bookingId)).map(item => {
      const kind = item.type === 'booking' || item.kind === 'booking' ? 'booking' : 'product';
      const sourceId = String(kind === 'booking' ? item.bookingId || item._id || item.id : item._id || item.id);
      const quantity = kind === 'booking' ? 1 : Math.max(1, Math.trunc(Number(item.quantity) || 1));
      const price = amount(item.price);
      return { ...item, kind, sourceId, quantity, size: cleanOption(item.size), color: cleanOption(item.color), name: item.name || (kind === 'booking' ? 'Rental booking' : 'Shop item'), price, totalPrice: price * quantity };
    });
    return { items, error: items.length !== value.length ? 'Some saved cart entries could not be read. The items shown below are available to review.' : '' };
  } catch (_) { return { items: [], error: 'The saved shop cart could not be read. It has not been changed.' }; }
}
export function customItem(design) {
  const quantity = Math.max(1, Number(design.quantity) || 1);
  return { ...design, kind: 'custom', sourceId: design._id, name: design.nickname || 'Custom T-shirt', quantity, price: amount(design.totalPrice) / quantity, totalPrice: amount(design.totalPrice) };
}
export function writeBrowserLine(item, quantity, storage = localStorage) {
  const raw = JSON.parse(storage.getItem('outletCart') || '[]');
  if (!Array.isArray(raw)) throw new Error('The saved shop cart could not be read.');
  const same = entry => {
    const kind = entry.type === 'booking' || entry.kind === 'booking' ? 'booking' : 'product';
    return lineKey({ kind, sourceId: String(kind === 'booking' ? entry.bookingId || entry._id || entry.id : entry._id || entry.id), size: cleanOption(entry.size), color: cleanOption(entry.color) }) === lineKey(item);
  };
  if (!raw.some(same)) throw new Error('This item is no longer in the cart. Refresh your cart.');
  const next = quantity === 0 ? raw.filter(entry => !same(entry)) : raw.map(entry => same(entry) ? { ...entry, quantity, totalPrice: Number(entry.price || 0) * quantity } : entry);
  storage.setItem('outletCart', JSON.stringify(next));
}
export function checkoutItems(items) {
  return items.map(item => ({ kind: item.kind, id: item.sourceId, quantity: item.kind === 'booking' ? 1 : item.quantity,
    ...(item.kind === 'product' && item.size ? { size: item.size } : {}), ...(item.kind === 'product' && item.color ? { color: item.color } : {}) }));
}
export function addBookingToCart(booking, storage = localStorage) {
  const cart = JSON.parse(storage.getItem('outletCart') || '[]');
  if (!Array.isArray(cart)) throw new Error('Your saved cart could not be read.');
  if (booking.status !== 'confirmed' || ['pending', 'paid'].includes(booking.paymentStatus)) throw new Error('This booking cannot be added to checkout.');
  if (!cart.some(item => (item.type === 'booking' || item.kind === 'booking') && String(item.bookingId || item._id || item.id) === String(booking._id))) {
    cart.push({ type: 'booking', _id: booking._id, bookingId: booking._id, quantity: 1, name: [booking.outfit?.brand, booking.outfit?.model].filter(Boolean).join(' ') || 'Rental booking',
      price: booking.price, imageUrl: booking.outfit?.image, size: booking.outfit?.size, color: booking.outfit?.color, reservationDate: booking.reservationDate, returnDate: booking.returnDate });
    storage.setItem('outletCart', JSON.stringify(cart));
  }
}