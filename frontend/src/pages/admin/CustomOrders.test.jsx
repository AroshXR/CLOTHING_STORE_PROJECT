import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import CustomOrders from './CustomOrders';
import CustomOrderDetail from './CustomOrderDetail';
import { useAuth } from '../../AuthGuard/authGuard';

jest.mock('axios', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('../../AuthGuard/authGuard', () => ({ useAuth: jest.fn() }));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://api.test', mediaUrl: value => value }));

const getToken = () => 'test-session';
const order = { _id: 'order-1', status: 'pending', customerId: { username: 'Customer', email: 'customer@example.test' }, config: { clothingType: 'tshirt', size: 'M', color: 'White', quantity: 1 }, price: 25 };
function show(path = '/admin/custom-orders') {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/admin/custom-orders" element={<CustomOrders />} />
    <Route path="/admin/custom-orders/:id" element={<CustomOrderDetail />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ getToken });
  axios.get.mockReset(); axios.patch.mockReset();
  axios.get.mockResolvedValue({ data: { data: [order] } });
  axios.patch.mockResolvedValue({ data: { status: 'ok' } });
});

test('an administrator starts production directly and then sees the next valid action', async () => {
  show();
  const start = await screen.findByRole('button', { name: 'Start production' });
  expect(axios.get).toHaveBeenCalledTimes(1);
  axios.get.mockResolvedValue({ data: { data: [{ ...order, status: 'in_progress' }] } });
  fireEvent.click(start);
  await screen.findByRole('button', { name: 'Mark completed' });
  expect(axios.patch).toHaveBeenCalledWith('http://api.test/api/custom-orders/order-1/status', { status: 'in_progress' }, { headers: { Authorization: 'Bearer test-session' } });
  expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/tailor/i)).not.toBeInTheDocument();
});

test('status and order ID filters are sent to the custom order API', async () => {
  show('/admin/custom-orders?id=order-1');
  await screen.findByRole('button', { name: 'Start production' });
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'completed' } });
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('http://api.test/api/custom-orders', {
    headers: { Authorization: 'Bearer test-session' }, params: { id: 'order-1', status: 'completed' }
  }));
  expect(screen.queryByRole('option', { name: 'assigned' })).not.toBeInTheDocument();
});

test('order details allow production to start without an assignment step', async () => {
  axios.get.mockResolvedValue({ data: { data: order } });
  show('/admin/custom-orders/order-1');
  fireEvent.click(await screen.findByRole('button', { name: 'Start production' }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('http://api.test/api/custom-orders/order-1/status', { status: 'in_progress' }, { headers: { Authorization: 'Bearer test-session' } }));
  expect(axios.get.mock.calls.every(([url]) => url === 'http://api.test/api/custom-orders/order-1')).toBe(true);
});

test('failed order details show an error and finish loading', async () => {
  axios.get.mockRejectedValue(new Error('Offline'));
  show('/admin/custom-orders/order-1');
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load order.');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
