import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import PaymentManagement from './PaymentManagement';
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../AuthGuard/authGuard', () => ({ useAuth: () => ({ currentUser: { email: 'customer@example.com' } }) }));
jest.mock('../../config/api', () => ({ apiUrl: path => path }));
jest.mock('../NavBar/navBar', () => () => null);
jest.mock('../Footer/Footer', () => () => null);
jest.mock('../MediaImage', () => () => null);
const productId = '123456789012345678901234';
const quote = { items: [{ kind: 'product', sourceId: productId, name: 'Shirt', quantity: 1, totalPrice: 30 }], subtotal: 30, tax: 2.4, shipping: 0, shippingMethod: 'collection', giftWrapFee: 0, total: 32.4 };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  sessionStorage.setItem('directPurchase', JSON.stringify({ type: 'product', id: productId, quantity: 1 }));
  localStorage.setItem('outletCart', JSON.stringify([{ _id: 'another-item', quantity: 2 }]));
});
test('cash collection needs contact only, retries with the same key, and leaves the main cart intact', async () => {
  let attempts = 0;
  axios.post.mockImplementation((url, body) => {
    if (url === '/payment/quote') return Promise.resolve({ data: { data: quote } });
    if (++attempts === 1) return Promise.reject(new Error('Network response lost'));
    return Promise.resolve({ data: { data: { total: 32.4, orders: [{ _id: 'order', itemName: 'Shirt', orderId: 'ORD-1' }] } } });
  });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PaymentManagement /></MemoryRouter>);
  await screen.findByText('Shirt');
  fireEvent.change(screen.getByLabelText('Delivery method'), { target: { value: 'collection' } });
  expect(screen.queryByLabelText('Street address')).not.toBeInTheDocument();
  for (const [label, value] of [['First name', 'Test'], ['Last name', 'Customer'], ['Phone', '0771234567']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  await waitFor(() => expect(screen.getByText('Continue')).toBeEnabled());
  fireEvent.click(screen.getByText('Continue'));
  fireEvent.click(screen.getByText('Continue'));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText('Place cash order'));
  await screen.findByRole('alert');
  await waitFor(() => expect(screen.getByText('Place cash order')).toBeEnabled());
  fireEvent.click(screen.getByText('Place cash order'));
  await screen.findByText('Thank you for your order');
  const writes = axios.post.mock.calls.filter(([url]) => url === '/payment');
  expect(writes).toHaveLength(2);
  expect(writes[0][1]).toMatchObject({ expectedTotal: 32.4, shippingMethod: 'collection', items: [{ kind: 'product', id: productId, quantity: 1 }] });
  expect(writes[0][2].headers['Idempotency-Key']).toBe(writes[1][2].headers['Idempotency-Key']);
  expect(JSON.parse(localStorage.getItem('outletCart'))).toEqual([{ _id: 'another-item', quantity: 2 }]);
  expect(sessionStorage.getItem('directPurchase')).toBeNull();
  expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
});

test('checkout uses the explicit bag selection without depending on customizer loading', async () => {
  const items = [{ kind: 'product', id: productId, quantity: 1 }];
  sessionStorage.removeItem('directPurchase');
  axios.get.mockRejectedValue(new Error('Customizer offline'));
  axios.post.mockResolvedValue({ data: { data: quote } });
  render(<MemoryRouter initialEntries={[{ pathname: '/paymentManagement', state: { cartItems: items } }]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PaymentManagement /></MemoryRouter>);
  await screen.findByText('Shirt');
  expect(axios.get).not.toHaveBeenCalled();
  expect(axios.post).toHaveBeenCalledWith('/payment/quote', expect.objectContaining({ items }), expect.anything());
});
