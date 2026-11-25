import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Career from '../Career/Career';
import SkinToneColorGuide from '../SkinToneColorGuide/SkinToneColorGuide';
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../config/api', () => ({ apiUrl: path => path }));
vi.mock('../../config/branding', () => ({ useBranding: () => ({ branding: { name: 'Sample store' } }) }));
const role = { _id: 'tailor', title: 'Tailor', department: 'Production', location: 'Colombo', type: 'Full-time', experience: '2 years', description: 'Create thoughtful garments.', requirements: ['Sewing experience'], status: 'active' };
const show = component => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{component}</MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); window.scrollTo = vi.fn();
  axios.get.mockResolvedValue({ data: { data: [role, { ...role, _id: 'closed', title: 'Closed role', status: 'closed' }] } });
  axios.post.mockResolvedValue({ data: { message: 'Application submitted' } });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
async function openApplication() {
  show(<Career />); fireEvent.click(await screen.findByRole('button', { name: 'Apply for Tailor' }));
  return screen.findByRole('dialog', { name: 'Job application' });
}
function fillApplication(dialog) {
  for (const [label, value] of [[/^Full Name/, 'Test Candidate'], [/^Email Address/, 'candidate@example.test'], [/^Age/, '25'], [/^Phone Number/, '0771234567'], [/^Address/, '100 Example Street, Colombo'], [/^Years of Experience/, '2 years'], [/^Education/, 'Fashion design training'], [/^Skills/, 'Sewing and pattern cutting'], [/^Cover Letter/, 'I enjoy thoughtful garment construction and collaborating with others. '.repeat(3)]]) fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
  const resume = new File(['synthetic CV for unit testing'], 'test-cv.pdf', { type: 'application/pdf' });
  fireEvent.change(within(dialog).getByLabelText(/^Resume/), { target: { files: [resume] } }); return resume;
}
test('careers searches current roles and opens an accessible job-specific application', async () => {
  show(<Career />); await screen.findByRole('heading', { name: 'Tailor', exact: true });
  expect(screen.queryByRole('heading', { name: 'Closed role' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Search by role/), { target: { value: 'missing role' } }); fireEvent.click(screen.getByRole('button', { name: 'Search roles' }));
  expect(screen.getByRole('heading', { name: 'NO MATCHING ROLES.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' })); const applyButton = screen.getByRole('button', { name: 'Apply for Tailor' }); applyButton.focus(); fireEvent.click(applyButton);
  const dialog = await screen.findByRole('dialog', { name: 'Job application' });
  expect(within(dialog).getByLabelText(/^Position Applied/)).toHaveValue('Tailor');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close application' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); await waitFor(() => expect(applyButton).toHaveFocus());
});
test('successful applications retain the multipart API contract and selected role', async () => {
  const dialog = await openApplication(), resume = fillApplication(dialog);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
  await screen.findByText('Your application was submitted successfully.');
  const [url, data, options] = axios.post.mock.calls[0]; expect(url).toBe('/applicant'); expect(data.get('position')).toBe('Tailor'); expect(data.get('department')).toBe('Production'); expect(data.get('gmail')).toBe('candidate@example.test'); expect(data.get('resume')).toBe(resume); expect(options.headers['Content-Type']).toBe('multipart/form-data');
  expect(localStorage.getItem('jobApplications')).toBeNull();
});
test('a failed application remains open with its CV and can be retried', async () => {
  axios.post.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: { message: 'Submitted' } });
  const dialog = await openApplication(), resume = fillApplication(dialog);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Your application was not submitted');
  expect(within(dialog).getByLabelText(/^Full Name/)).toHaveValue('Test Candidate'); expect(localStorage.getItem('jobApplications')).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
  await screen.findByText('Your application was submitted successfully.');
  expect(axios.post.mock.calls[1][1].get('resume')).toBe(resume);
});
test('an invalid replacement CV cannot silently submit the earlier valid file', async () => {
  const dialog = await openApplication(); fillApplication(dialog);
  fireEvent.change(within(dialog).getByLabelText(/^Resume/), { target: { files: [new File(['image'], 'wrong.png', { type: 'image/png' })] } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
  expect(await within(dialog).findByText('Resume is required')).toBeInTheDocument(); expect(axios.post).not.toHaveBeenCalled();
});
test('the API empty-jobs response stays distinct from a network error and supports general applications', async () => {
  axios.get.mockRejectedValue({ response: { status: 404, data: { data: [] } } }); show(<Career />);
  expect(await screen.findByRole('heading', { name: 'MORE TO COME.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'General application' })); const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByLabelText(/^Position Applied/)).toHaveValue('General Application');
});
test('a jobs outage offers retry instead of showing stale vacancies as current', async () => {
  localStorage.setItem('adminJobs', JSON.stringify([{ ...role, title: 'Stale vacancy' }]));
  axios.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: { data: [role] } }); show(<Career />);
  await screen.findByText('Open roles could not be loaded. Please try again.'); expect(screen.queryByText('Stale vacancy')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(await screen.findByRole('heading', { name: 'Tailor', exact: true })).toBeInTheDocument();
});
test('the colour guide keeps real swatches, selection, hex copying, and system links', async () => {
  show(<SkinToneColorGuide />);
  for (const name of ['Fair / Light Skin', 'Medium / Olive Skin', 'Deep / Dark Skin']) expect(screen.getByRole('heading', { name })).toBeInTheDocument();
  const cobalt = screen.getByRole('button', { name: 'Select Cobalt blue (#0047AB)' }); fireEvent.click(cobalt);
  expect(cobalt).toHaveAttribute('aria-pressed', 'true'); expect(screen.getByRole('status')).toHaveTextContent('Cobalt blue');
  expect(screen.getByTestId('selected-colour-preview')).toHaveStyle({ backgroundColor: '#0047ab' });
  fireEvent.click(screen.getByRole('button', { name: 'Copy hex' })); await screen.findByText('Hex value copied.'); expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#0047AB');
  expect(screen.getByRole('link', { name: 'Open design studio' })).toHaveAttribute('href', '/customizer'); expect(screen.getByRole('link', { name: 'Shop the collection' })).toHaveAttribute('href', '/outlet'); expect(screen.getByRole('link', { name: 'Explore rentals' })).toHaveAttribute('href', '/rentalHome');
});
test('hex copying has a truthful fallback when clipboard access is unavailable', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); show(<SkinToneColorGuide />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy hex' }));
  expect(await screen.findByText('Select the hex value above to copy it manually.')).toBeInTheDocument();
});