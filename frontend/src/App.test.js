import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './AuthGuard/ProtectedRoute';
import { useAuth } from './AuthGuard/authGuard';
jest.mock('./AuthGuard/authGuard', () => ({ useAuth: jest.fn() }));
function show(user, allowed, authenticated = true) {
  useAuth.mockReturnValue({ currentUser: user, loading: false, isAuthenticated: () => authenticated });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/" element={<ProtectedRoute allowedUserTypes={allowed}><p>Protected content</p></ProtectedRoute>} />
    <Route path="/login" element={<p>Sign in</p>} /><Route path="/unauthorized" element={<p>Access denied</p>} />
  </Routes></MemoryRouter>);
}
test('an outfit owner is recognized by role as well as account type', () => {
  show({ type: 'Customer', role: 'owner' }, ['owner', 'Admin']);
  expect(screen.getByText('Protected content')).toBeInTheDocument();
});
test('customer accounts cannot enter administration', () => {
  show({ type: 'Customer', role: 'customer' }, 'Admin');
  expect(screen.getByText('Access denied')).toBeInTheDocument();
});
test('staff default customer role does not bypass account type restrictions', () => {
  show({ type: 'Tailor', role: 'customer' }, ['Customer', 'Applicant']);
  expect(screen.getByText('Access denied')).toBeInTheDocument();
});
test('signed-out visitors are redirected to sign in', () => {
  show(null, 'Customer', false);
  expect(screen.getByText('Sign in')).toBeInTheDocument();
});
