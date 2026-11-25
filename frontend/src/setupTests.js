// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
function createMemoryStorage() {
  let store = {};
  return {
    getItem: key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => { store[String(key)] = String(value); },
    removeItem: key => { delete store[String(key)]; },
    clear: () => { store = {}; },
    key: i => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; }
  };
}
if (typeof globalThis.localStorage?.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: createMemoryStorage() });
}
if (typeof globalThis.sessionStorage?.clear !== 'function') {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: createMemoryStorage() });
}
Object.defineProperty(window, 'matchMedia', { writable: true, value: query => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }) });
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
