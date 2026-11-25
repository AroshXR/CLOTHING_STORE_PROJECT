import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Outlet from '../Outlet/Outlet';
import OutletDetail from '../Outlet/OutletDetail';
import OutfitDetails from '../../pages/OutfitDetails';
import { CommerceGallery } from './CommerceParts';
import { useAuth } from '../../AuthGuard/authGuard';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../config/api', () => ({ apiUrl: path => path }));
jest.mock('../../config/branding', () => ({ useBranding: () => ({ branding: { name: 'Sample store' } }) }));
jest.mock('../../AuthGuard/authGuard', () => ({ useAuth: jest.fn() }));
jest.mock('../MediaImage', () => ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />);
const product = { _id: 'tee', name: 'Daily cotton tee', brand: 'Studio', category: 'T-Shirts', material: 'Cotton', price: 25, stock: 5, sizes: ['S', 'M'], colors: ['White', 'Black'], imageUrl: '/tee.jpg', gallery: ['/back.jpg'], reviews: [] };
const outfit = { _id: 'gown', brand: 'Studio', model: 'Evening gown', pricePerDay: 45, image: '/gown.jpg', images: [], isAvailable: true, material: 'Cotton', size: 'M', color: 'Black', location: 'Colombo' };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  useAuth.mockReturnValue({ isAuthenticated: () => true, getToken: () => 'test-only-token' });
});
function show(element, path = '/') {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/" element={element} /><Route path="/outlet/:id" element={element} /><Route path="/outfit-details/:id" element={element} /><Route path="/orderManagement" element={<h1>Your cart destination</h1>} /><Route path="/paymentManagement" element={<h1>Cash checkout destination</h1>} /><Route path="/my-bookings" element={<h1>Your booking destination</h1>} /><Route path="/login" element={<h1>Sign in destination</h1>} /></Routes></MemoryRouter>);
}
test('shop filters preserve API parameters and resetting fetches an unfiltered collection', async () => {
  axios.get.mockResolvedValue({ data: [product] }); show(<Outlet />);
  expect(await screen.findByRole('link', { name: /Daily cotton tee/ })).toHaveAttribute('href', '/outlet/tee');
  fireEvent.change(screen.getByLabelText('Categories'), { target: { value: 'T-Shirts' } });
  fireEvent.click(screen.getByRole('button', { name: 'More filters' }));
  fireEvent.change(screen.getByLabelText('Sizes'), { target: { value: 'M' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/clothing', expect.objectContaining({ params: { category: 'T-Shirts', size: 'M' } })));
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/clothing', expect.objectContaining({ params: {} })));
  expect(screen.getByLabelText('Categories')).toHaveValue('');
});
test('the product gallery can be selected with accessible photograph controls', () => {
  show(<CommerceGallery images={['/front.jpg', '/back.jpg']} name="Cotton tee" />);
  fireEvent.click(screen.getByRole('button', { name: 'View photograph 2' }));
  expect(screen.getByRole('button', { name: 'View photograph 2' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Next photograph' }));
  expect(screen.getByRole('button', { name: 'View photograph 1' })).toHaveAttribute('aria-pressed', 'true');
});
test('the redesigned product detail keeps the chosen size and colour when adding to cart', async () => {
  axios.get.mockResolvedValue({ data: product }); show(<OutletDetail />, '/outlet/tee');
  await screen.findByRole('heading', { name: 'Daily cotton tee', exact: true });
  fireEvent.change(screen.getByLabelText('Size'), { target: { value: 'M' } });
  fireEvent.change(screen.getByLabelText('Colour'), { target: { value: 'Black' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
  expect(await screen.findByRole('heading', { name: 'Your cart destination' })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('outletCart'))[0]).toMatchObject({ _id: 'tee', quantity: 1, size: 'M', color: 'Black' });
});
test('buy now keeps the main cart intact and sold-out pieces cannot be purchased', async () => {
  localStorage.setItem('outletCart', '[{"_id":"other","quantity":1}]');
  axios.get.mockResolvedValue({ data: product }); const view = show(<OutletDetail />, '/outlet/tee');
  await screen.findByRole('heading', { name: 'Daily cotton tee', exact: true });
  fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));
  expect(await screen.findByRole('heading', { name: 'Cash checkout destination' })).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem('directPurchase'))).toMatchObject({ id: 'tee', quantity: 1, size: 'S', color: 'White' });
  expect(JSON.parse(localStorage.getItem('outletCart'))).toEqual([{ _id: 'other', quantity: 1 }]);
  view.unmount(); axios.get.mockResolvedValue({ data: { ...product, stock: 0 } }); show(<OutletDetail />, '/outlet/tee');
  expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Buy now' })).toBeDisabled();
});
test('outfit booking preserves the authenticated multipart request and uses real garment details', async () => {
  axios.get.mockResolvedValue({ data: { success: true, outfits: [outfit] } }); axios.post.mockResolvedValue({ data: { success: true } });
  show(<OutfitDetails />, '/outfit-details/gown'); await screen.findByRole('heading', { name: 'Studio Evening gown', exact: true });
  expect(screen.getByText('Cotton', { exact: true })).toBeInTheDocument(); expect(screen.queryByText('Silk Material')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Reservation date'), { target: { value: '2099-12-10' } }); fireEvent.change(screen.getByLabelText('Return date'), { target: { value: '2099-12-12' } });
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0771234567' } }); fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'customer@example.test' } });
  const file = new File(['synthetic test document'], 'test-id.pdf', { type: 'application/pdf' }); fireEvent.change(screen.getByLabelText('ID document'), { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: 'Request booking' })); await screen.findByRole('heading', { name: 'Your booking destination' });
  const [url, form, options] = axios.post.mock.calls[0]; expect(url).toBe('/api/booking/create'); expect(form.get('outfit')).toBe('gown'); expect(form.get('reservationDate')).toBe('2099-12-10'); expect(form.get('returnDate')).toBe('2099-12-12'); expect(form.get('document')).toBe(file); expect(options.headers.Authorization).toBe('Bearer test-only-token');
});
test('unavailable rental outfits cannot submit a booking', async () => {
  axios.get.mockResolvedValue({ data: { success: true, outfits: [{ ...outfit, isAvailable: false }] } }); show(<OutfitDetails />, '/outfit-details/gown');
  expect(await screen.findByRole('button', { name: 'Currently unavailable' })).toBeDisabled(); expect(axios.post).not.toHaveBeenCalled();
});
test('an accepted review stays acknowledged if refreshing the product fails', async () => {
  axios.get.mockResolvedValueOnce({ data: product }).mockRejectedValueOnce(new Error('Refresh offline')); axios.post.mockResolvedValue({ data: {} });
  show(<OutletDetail />, '/outlet/tee'); await screen.findByRole('heading', { name: 'Daily cotton tee', exact: true });
  fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '4' } }); fireEvent.change(screen.getByLabelText('Your comment (optional)'), { target: { value: 'Comfortable cotton.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
  expect(await screen.findByText('Your review was added. Refresh the page to see it.')).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith('/clothing/tee/reviews', { rating: 4, comment: 'Comfortable cotton.', username: 'Anonymous' });
});
