import "fake-indexeddb/auto";

const storageValues = new Map<string, string>();
const testLocalStorage: Storage = {
    get length() {
        return storageValues.size;
    },
    clear: () => storageValues.clear(),
    getItem: (key) => storageValues.get(key) ?? null,
    key: (index) => Array.from(storageValues.keys())[index] ?? null,
    removeItem: (key) => {
        storageValues.delete(key);
    },
    setItem: (key, value) => {
        storageValues.set(key, String(value));
    },
};

Object.defineProperty(globalThis, "localStorage", {
    value: testLocalStorage,
    configurable: true,
});
Object.defineProperty(window, "localStorage", {
    value: testLocalStorage,
    configurable: true,
});
