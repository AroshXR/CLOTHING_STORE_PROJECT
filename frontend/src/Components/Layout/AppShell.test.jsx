import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppShell from './AppShell';
import { useAuth } from '../../AuthGuard/authGuard';
jest.mock('../../AuthGuard/authGuard', () => ({ useAuth: jest.fn() }));
jest.mock('../../config/branding', () => ({ useBranding: () => ({ branding: { name: 'Sample store', logoUrl: '', tagline: 'Made for you', socialLinks: {} } }) }));
jest.mock('../../config/api', () => ({ mediaUrl: path => path }));
beforeEach(() => {
  useAuth.mockReturnValue({ currentUser: null, isAuthenticated: () => false, logout: jest.fn() });
  window.scrollTo = jest.fn();
});
function show(path = '/') {
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppShell><Routes>
      <Route path="/" element={<h1>Home page</h1>} />
      <Route path="/outlet" element={<h1>Shop page</h1>} />
      <Route path="/owner" element={<h1>Owner overview</h1>} />
    </Routes></AppShell>
  </MemoryRouter>);
}
test('every route shares one header, footer and main landmark', () => {
  show();
  expect(screen.getAllByRole('banner')).toHaveLength(1);
  expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
  fireEvent.click(screen.getByRole('link', { name: 'Shop', exact: true }));
  expect(screen.getByRole('heading', { name: 'Shop page' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Shop', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(document.activeElement).toBe(screen.getByRole('main'));
  expect(screen.getAllByRole('banner')).toHaveLength(1);
});
test('mobile navigation closes on a route change and on Escape', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('link', { name: 'Shop', exact: true }));
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
});
test('owners receive their workspace link without administrator-only links', () => {
  useAuth.mockReturnValue({ currentUser: { type: 'Customer', role: 'owner', username: 'Owner' }, isAuthenticated: () => true, logout: jest.fn() });
  show('/owner');
  fireEvent.click(screen.getByText('Workspace'));
  expect(screen.getByRole('link', { name: 'Rental management' })).toHaveAttribute('href', '/owner');
  expect(screen.queryByRole('link', { name: 'Admin Hub' })).not.toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveAttribute('data-page', 'owner-dashboard');
});
