// Salvare locală (IndexedDB) — rămâne în browser, pe fiecare dispozitiv.
// Fiecare înregistrare are: id, updatedAt, deleted (pentru sincronizare).

const DB_NAME = 'riffbook';
const DB_VERSION = 1;
export const STORES = ['songs', 'portions', 'riffs', 'settings'];

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function reqP(r) {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function getAll(store, includeDeleted = false) {
  const all = await tx(store, 'readonly', (s) => reqP(s.getAll()));
  return includeDeleted ? all : all.filter((x) => !x.deleted);
}

export function get(store, id) {
  return tx(store, 'readonly', (s) => reqP(s.get(id)));
}

// raw = true: păstrează updatedAt (folosit la sincronizare)
export function put(store, obj, raw = false) {
  if (!raw) obj.updatedAt = Date.now();
  return tx(store, 'readwrite', (s) => reqP(s.put(obj))).then(() => {
    if (!raw) window.dispatchEvent(new CustomEvent('rb-changed', { detail: { store } }));
    return obj;
  });
}

// Ștergere „soft”: rămâne marcată ca ștearsă ca să se propage la sincronizare
export async function remove(store, id) {
  const o = await get(store, id);
  if (!o) return;
  const tomb = { id, deleted: true, updatedAt: Date.now(), driveFileId: o.driveFileId || null };
  await put(store, tomb, true);
  window.dispatchEvent(new CustomEvent('rb-changed', { detail: { store } }));
}

export async function getSetting(key, def = null) {
  const r = await get('settings', key);
  return r ? r.value : def;
}

export function setSetting(key, value) {
  return tx('settings', 'readwrite', (s) => reqP(s.put({ id: key, value })));
}
