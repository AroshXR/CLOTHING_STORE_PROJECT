import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import SiteSettings from './SiteSettings';
import SiteBrand from '../../Components/SiteBrand';
import { BrandingProvider, defaultBranding, escapeHtml, brandSlug, csvCell } from '../../config/branding';
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn(), post: jest.fn() } }));
jest.mock('../../config/api', () => ({ apiUrl: path => path, mediaUrl: path => path }));
jest.mock('../../Components/NavBar/navBar', () => () => null);
jest.mock('../../Components/Footer/Footer', () => () => null);
jest.mock('../../Components/MediaImage', () => () => null);
function show() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <BrandingProvider><SiteSettings /><SiteBrand /></BrandingProvider>
  </MemoryRouter>);
}
beforeEach(() => {
  jest.clearAllMocks();
  document.head.innerHTML = '<title>Your Store</title><meta name="description"><meta name="theme-color"><link rel="icon"><link rel="manifest">';
});
test('saving buyer branding updates visible identity, browser metadata and subsequent loads', async () => {
  let stored = { ...defaultBranding, socialLinks: { ...defaultBranding.socialLinks } };
  axios.get.mockImplementation(() => Promise.resolve({ data: { data: stored } }));
  axios.put.mockImplementation((_url, settings) => { stored = settings; return Promise.resolve({ data: { data: stored } }); });
  const first = show();
  await screen.findByLabelText('Site name');
  fireEvent.change(screen.getByLabelText('Site name'), { target: { value: 'Thread & Needle' } });
  fireEvent.change(screen.getByLabelText('Public contact email'), { target: { value: 'help@example.com' } });
  fireEvent.change(screen.getByLabelText('Header color'), { target: { value: '#334455' } });
  fireEvent.change(screen.getByLabelText('Homepage description'), { target: { value: 'Designed by you.' } });
  fireEvent.click(screen.getByText('Save site settings'));
  await screen.findByRole('status');
  expect(axios.put).toHaveBeenCalledWith('/site-settings', expect.objectContaining({ name: 'Thread & Needle', contactEmail: 'help@example.com' }));
  expect(document.title).toBe('Thread & Needle');
  expect(document.querySelector('meta[name="description"]').content).toBe('Designed by you.');
  expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#334455');
  first.unmount(); show();
  await waitFor(() => expect(screen.getByLabelText('Site name')).toHaveValue('Thread & Needle'));
  expect(document.title).toBe('Thread & Needle');
});
test('a rejected save keeps the last published identity', async () => {
  axios.get.mockResolvedValue({ data: { data: { ...defaultBranding } } });
  axios.put.mockRejectedValue({ response: { data: { message: 'Administrator access required' } } });
  show(); await screen.findByLabelText('Site name');
  fireEvent.change(screen.getByLabelText('Site name'), { target: { value: 'Unpublished name' } });
  fireEvent.click(screen.getByText('Save site settings'));
  await screen.findByText('Administrator access required');
  expect(document.title).toBe('Your Store');
});
test('uploading a logo adds its URL to the explicitly saved site settings', async () => {
  axios.get.mockResolvedValue({ data: { data: { ...defaultBranding } } });
  axios.post.mockResolvedValue({ data: { data: { url: '/uploads/image-example.png' } } });
  axios.put.mockImplementation((_url, settings) => Promise.resolve({ data: { data: settings } }));
  show(); await screen.findByLabelText('Logo image');
  const file = new File(['image'], 'logo.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Logo image'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText('Logo URL (optional)')).toHaveValue('/uploads/image-example.png'));
  expect(axios.post).toHaveBeenCalledWith('/upload/image', expect.any(FormData));
  expect(axios.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Save site settings'));
  await screen.findByRole('status');
  expect(axios.put).toHaveBeenCalledWith('/site-settings', expect.objectContaining({ logoUrl: '/uploads/image-example.png' }));
  expect(document.querySelector('link[rel="icon"]').getAttribute('href')).toBe('/uploads/image-example.png');
});
test('report branding escapes HTML and produces safe download filenames', () => {
  expect(escapeHtml('<img src=x onerror="bad"> & Store')).toBe('&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; Store');
  expect(brandSlug('Thread / Needle: Custom')).toBe('Thread-Needle-Custom');
  expect(csvCell('Thread "Original" & Needle')).toBe('"Thread ""Original"" & Needle"');
});
