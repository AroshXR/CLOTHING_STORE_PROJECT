import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import OrderManagement from './OrderManagement';
import { addBookingToCart, readBrowserCart, writeBrowserLine } from './cartItems';
vi.mock('axios', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../config/api', () => ({ apiUrl: path => path }));
vi.mock('../../AuthGuard/authGuard', () => ({ useAuth: () => ({ token: 'test-token', getToken: () => 'test-token', logout: vi.fn() }) }));
vi.mock('../MediaImage', () => ({ default: ({ src, alt }) => <img src={src} alt={alt} /> }));
const design = { _id: 'design1', nickname: 'My custom tee', clothingType: 'tshirt', quantity: 2, totalPrice: 80, size: 'M', color: '#ffffff', placedDesigns: [] };
const product = { _id: 'product1', name: 'Everyday shirt', price: 30, quantity: 2, size: 'M', color: 'Black', imageUrl: '/shirt.png' };
const rental = { type: 'booking', _id: 'booking1', bookingId: 'booking1', name: 'Saved rental', price: 1, quantity: 8 };
const booking = { _id: 'booking1', status: 'confirmed', paymentStatus: 'unpaid', price: 90, reservationDate: '2099-12-10', returnDate: '2099-12-12', outfit: { brand: 'Evening', model: 'Suit', size: 'L', color: 'Blue', image: '/suit.jpg', location: 'Colombo' } };
function CheckoutProbe() { const location = useLocation(); return <><h1>Checkout selection</h1><output data-testid="checkout-selection">{JSON.stringify(location.state?.cartItems)}</output></>; }
function show() { return render(<MemoryRouter initialEntries={['/orderManagement']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/orderManagement" element={<OrderManagement />} /><Route path="/paymentManagement" element={<CheckoutProbe />} /></Routes></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); window.scrollTo = vi.fn(); window.confirm = vi.fn(() => true);
  axios.get.mockImplementation(url => Promise.resolve({ data: url === '/cloth-customizer' ? { status: 'ok', data: [design] } : { success: true, bookings: [booking] } }));
  localStorage.setItem('outletCart', JSON.stringify([product, rental]));
});
test('mixed items have distinct actions and one summary that stays correct when filtering', async () => {
  show(); await screen.findByRole('heading', { name: 'Custom designs', exact: true });
  const shop = screen.getByRole('article', { name: 'Everyday shirt' }), custom = screen.getByRole('article', { name: 'My custom tee' }), rented = screen.getByRole('article', { name: 'Evening Suit' });
  expect(within(shop).getByRole('link', { name: 'View item' })).toHaveAttribute('href', '/outlet/product1');
  expect(within(shop).queryByRole('button', { name: 'Edit design' })).not.toBeInTheDocument();
  expect(within(custom).getByRole('button', { name: 'Edit design' })).toBeEnabled();
  expect(within(rented).queryByRole('button', { name: /Increase/ })).not.toBeInTheDocument();
  expect(within(rented).getByText(/2099-12-10/)).toBeInTheDocument();
  const summary = screen.getByRole('complementary', { name: 'Bag summary' });
  expect(within(summary).getByText(/230.00/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search your bag'), { target: { value: 'Everyday' } });
  expect(screen.queryByRole('article', { name: 'My custom tee' })).not.toBeInTheDocument();
  expect(within(summary).getByText(/230.00/)).toBeInTheDocument();
  sessionStorage.setItem('directPurchase', '{"id":"stale-buy-now"}');
  fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));
  await screen.findByRole('heading', { name: 'Checkout selection' });
  expect(JSON.parse(screen.getByTestId('checkout-selection').textContent)).toEqual([
    { kind: 'product', id: 'product1', quantity: 2, size: 'M', color: 'Black' },
    { kind: 'booking', id: 'booking1', quantity: 1 },
    { kind: 'custom', id: 'design1', quantity: 2 }
  ]);
  expect(sessionStorage.getItem('directPurchase')).toBeNull();
});
test('removing a rental removes only the cart reference and never cancels its booking', async () => {
  show(); await screen.findByRole('article', { name: 'Evening Suit' });
  fireEvent.click(screen.getByRole('button', { name: 'Remove Evening Suit from cart' }));
  await waitFor(() => expect(screen.queryByRole('article', { name: 'Evening Suit' })).not.toBeInTheDocument());
  expect(axios.delete).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem('outletCart'))).toEqual([product]);
  expect(screen.getByRole('article', { name: 'My custom tee' })).toBeInTheDocument();
});
test('custom quantity changes use the saved server price without submitting a client total', async () => {
  axios.put.mockResolvedValue({ data: { status: 'ok', data: { ...design, quantity: 3, totalPrice: 150 } } });
  show(); await screen.findByRole('article', { name: 'My custom tee' });
  fireEvent.click(screen.getByRole('button', { name: 'Increase My custom tee quantity' }));
  await waitFor(() => expect(within(screen.getByRole('article', { name: 'My custom tee' })).getByText(/150.00/)).toBeInTheDocument());
  expect(axios.put).toHaveBeenCalledWith('/cloth-customizer/design1', { quantity: 3 }, expect.anything());
});
test('shop-only checkout still works when custom designs cannot load', async () => {
  localStorage.setItem('outletCart', JSON.stringify([product])); axios.get.mockRejectedValue(new Error('Service offline'));
  show(); await screen.findByRole('heading', { name: 'Shop items', exact: true });
  expect(screen.getByRole('alert')).toHaveTextContent('Custom designs could not be loaded');
  fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));
  await screen.findByRole('heading', { name: 'Checkout selection' });
  expect(JSON.parse(screen.getByTestId('checkout-selection').textContent)).toHaveLength(1);
});
test('rental eligibility is verified and an invalid booking blocks checkout', async () => {
  axios.get.mockImplementation(url => Promise.resolve({ data: url === '/cloth-customizer' ? { status: 'ok', data: [] } : { success: true, bookings: [{ ...booking, paymentStatus: 'pending' }] } }));
  show(); await screen.findByText('Payment has already been arranged for this booking.');
  expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
});
test('empty cart offers the shop, studio and rentals equally', async () => {
  localStorage.removeItem('outletCart'); axios.get.mockResolvedValue({ data: { status: 'ok', data: [] } });
  show(); expect(await screen.findByRole('heading', { name: 'ROOM FOR SOMETHING YOU.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Browse the shop' })).toHaveAttribute('href', '/outlet');
  expect(screen.getByRole('link', { name: 'Create a design' })).toHaveAttribute('href', '/customizer');
  expect(screen.getByRole('link', { name: 'Explore rentals' })).toHaveAttribute('href', '/rentalHome');
});
test('browser cart changes respect size/colour variants and rental addition is deduplicated', () => {
  localStorage.setItem('outletCart', JSON.stringify([product, { ...product, color: 'White', quantity: 1 }]));
  writeBrowserLine(readBrowserCart().items[0], 3);
  expect(JSON.parse(localStorage.getItem('outletCart')).map(item => item.quantity)).toEqual([3, 1]);
  addBookingToCart(booking); addBookingToCart(booking);
  expect(readBrowserCart().items.filter(item => item.kind === 'booking')).toHaveLength(1);
  localStorage.setItem('outletCart', 'broken JSON');
  expect(readBrowserCart()).toMatchObject({ items: [], error: expect.any(String) });
  expect(localStorage.getItem('outletCart')).toBe('broken JSON');
});