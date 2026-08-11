import '@testing-library/jest-dom'

const values = new Map<string, string>()
const testStorage: Storage = {
  get length() {
    return values.size
  },
  clear: () => values.clear(),
  getItem: (key) => values.get(String(key)) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => {
    values.delete(String(key))
  },
  setItem: (key, value) => {
    values.set(String(key), String(value))
  },
}

// Node can expose its own global localStorage. Use a deterministic test-only
// implementation so a plain `npm run test` is stable across supported LTS lines.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testStorage,
})
