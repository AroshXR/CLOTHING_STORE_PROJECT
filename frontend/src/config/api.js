import axios from 'axios';
const configured = (process.env.REACT_APP_API_BASE_URL || '').trim().replace(/\/+$/, '');
export const API_BASE_URL = configured || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '');
export const apiUrl = path => API_BASE_URL + (path.startsWith('/') ? path : '/' + path);
export function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers), token = localStorage.getItem('token');
  const target = new URL(url, window.location.origin), api = new URL(API_BASE_URL || window.location.origin, window.location.origin);
  if (token && target.origin === api.origin) headers.set('Authorization', 'Bearer ' + token);
  if (target.origin !== api.origin) headers.delete('Authorization');
  return window.fetch(url, { ...options, headers });
}
export function mediaUrl(source) {
  if (!source || typeof source !== 'string') return '';
  if (source.startsWith('/uploads/')) return apiUrl(source);
  if (/^https?:\/\/localhost:500[01]\/uploads\//i.test(source)) return apiUrl(new URL(source).pathname);
  return source;
}
export function isApiMedia(source) {
  try {
    const url = new URL(source, window.location.origin), api = new URL(API_BASE_URL || window.location.origin, window.location.origin);
    return url.origin === api.origin && url.pathname.includes('/uploads/');
  } catch (_) { return false; }
}
axios.interceptors.request.use(config => {
  config.headers ||= {};
  const token = localStorage.getItem('token');
  const target = new URL(config.url || '/', window.location.origin), api = new URL(API_BASE_URL || window.location.origin, window.location.origin);
  if (token && target.origin === api.origin) config.headers.Authorization = 'Bearer ' + token;
  if (target.origin !== api.origin) {
    for (const name of Object.keys(config.headers)) if (name.toLowerCase() === 'authorization') delete config.headers[name];
  }
  return config;
});
export async function downloadFile(url, filename) {
  const response = await axios.get(url, { responseType: 'blob' }), objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl; link.download = filename || 'document';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
