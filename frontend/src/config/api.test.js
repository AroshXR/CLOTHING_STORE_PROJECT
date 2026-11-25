import { apiFetch } from './api';
import axios from 'axios';
vi.mock('axios', () => ({ __esModule: true, default: { interceptors: { request: { use: vi.fn() } } } }));
const interceptor = axios.interceptors.request.use.mock.calls[0][0];
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'current-session');
  window.fetch = vi.fn().mockResolvedValue({ ok: true });
});
test('native API requests include the current session and preserve body, headers and cancellation', async () => {
  const controller = new AbortController();
  await apiFetch('/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"quantity":2}', signal: controller.signal });
  const [, options] = window.fetch.mock.calls[0];
  expect(options.headers.get('Authorization')).toBe('Bearer current-session');
  expect(options.headers.get('Content-Type')).toBe('application/json');
  expect(options.method).toBe('POST');
  expect(options.body).toBe('{"quantity":2}');
  expect(options.signal).toBe(controller.signal);
});
test('requests to another origin never receive the API session token', async () => {
  await apiFetch('https://external.example/data', { headers: { Authorization: 'Bearer stale-default' } });
  expect(window.fetch.mock.calls[0][1].headers.has('Authorization')).toBe(false);
});
test('Axios also removes authorization headers regardless of capitalization on another origin', () => {
  const request = interceptor({ url: 'https://external.example/data', headers: { authorization: 'Bearer stale-default', Authorization: 'Bearer another-default' } });
  expect(request.headers).toEqual({});
});
