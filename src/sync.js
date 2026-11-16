// Library sync between devices.
// Two ways, chosen in the app (no file editing needed):
//  - "website": the app's own server keeps a copy (sync.php, needs PHP hosting). Same sync code on every device.
//  - "google": a "Riffbook" folder in Google Drive. Needs a Google client ID, pasted once in the app.

import * as db from './db.js';

const CFG = window.RIFFBOOK_CONFIG || {};

// ---------------- settings ----------------
export async function getConfig() {
  const c = (await db.getSetting('sync')) || {};
  return {
    mode: c.mode || null,               // 'website' | 'google' | null
    code: c.code || '',
    clientId: c.clientId || CFG.GOOGLE_CLIENT_ID || '',
  };
}
export async function setConfig(patch) {
  const c = await getConfig();
  const next = { ...c, ...patch };
  await db.setSetting('sync', next);
  return next;
}

// ---------------- website backend (sync.php) ----------------
const SERVER_URL = () => new URL('sync.php', document.baseURI).href;

// Checks that sync.php answers properly; the reason is kept for the Log / settings dialog
export let websiteProblem = '';
export async function websiteAvailable() {
  websiteProblem = '';
  try {
    const r = await fetch(SERVER_URL() + '?a=ping&t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    if (!r.ok) { websiteProblem = `sync.php answered ${r.status}${r.status === 404 ? ' (file not uploaded?)' : ''}`; return false; }
    if (!/json/i.test(ct)) {
      websiteProblem = /<\?php/.test(text) ? 'PHP is not running on this server' : 'the server returned a web page instead of data (hosting protection?): ' + text.replace(/\s+/g, ' ').slice(0, 100);
      return false;
    }
    const j = JSON.parse(text);
    return !!(j && j.ok && j.app === 'riffbook');
  } catch (e) { websiteProblem = 'could not reach sync.php (' + e.message + ')'; return false; }
}
function websiteBackend(code) {
  const req = async (qs, opts = {}) => {
    // the code also travels in the address: some free hosts drop custom headers
    const url = SERVER_URL() + '?' + qs + '&k=' + encodeURIComponent(code) + '&t=' + Date.now();
    const r = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...opts, headers: { 'X-Riffbook-Key': code, ...(opts.headers || {}) } });
    if (!r.ok) {
      let msg = r.status + '';
      try { const j = await r.clone().json(); if (j.error) msg = j.error; } catch { msg += ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 100); }
      throw new Error('Website sync: ' + msg);
    }
    const ct = r.headers.get('content-type') || '';
    if (/text\/html/i.test(ct)) throw new Error('Website sync: the server returned a web page instead of data (hosting protection?)');
    return r;
  };
  return {
    name: 'website',
    refKey: 'srvAt',
    async getLib() { const r = await req('a=lib'); const t = await r.text(); return t && t !== 'null' ? JSON.parse(t) : null; },
    async putLib(obj) { await req('a=lib', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }); },
    async getFile(rec) { return (await req('a=file&id=' + encodeURIComponent(rec.id))).arrayBuffer(); },
    async putFile(rec) { await req('a=file&id=' + encodeURIComponent(rec.id), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: rec.data }); return rec.dataAt || Date.now(); },
    async delFile(rec) { await req('a=del&id=' + encodeURIComponent(rec.id), { method: 'POST' }); },
  };
}

// ---------------- Google Drive backend ----------------
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GAPI = 'https://www.googleapis.com/drive/v3';
const GUP = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = CFG.DRIVE_FOLDER || 'Riffbook';
let token = null, tokenExpires = 0, gisLoaded = null;

export const hasGoogleToken = () => token && Date.now() < tokenExpires - 60000;

function loadGis() {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = () => { gisLoaded = null; reject(new Error('Could not load the Google sign-in library (no internet?)')); };
    document.head.appendChild(s);
  });
  return gisLoaded;
}

export async function googleConnect(clientId) {
  if (!clientId) throw new Error('Paste the Google client ID first');
  if (hasGoogleToken()) return token;
  await loadGis();
  return new Promise((resolve, reject) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        token = resp.access_token;
        tokenExpires = Date.now() + (resp.expires_in || 3600) * 1000;
        resolve(token);
      },
      error_callback: (err) => reject(new Error(err && err.type ? err.type : 'sign-in cancelled')),
    });
    tc.requestAccessToken({ prompt: '' });
  });
}
export function googleDisconnect() {
  if (token && window.google) window.google.accounts.oauth2.revoke(token, () => {});
  token = null;
}

function googleBackend() {
  const api = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
    if (!r.ok) {
      if (r.status === 401) token = null;
      throw new Error('Google Drive: ' + r.status + ' ' + (await r.text()).slice(0, 160));
    }
    return r;
  };
  const findFile = async (name, parent, mime) => {
    let q = `name='${name.replace(/'/g, "\\'")}' and trashed=false`;
    if (parent) q += ` and '${parent}' in parents`;
    if (mime) q += ` and mimeType='${mime}'`;
    const r = await api(`${GAPI}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const j = await r.json();
    return j.files && j.files[0];
  };
  const uploadNew = async (name, parent, blob, mime) => {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name, parents: [parent] })], { type: 'application/json' }));
    form.append('file', new Blob([blob], { type: mime }));
    const r = await api(`${GUP}/files?uploadType=multipart&fields=id`, { method: 'POST', body: form });
    return (await r.json()).id;
  };
  const uploadUpdate = (id, blob, mime) => api(`${GUP}/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: blob });
  const download = async (id) => (await api(`${GAPI}/files/${id}?alt=media`)).arrayBuffer();
  const safe = (s) => String(s || 'song').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
  let folder = null, libId = null;
  const ensureFolder = async () => {
    if (folder) return folder;
    const cached = await db.getSetting('driveFolderId');
    if (cached) { try { await api(`${GAPI}/files/${cached}?fields=id`); folder = cached; return folder; } catch { /* recreate */ } }
    const mime = 'application/vnd.google-apps.folder';
    let f = await findFile(FOLDER, null, mime);
    if (!f) f = await (await api(`${GAPI}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER, mimeType: mime }) })).json();
    await db.setSetting('driveFolderId', f.id);
    folder = f.id;
    return folder;
  };
  return {
    name: 'google',
    refKey: 'driveFileId',
    async getLib() {
      const fo = await ensureFolder();
      const f = await findFile('library.json', fo);
      if (!f) return null;
      libId = f.id;
      try { return JSON.parse(new TextDecoder().decode(await download(f.id))); } catch { return null; }
    },
    async putLib(obj) {
      const fo = await ensureFolder();
      const body = new Blob([JSON.stringify(obj)], { type: 'application/json' });
      if (libId) await uploadUpdate(libId, body, 'application/json');
      else libId = await uploadNew('library.json', fo, body, 'application/json');
    },
    async getFile(rec) { return download(rec.driveFileId); },
    async putFile(rec) {
      const fo = await ensureFolder();
      const mime = 'application/octet-stream';
      if (rec.driveFileId) {
        try { await uploadUpdate(rec.driveFileId, rec.data, mime); return rec.driveFileId; } catch { /* re-create */ }
      }
      return uploadNew(safe(rec.name) + '.' + rec.ext, fo, rec.data, mime);
    },
    async delFile(rec) { if (rec.driveFileId) { try { await api(`${GAPI}/files/${rec.driveFileId}`, { method: 'DELETE' }); } catch { /* already gone */ } } },
  };
}

// ---------------- generic merge (newest version wins) ----------------
let syncing = false;
const strip = (o) => { const c = { ...o }; delete c.data; return c; };

async function runWith(be, onStatus) {
  onStatus('Syncing…');
  const remote = (await be.getLib()) || { songs: [], portions: [], riffs: [] };
  const out = {};
  let changed = 0;
  for (const store of ['songs', 'portions', 'riffs']) {
    const local = await db.getAll(store, true);
    const L = new Map(local.map((x) => [x.id, x]));
    const R = new Map((remote[store] || []).map((x) => [x.id, x]));
    const merged = [];
    for (const id of new Set([...L.keys(), ...R.keys()])) {
      const l = L.get(id), r = R.get(id);
      if (r && (!l || r.updatedAt > l.updatedAt)) {
        // remote copy is newer → bring it here
        const rec = { ...r };
        if (store === 'songs' && !r.deleted && r.kind === 'file') {
          if (l && l.data && l.dataAt === r.dataAt) rec.data = l.data;
          else { onStatus('Downloading: ' + (r.name || '')); rec.data = await be.getFile(r); }
        }
        await db.put(store, rec, true);
        merged.push(strip(rec));
        changed++;
      } else if (l) {
        // local copy is newer (or missing remotely) → send it
        const rec = { ...l };
        if (store === 'songs') {
          if (rec.deleted) {
            if (r && !r.deleted) { await be.delFile({ ...r, ...rec }); }
          } else if (rec.kind === 'file' && rec.data && (!r || r.dataAt !== rec.dataAt || !rec[be.refKey])) {
            onStatus('Uploading: ' + (rec.name || ''));
            rec[be.refKey] = await be.putFile(rec);
            await db.put(store, rec, true);
            changed++;
          }
        }
        merged.push(strip(rec));
      }
    }
    out[store] = merged;
  }
  out.version = 2;
  out.savedAt = Date.now();
  await be.putLib(out);
  await db.setSetting('lastSync', Date.now());
  onStatus(null);
  return changed;
}

export async function sync(onStatus = () => {}) {
  if (syncing) return 0;
  const cfg = await getConfig();
  if (!cfg.mode) throw new Error('Sync is off');
  syncing = true;
  try {
    let be;
    if (cfg.mode === 'website') {
      if (!cfg.code) throw new Error('Enter a sync code first');
      be = websiteBackend(cfg.code);
    } else {
      if (!hasGoogleToken()) await googleConnect(cfg.clientId);
      be = googleBackend();
    }
    return await runWith(be, onStatus);
  } finally {
    syncing = false;
  }
}
