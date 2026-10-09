// Minimal promise wrapper around IndexedDB.

const DB_NAME = 'expenses-db';
const DB_VERSION = 1;
export const STORES = ['expenses', 'categories', 'recurring', 'meta'];

let dbPromise;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('expenses')) {
        const s = db.createObjectStore('expenses', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('recurring')) db.createObjectStore('recurring', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

const done = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, ...values) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  values.forEach((v) => s.put(v));
  return done(tx);
}

export async function del(store, ...keys) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  keys.forEach((k) => s.delete(k));
  return done(tx);
}

/** Atomically replace the contents of several stores ({ store: [records] }). */
export async function replaceAll(data) {
  const db = await openDB();
  const names = Object.keys(data);
  const tx = db.transaction(names, 'readwrite');
  for (const name of names) {
    const s = tx.objectStore(name);
    s.clear();
    data[name].forEach((v) => s.put(v));
  }
  return done(tx);
}
