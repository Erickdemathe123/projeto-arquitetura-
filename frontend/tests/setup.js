class MemoryStorage {
  constructor() {
    this.items = new Map();
  }
  clear() {
    this.items.clear();
  }
  getItem(key) {
    return this.items.has(String(key)) ? this.items.get(String(key)) : null;
  }
  key(index) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key) {
    this.items.delete(String(key));
  }
  setItem(key, value) {
    this.items.set(String(key), String(value));
  }
  get length() {
    return this.items.size;
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage
});
