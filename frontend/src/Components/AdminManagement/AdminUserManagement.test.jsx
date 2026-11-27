import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdminUserManagement from './AdminUserManagement';
import Login from '../Login_Register/Login';

jest.mock('axios', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('../../AuthGuard/authGuard', () => ({ useAuth: () => ({ currentUser: { username: 'Admin', type: 'Admin' }, login: jest.fn() }) }));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://api.test', mediaUrl: value => value, isApiMedia: () => false }));
const show = component => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{component}</MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); });

test('a retired account can be converted to a supported customer account', async () => {
  const user = { _id: 'legacy-user', username: 'Former staff', email: 'former@example.test', type: 'Tailor' };
  axios.get.mockResolvedValueOnce({ data: { status: 'ok', users: [user] } })
    .mockResolvedValue({ data: { status: 'ok', users: [{ ...user, type: 'Customer' }] } });
  axios.put.mockResolvedValue({ data: { status: 'ok' } });
  show(<AdminUserManagement />);
  const accountType = await screen.findByLabelText('Account type for Former staff');
  expect(accountType).toHaveValue('');
  expect(screen.queryByRole('option', { name: 'Tailor' })).not.toBeInTheDocument();
  fireEvent.change(accountType, { target: { value: 'Customer' } });
  await waitFor(() => expect(axios.put).toHaveBeenCalledWith('http://api.test/users/legacy-user', { type: 'Customer' }));
  await waitFor(() => expect(screen.getByLabelText('Account type for Former staff')).toHaveValue('Customer'));
});

test('login offers only the supported account types', () => {
  show(<Login />);
  expect(screen.getAllByRole('option').map(option => option.value)).toEqual(['', 'Customer', 'Applicant', 'Admin']);
});
