// Chords and scales for practice: shapes, diagrams (SVG) and generated exercises (alphaTex).
// Frets are listed from the low E string (6) to the high E string (1); -1 = muted string.

const OPEN = [40, 45, 50, 55, 59, 64]; // MIDI notes of the open strings, low E → high E
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export const CHORD_GROUPS = [
  { id: 'major', name: 'Open major', tone: 'acoustic', chords: [
    ['C', [-1, 3, 2, 0, 1, 0]], ['A', [-1, 0, 2, 2, 2, 0]], ['G', [3, 2, 0, 0, 0, 3]], ['E', [0, 2, 2, 1, 0, 0]], ['D', [-1, -1, 0, 2, 3, 2]],
  ] },
  { id: 'minor', name: 'Open minor', tone: 'acoustic', chords: [
    ['Am', [-1, 0, 2, 2, 1, 0]], ['Em', [0, 2, 2, 0, 0, 0]], ['Dm', [-1, -1, 0, 2, 3, 1]],
  ] },
  { id: 'seventh', name: 'Seventh chords', tone: 'acoustic', chords: [
    ['A7', [-1, 0, 2, 0, 2, 0]], ['B7', [-1, 2, 1, 2, 0, 2]], ['C7', [-1, 3, 2, 3, 1, 0]], ['D7', [-1, -1, 0, 2, 1, 2]], ['E7', [0, 2, 0, 1, 0, 0]], ['G7', [3, 2, 0, 0, 0, 1]],
    ['Am7', [-1, 0, 2, 0, 1, 0]], ['Em7', [0, 2, 0, 0, 0, 0]], ['Dm7', [-1, -1, 0, 2, 1, 1]], ['Cmaj7', [-1, 3, 2, 0, 0, 0]], ['Fmaj7', [-1, -1, 3, 2, 1, 0]],
  ] },
  { id: 'sus', name: 'Sus & add', tone: 'acoustic', chords: [
    ['Asus2', [-1, 0, 2, 2, 0, 0]], ['Asus4', [-1, 0, 2, 2, 3, 0]], ['Dsus2', [-1, -1, 0, 2, 3, 0]], ['Dsus4', [-1, -1, 0, 2, 3, 3]], ['Cadd9', [-1, 3, 2, 0, 3, 0]], ['Esus4', [0, 2, 2, 2, 0, 0]],
  ] },
  { id: 'barre', name: 'Barre chords', tone: 'clean', chords: [
    ['F', [1, 3, 3, 2, 1, 1]], ['Fm', [1, 3, 3, 1, 1, 1]], ['G (barre)', [3, 5, 5, 4, 3, 3]], ['Gm', [3, 5, 5, 3, 3, 3]], ['F♯m', [2, 4, 4, 2, 2, 2]],
    ['B♭', [-1, 1, 3, 3, 3, 1]], ['Bm', [-1, 2, 4, 4, 3, 2]], ['B', [-1, 2, 4, 4, 4, 2]], ['Cm', [-1, 3, 5, 5, 4, 3]], ['C♯m', [-1, 4, 6, 6, 5, 4]],
  ] },
  { id: 'power', name: 'Power chords', tone: 'dist', chords: [
    ['E5', [0, 2, 2, -1, -1, -1]], ['F5', [1, 3, 3, -1, -1, -1]], ['G5', [3, 5, 5, -1, -1, -1]], ['A5', [-1, 0, 2, 2, -1, -1]], ['C5', [-1, 3, 5, 5, -1, -1]], ['D5', [-1, -1, 0, 2, 3, -1]],
  ] },
  { id: 'jazz', name: 'Jazz shapes', tone: 'jazz', chords: [
    ['Cmaj7', [-1, 3, 5, 4, 5, -1]], ['Dm7', [-1, 5, 7, 5, 6, -1]], ['G7', [3, -1, 3, 4, 3, -1]], ['Am7', [5, -1, 5, 5, 5, -1]], ['Fmaj7', [1, -1, 2, 2, 1, -1]], ['Bm7♭5', [-1, 2, 3, 2, 3, -1]],
  ] },
];

// Scale shapes: per string (low E → high E) the frets to play, plus the root note (0 = C … 11 = B)
export const SCALES = [
  { id: 'em-pent-open', name: 'E minor pentatonic — open', root: 4, frets: [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]], hint: 'The first scale most players learn' },
  { id: 'am-pent-1', name: 'A minor pentatonic — box 1', root: 9, frets: [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]], hint: 'The rock / blues “home” shape' },
  { id: 'am-pent-2', name: 'A minor pentatonic — box 2', root: 9, frets: [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]] },
  { id: 'am-pent-3', name: 'A minor pentatonic — box 3', root: 9, frets: [[10, 12], [10, 12], [10, 12], [9, 12], [10, 13], [10, 12]] },
  { id: 'am-pent-4', name: 'A minor pentatonic — box 4', root: 9, frets: [[12, 15], [12, 15], [12, 14], [12, 14], [13, 15], [12, 15]] },
  { id: 'am-pent-5', name: 'A minor pentatonic — box 5', root: 9, frets: [[15, 17], [15, 17], [14, 17], [14, 17], [15, 17], [15, 17]] },
  { id: 'a-blues', name: 'A blues scale', root: 9, frets: [[5, 8], [5, 6, 7], [5, 7], [5, 7, 8], [5, 8], [5, 8]], hint: 'Minor pentatonic + the “blue note”' },
  { id: 'e-blues-open', name: 'E blues scale — open', root: 4, frets: [[0, 3], [0, 1, 2], [0, 2], [0, 2, 3], [0, 3], [0, 3]] },
  { id: 'a-minor', name: 'A natural minor', root: 9, frets: [[5, 7, 8], [5, 7, 8], [5, 7], [4, 5, 7], [5, 6, 8], [5, 7, 8]] },
  { id: 'g-major', name: 'G major — 2nd position', root: 7, frets: [[2, 3, 5], [2, 3, 5], [2, 4, 5], [2, 4, 5], [3, 5], [2, 3, 5]] },
  { id: 'c-major', name: 'C major — 7th position', root: 0, frets: [[8, 10], [7, 8, 10], [7, 9, 10], [7, 9, 10], [8, 10], [7, 8]] },
  { id: 'a-harm-minor', name: 'A harmonic minor', root: 9, frets: [[5, 7, 8], [5, 7, 8], [6, 7], [4, 5, 7], [5, 6], [4, 5, 7, 8]], hint: 'Neo-classical metal sound' },
  { id: 'chromatic', name: 'Chromatic 1-2-3-4 (warm-up)', root: -1, frets: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]], hint: 'One finger per fret — finger independence' },
];

export const noteName = (pc) => NOTE[((pc % 12) + 12) % 12];

// ---------- exercises (alphaTex body) ----------
const strNo = (i) => 6 - i; // index 0 (low E) → string 6

function chordTex(frets) {
  const notes = frets.map((f, i) => (f < 0 ? null : `${f}.${strNo(i)}`)).filter(Boolean);
  return '(' + notes.join(' ') + ')';
}
// one chord: four strums
export function chordStrumTex(frets) {
  const c = chordTex(frets);
  return `:4 ${c} ${c} ${c} ${c}`;
}
// practice changes: each chord 1 bar (4 strums), the whole list twice
export function changesTex(list) {
  const bars = list.map(([, f]) => chordStrumTex(f));
  return [...bars, ...bars].join(' | ');
}
// scale up and down in eighth notes, rests to fill the last bar
export function scaleTex(scale) {
  const up = [];
  scale.frets.forEach((fs, i) => fs.forEach((f) => up.push(`${f}.${strNo(i)}`)));
  const notes = [...up, ...up.slice(0, -1).reverse()];
  while (notes.length % 8) notes.push('r');
  const bars = [];
  for (let i = 0; i < notes.length; i += 8) bars.push(':8 ' + notes.slice(i, i + 8).join(' '));
  return bars.join(' | ');
}

// ---------- diagrams ----------
export function chordSvg(frets, size = 96) {
  const played = frets.filter((f) => f > 0);
  const max = played.length ? Math.max(...played) : 0;
  const minF = played.length ? Math.min(...played) : 1;
  const base = max > 4 ? minF : 1;
  const W = 100, H = 118, x0 = 16, x1 = 84, y0 = 26, rows = 5, fh = 17;
  const sx = (i) => x0 + (i * (x1 - x0)) / 5;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${size}" height="${(size * H) / W}" aria-hidden="true">`;
  // nut or fret number
  if (base === 1) s += `<rect x="${x0 - 1}" y="${y0 - 4}" width="${x1 - x0 + 2}" height="4" fill="currentColor"/>`;
  else s += `<text x="${x0 - 5}" y="${y0 + fh * 0.7}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${base}</text>`;
  for (let r = 0; r <= rows; r++) s += `<line x1="${x0}" x2="${x1}" y1="${y0 + r * fh}" y2="${y0 + r * fh}" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2"/>`;
  for (let i = 0; i < 6; i++) s += `<line x1="${sx(i)}" x2="${sx(i)}" y1="${y0}" y2="${y0 + rows * fh}" stroke="currentColor" stroke-opacity=".55" stroke-width="${1 + (5 - i) * 0.25}"/>`;
  // barre: same lowest fret on 3+ strings across from the low side
  const barreFret = played.length ? minF : 0;
  const idx = frets.map((f, i) => (f === barreFret ? i : -1)).filter((i) => i >= 0);
  if (barreFret > 0 && idx.length >= 3 && frets.slice(idx[0]).every((f) => f < 0 || f >= barreFret)) {
    const y = y0 + (barreFret - base + 0.5) * fh;
    s += `<rect x="${sx(idx[0]) - 6}" y="${y - 6}" width="${sx(idx[idx.length - 1]) - sx(idx[0]) + 12}" height="12" rx="6" fill="#F2A33A"/>`;
  }
  frets.forEach((f, i) => {
    const x = sx(i);
    if (f < 0) s += `<text x="${x}" y="${y0 - 9}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" opacity=".6">×</text>`;
    else if (f === 0) s += `<circle cx="${x}" cy="${y0 - 13}" r="4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".8"/>`;
    else s += `<circle cx="${x}" cy="${y0 + (f - base + 0.5) * fh}" r="6.5" fill="#F2A33A"/>`;
  });
  return s + '</svg>';
}

export function scaleSvg(scale, width = 220) {
  const all = scale.frets.flat();
  const lo = Math.max(0, Math.min(...all) - (Math.min(...all) > 0 ? 1 : 0));
  const hi = Math.max(...all);
  const n = Math.max(4, hi - lo);
  const W = 30 + n * 34, H = 126, y0 = 12, sh = 17, x0 = 22;
  const fx = (f) => (f === 0 ? x0 - 10 : x0 + (f - lo - 0.5) * 34);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${width}" height="${(width * H) / W}" aria-hidden="true">`;
  for (let i = 0; i < 6; i++) s += `<line x1="${x0}" x2="${W - 4}" y1="${y0 + i * sh}" y2="${y0 + i * sh}" stroke="currentColor" stroke-opacity=".5" stroke-width="${1 + i * 0.22}"/>`;
  for (let k = 0; k <= n; k++) {
    const x = x0 + k * 34;
    s += `<line x1="${x}" x2="${x}" y1="${y0}" y2="${y0 + 5 * sh}" stroke="currentColor" stroke-opacity="${k === 0 && lo === 0 ? 0.9 : 0.3}" stroke-width="${k === 0 && lo === 0 ? 4 : 1.2}"/>`;
    if (k < n) s += `<text x="${x + 17}" y="${H - 3}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".55">${lo + k + 1}</text>`;
  }
  scale.frets.forEach((fs, idx) => {
    const strI = 5 - idx; // draw high E at the top
    fs.forEach((f) => {
      const pc = (OPEN[idx] + f) % 12;
      const root = scale.root >= 0 && pc === scale.root;
      s += `<circle cx="${fx(f)}" cy="${y0 + strI * sh}" r="6.8" fill="${root ? '#F2A33A' : 'currentColor'}" ${root ? '' : 'fill-opacity=".85"'}/>`;
    });
  });
  return s + '</svg>';
}
