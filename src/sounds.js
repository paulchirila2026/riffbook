// Sound banks (SoundFonts) for playback.
// The high-quality bank is split into pieces under 5 MB (free hosts limit file size).
// Pieces are downloaded once, checked (size + header), kept on the device and joined in memory.

const CACHE = 'riffbook-sounds-v1';
const base = () => document.baseURI;

export const BANKS = {
  best: { label: 'High quality (32 MB, once)', manifest: 'lib/sounds/generaluser.json' },
  light: { label: 'Light (1.3 MB)', parts: [{ file: 'lib/alphatab/soundfont/sonivox.sf2', size: 1351896 }] },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openCache() {
  try { return 'caches' in window ? await caches.open(CACHE) : null; } catch { return null; }
}

// Gets one file, from the device cache if it is complete, otherwise from the server (3 tries)
async function getPiece(cache, url, size, log) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      if (cache) {
        const hit = await cache.match(url);
        if (hit) {
          const buf = await hit.arrayBuffer();
          if (!size || buf.byteLength === size) return buf;
          await cache.delete(url);
        }
      }
      const r = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ct = r.headers.get('content-type') || '';
      if (/text\/html/i.test(ct)) throw new Error('the server sent a web page instead of the sound file');
      const buf = await r.arrayBuffer();
      if (size && buf.byteLength !== size) throw new Error(`incomplete download (${buf.byteLength} of ${size} bytes)`);
      if (cache) { try { await cache.put(url, new Response(buf.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch { /* storage full: keep going */ } }
      return buf;
    } catch (e) {
      last = e;
      log && log('warn', `Sound file ${url.split('/').pop()}: ${e.message} — retry ${i + 1}/3`);
      await sleep(700 * (i + 1));
    }
  }
  throw new Error(`Could not load ${url.split('/').pop()}: ${last && last.message}`);
}

function looksLikeSoundFont(u8) {
  const s = (a, b) => String.fromCharCode(...u8.subarray(a, b));
  return u8.length > 12 && s(0, 4) === 'RIFF' && s(8, 12) === 'sfbk';
}

// Returns the whole bank as one Uint8Array. onProgress(loadedBytes, totalBytes)
export async function loadBank(id, onProgress = () => {}, log) {
  const bank = BANKS[id] || BANKS.best;
  let parts = bank.parts;
  if (!parts) {
    const r = await fetch(new URL(bank.manifest, base()).href, { cache: 'no-store' });
    if (!r.ok) throw new Error('Sound list not found (' + r.status + ')');
    const m = await r.json();
    const dir = bank.manifest.replace(/[^/]+$/, '');
    parts = m.parts.map((p) => ({ file: dir + p.file, size: p.size }));
  }
  const total = parts.reduce((a, p) => a + p.size, 0);
  const cache = await openCache();
  const out = new Uint8Array(total);
  let done = 0;
  onProgress(0, total);
  for (const p of parts) {
    const buf = await getPiece(cache, new URL(p.file, base()).href, p.size, log);
    out.set(new Uint8Array(buf), done);
    done += buf.byteLength;
    onProgress(done, total);
  }
  if (!looksLikeSoundFont(out)) {
    if (cache) for (const p of parts) await cache.delete(new URL(p.file, base()).href);
    throw new Error('The sound file is damaged — it will be downloaded again next time');
  }
  return out;
}

export async function clearSoundCache() {
  try { await caches.delete(CACHE); } catch { /* */ }
}

export async function cachedSize() {
  const cache = await openCache();
  if (!cache) return 0;
  let n = 0;
  for (const req of await cache.keys()) { const r = await cache.match(req); n += Number(r.headers.get('content-length')) || (await r.clone().arrayBuffer()).byteLength; }
  return n;
}
