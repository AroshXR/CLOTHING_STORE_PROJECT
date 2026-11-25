import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import axios from 'axios';
import Contact from './Contact';
import CollectionPreview from './CollectionPreview';
import Rentals from './Rentals';
import { useBranding } from '../../config/branding';
jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../../config/api', () => ({ apiUrl: path => path }));
jest.mock('../../config/branding', () => ({ useBranding: jest.fn() }));
jest.mock('../MediaImage', () => ({ src, alt }) => <img src={src} alt={alt} />);
beforeEach(() => { jest.clearAllMocks(); useBranding.mockReturnValue({ branding: { name: 'Sample store', contactEmail: '', contactPhone: '', address: '' } }); });
const show = element => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{element}</MemoryRouter>);
function CurrentPath() { const location = useLocation(); return <output data-testid="current-path">{location.pathname + location.search}</output>; }
test('rental category search and real outfit cards preserve the booking destinations', async () => {
  axios.get.mockResolvedValue({ data: { success: true, outfits: [{ _id: 'gown', brand: 'Studio', model: 'Evening dress', category: 'Evening Gowns', pricePerDay: 45, isAvailable: true, image: '/gown.jpg', size: 'M', location: 'Colombo' }] } });
  show(<><Rentals /><CurrentPath /></>);
  expect(await screen.findByRole('link', { name: /Studio Evening dress/ })).toHaveAttribute('href', '/outfit-details/gown');
  fireEvent.change(screen.getByLabelText('What are you looking for?'), { target: { value: 'Evening Gowns' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find an outfit' }));
  expect(screen.getByTestId('current-path')).toHaveTextContent('/outfits?category=Evening+Gowns');
});
test('a rental loading failure can be retried and an empty collection stays honest', async () => {
  axios.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: { success: true, outfits: [] } });
  show(<Rentals />);
  expect(await screen.findByText('The rental collection could not be loaded.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('The next rental edit is on its way.')).toBeInTheDocument();
  expect(screen.queryByText(/Amazing service/)).not.toBeInTheDocument();
});
test('contact FAQs are accessible and an unavailable store email cannot open an empty draft', () => {
  show(<Contact />);
  const guest = screen.getByRole('button', { name: 'Can I try the customizer before signing in?' });
  expect(guest).toHaveAttribute('aria-expanded', 'true');
  const payment = screen.getByRole('button', { name: 'How do payments work?' }); fireEvent.click(payment);
  expect(payment).toHaveAttribute('aria-expanded', 'true'); expect(guest).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('button', { name: 'Open email draft' })).toBeDisabled();
  expect(screen.getByLabelText('Your name')).toBeRequired(); expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email');
});
test('the home collection uses real inventory and category filters preserve the product destinations', async () => {
  axios.get.mockResolvedValue({ data: [{ _id: 'tee', name: 'Daily tee', category: 'T-Shirts', price: 25, imageUrl: '/tee.jpg', status: 'active' }, { _id: 'shirt', name: 'Evening shirt', category: 'Shirts', price: 40, imageUrl: '/shirt.jpg', status: 'active' }] });
  show(<CollectionPreview />); await screen.findByRole('link', { name: /Evening shirt/ });
  fireEvent.click(screen.getByRole('button', { name: 'T-Shirts', exact: true }));
  expect(screen.getByRole('link', { name: /Daily tee/ })).toHaveAttribute('href', '/outlet/tee'); expect(screen.queryByRole('link', { name: /Evening shirt/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All', exact: true })); await waitFor(() => expect(screen.getByRole('link', { name: /Evening shirt/ })).toBeInTheDocument());
});
test('an empty collection offers the working design studio instead of invented products', async () => {
  axios.get.mockResolvedValue({ data: [] }); show(<CollectionPreview />);
  expect(await screen.findByText('The next collection is on its way.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Make something of your own/ })).toHaveAttribute('href', '/customizer');
});
