import { cartRequest, clearPurchasedCart } from './checkoutCart';
const storage = values => {
  const data = { ...values };
  return { getItem: key => data[key] || null, setItem: (key, value) => { data[key] = value; }, removeItem: key => { delete data[key]; } };
};
test('mixed cart requests carry explicit types and real IDs without client prices', () => {
  const local = storage({ outletCart: JSON.stringify([{ _id: 'product', quantity: 2, price: 0.01, size: 'M', color: 'Blue' }, { type: 'booking', bookingId: 'rental', _id: 'rental', quantity: 4 }]) });
  expect(cartRequest([{ _id: 'design', quantity: 1 }], local, storage({})).items).toEqual([
    { kind: 'custom', id: 'design', quantity: 1 }, { kind: 'product', id: 'product', quantity: 2, size: 'M', color: 'Blue' },
    { kind: 'booking', id: 'rental', quantity: 1 }
  ]);
});
test('Buy Now clears its own flag and preserves the existing cart', () => {
  const local = storage({ outletCart: '[{"_id":"other","quantity":1}]' });
  const session = storage({ directPurchase: '{"id":"direct-product","quantity":1}' });
  const request = cartRequest([], local, session);
  expect(request.items[0].id).toBe('direct-product');
  clearPurchasedCart(request, local, session);
  expect(session.getItem('directPurchase')).toBeNull();
  expect(JSON.parse(local.getItem('outletCart'))).toHaveLength(1);
});
test('booking collection checkout uses the booking ID', () => {
  const session = storage({ directPurchase: '{"type":"booking","id":"booking-id","bookingId":"booking-id","quantity":1}' });
  expect(cartRequest([], storage({}), session).items).toEqual([{ kind: 'booking', id: 'booking-id', quantity: 1 }]);
});
test('cleanup retains additional quantities and items added after checkout started', () => {
  const local = storage({ outletCart: '[{"_id":"p","quantity":3},{"_id":"other","quantity":1}]' });
  clearPurchasedCart({ direct: false, items: [{ kind: 'product', id: 'p', quantity: 2 }] }, local, storage({}));
  expect(JSON.parse(local.getItem('outletCart'))).toEqual([{ _id: 'p', quantity: 1 }, { _id: 'other', quantity: 1 }]);
});

test.each([{ type: 'booking', _id: 'rental' }, { kind: 'booking', _id: 'rental' }, { kind: 'booking', id: 'rental' }])('rental metadata does not prevent cleanup after an explicit cart checkout: %p', entry => {
  const local = storage({ outletCart: JSON.stringify([{ ...entry, quantity: 1, size: 'L', color: 'Blue' }, { _id: 'remaining', quantity: 2 }]) });
  clearPurchasedCart({ direct: false, items: [{ kind: 'booking', id: 'rental', quantity: 1 }] }, local, storage({}));
  expect(JSON.parse(local.getItem('outletCart'))).toEqual([{ _id: 'remaining', quantity: 2 }]);
});
