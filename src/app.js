const alphaTab = window.alphaTab;
import * as db from './db.js';
import * as sync from './sync.js';
import { BUILTIN_RIFFS, riffToTex, TONES, TUNINGS } from './riffs.js';
import { Tuner, TUNER_TUNINGS, noteToMidi, midiToFreq, freqToMidi, prettyNote } from './tuner.js';
import { TabEditor, FX, docToTex, newDoc } from './editor.js';
import { BANKS, loadBank, clearSoundCache, cachedSize } from './sounds.js';
import { CHORD_GROUPS, SCALES, chordStrumTex, changesTex, scaleTex, chordSvg, scaleSvg } from './theory.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const LIB = new URL('lib/alphatab/', document.baseURI).href;
const isMobile = () => window.matchMedia('(max-width: 899px), (max-height: 500px) and (orientation: landscape)').matches;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- log ----------------
const log = (level, ...args) => window.__rbAdd(level, args.map((a) => (a instanceof Error ? (a.stack || a.message) : typeof a === 'object' ? safeJson(a) : String(a))).join(' '));
function safeJson(o) { try { return JSON.stringify(o); } catch { return String(o); } }
const origError = console.error.bind(console), origWarn = console.warn.bind(console);
console.error = (...a) => { origError(...a); log('error', ...a); };
console.warn = (...a) => { origWarn(...a); log('warn', ...a); };
let errCount = 0, lastErrToast = 0;
window.__rbOnLog = (level) => {
  if (level !== 'error') return;
  errCount++;
  ['#log-count', '#log-count-2'].forEach((id) => { const c = $(id); if (c) { c.hidden = false; c.textContent = errCount; } });
  if (Date.now() - lastErrToast > 6000) { lastErrToast = Date.now(); toast('Something went wrong — details in Settings › Log', 3000); }
};
const prevLogText = () => (window.__rbPrevLog && window.__rbPrevLog.length ? '\n\n--- Previous session ---\n' + window.__rbPrevLog.join('\n') : '');
function showLog() {
  $('#log-box').textContent = (window.__rbLog.join('\n') || 'No errors or warnings so far.') + prevLogText();
  openSheet('sheet-log');
}
$('#log-copy').onclick = async () => {
  const text = `Riffbook log — ${new Date().toISOString()}\n${navigator.userAgent}\n${location.href}\n\n` + window.__rbLog.join('\n') + prevLogText();
  try { await navigator.clipboard.writeText(text); toast('Log copied'); }
  catch { const r = document.createRange(); r.selectNodeContents($('#log-box')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Select the text and copy it (Ctrl+C)'); }
};
$('#log-clear').onclick = () => { window.__rbLog.length = 0; errCount = 0; ['#log-count', '#log-count-2'].forEach((id) => { $(id).hidden = true; }); $('#log-box').textContent = 'No errors or warnings so far.'; };
log('info', 'Riffbook 2.2 starting · alphaTab ' + (alphaTab.meta ? alphaTab.meta.version : '1.8.4') + ' · ' + navigator.userAgent);

const BASS_TONES = [
  { name: 'Electric bass', desc: 'fingered', program: 33 },
  { name: 'Picked bass', desc: 'brighter attack', program: 34 },
  { name: 'Fretless bass', desc: 'soft, singing', program: 35 },
  { name: 'Slap bass', desc: 'funk', program: 36 },
];
const GENRES = ['All', 'Rock', 'Metal', 'Blues', 'Funk', 'Jazz', 'My riffs'];

// ---------------- preferences (Settings ⚙) ----------------
const APP_VERSION = '2.2';
const DEFAULT_PREFS = {
  // display
  defaultView: 'tab',          // 'tab' | 'both' | 'std'
  soundBank: 'best',           // 'best' | 'light'
  keepAwake: true,             // screen stays on while a song is open
  multiRest: true,             // join empty bars into one multi-bar rest
  showLyrics: false,           // text on the score (View › Text on the score)
  showDynamics: false,
  showEffectText: false,
  showSectionNames: true,
  defaultFret: false,
  zoomDesktop: 1, zoomPhone: 0.9,
  barsPerRow: -1,              // -1 = automatic
  scrollMode: 'continuous',    // 'continuous' | 'smooth' | 'off'
  theme: 'dark',               // 'dark' | 'light'
  paper: 'cream',              // 'cream' | 'white' | 'dark'
  focusOnOpen: false,
  // playback
  defaultSpeed: 100,
  autoStep: 5,
  countInDefault: false,
  metroVolume: 100,
  autoLoopSections: true,
  // tracks
  defaultTrack: 'lead',        // 'lead' | 'guitar' | 'first' | 'last'
  hideEmptyTracks: true,
  // library
  sort: 'artist',
  // tuner
  tunerDefault: 'last',        // 'last' or a tuning id
};
let prefs = { ...DEFAULT_PREFS };
async function loadPrefs() {
  prefs = { ...DEFAULT_PREFS, ...((await db.getSetting('prefs')) || {}) };
  // v2 look: library grouped by artist (once; can be changed back in the library)
  if (!prefs.v2) { prefs.v2 = true; prefs.sort = 'artist'; savePrefs(); }
}
function savePrefs() { return db.setSetting('prefs', prefs); }

const state = {
  view: 'songs', source: null, score: null, trackIdx: 0,
  showStd: false, showTab: true, showFret: false, scale: 1,
  speed: 100, loop: false, autoInc: false, metro: false, count: false,
  range: null, lastTick: 0, endTick: 0, playing: false, afterRender: null,
  origPrograms: [], mute: [], solo: [], sections: [],
  songs: [], portions: [], userRiffs: [], riffGenre: 'All',
  previewId: null, editing: null, dirty: false, portionId: null, riffSub: '', reselect: null,
  libTab: 'songs', selecting: null, picked: new Set(), focus: false, trackHasNotes: [],
};

// ---------------- UI helpers ----------------
let toastT;
function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), ms);
}
function openSheet(id) { $('#' + id).hidden = false; }
function closeSheet(id) { $('#' + id).hidden = true; }
$$('.sheet').forEach((s) => s.addEventListener('click', (e) => {
  if (e.target === s || e.target.closest('[data-close]')) s.hidden = true;
}));

// ---------------- alphaTab: main player ----------------
function settingsJson(extra = {}) {
  return {
    core: { fontDirectory: LIB + 'font/', ...(extra.core || {}) },
    display: { staveProfile: 'Tab', scale: state.scale, layoutMode: 'page', ...(extra.display || {}) },
    player: {
      playerMode: 'enabledSynthesizer',
      enableCursor: true, enableUserInteraction: true, scrollOffsetY: -40, ...(extra.player || {}),
    },
  };
}
// which texts are drawn on the score (lyrics, dynamics, effect labels, section names)
const TEXT_GROUPS = {
  showLyrics: { label: 'Lyrics', hint: 'song words under the tab', els: ['EffectLyrics'] },
  showDynamics: { label: 'Dynamics', hint: 'mf, ff, p, crescendo …', els: ['EffectDynamics', 'EffectCrescendo'] },
  showEffectText: { label: 'Effect labels', hint: 'LetRing, P.M., w/ chorus, capo …', els: ['EffectLetRing', 'EffectPalmMute', 'EffectText', 'EffectCapo', 'EffectWahPedal', 'EffectSustainPedal', 'EffectDirections', 'EffectBeatTimer'] },
  showSectionNames: { label: 'Section names', hint: 'Verse, Chorus, Solo …', els: ['EffectMarker'] },
};
function applyScoreTexts(a = api, render = false) {
  const NE = alphaTab.NotationElement;
  for (const [k, g] of Object.entries(TEXT_GROUPS)) for (const el of g.els) if (NE[el] !== undefined) a.settings.notation.elements.set(NE[el], !!prefs[k]);
  a.updateSettings();
  if (render && a === api && state.score) rerender(() => api.render());
}
function hideHeaderElements(a) {
  const NE = alphaTab.NotationElement;
  for (const k of ['ScoreTitle', 'ScoreSubTitle', 'ScoreArtist', 'ScoreAlbum', 'ScoreWords', 'ScoreMusic', 'ScoreWordsAndMusic', 'ScoreCopyright', 'TrackNames', 'GuitarTuning']) {
    a.settings.notation.elements.set(NE[k], false);
  }
  a.updateSettings();
}

const api = new alphaTab.AlphaTabApi($('#at'), settingsJson({ player: { scrollElement: $('#at-wrap') } }));
hideHeaderElements(api);

let fixedRepeats = false;
api.scoreLoaded.on((score) => {
  log('info', `Loaded “${score.title || '(untitled)'}” — ${score.tracks.length} track(s), ${score.masterBars.length} bars`);
  state.score = score;
  state.origPrograms = score.tracks.map((t) => t.playbackInfo.program);
  state.mute = score.tracks.map(() => false);
  state.solo = score.tracks.map(() => false);
  state.trackVol = score.tracks.map(() => 100);
  if (state.source && state.source.type === 'song') {
    const so = state.curSong || state.songs.find((x) => x.id === state.source.id);
    if (so && so.trackVol) for (const [i, v] of Object.entries(so.trackVol)) if (state.trackVol[i] != null) state.trackVol[i] = v;
  }
  state.trackHasNotes = score.tracks.map(trackHasNotes);
  // repeats: some files store an absurd repeat count (the part would loop almost forever)
  const reps = [];
  score.masterBars.forEach((mb) => {
    if (mb.repeatCount > 0) {
      if (mb.repeatCount > 8) { log('warn', `Bar ${mb.index + 1}: repeat ×${mb.repeatCount} in the file — played ×2`); mb.repeatCount = 2; fixedRepeats = true; }
      reps.push(`bar ${mb.index + 1} ×${mb.repeatCount}`);
    }
  });
  if (reps.length) log('info', 'Repeats: ' + reps.join(', '));
  if (fixedRepeats) { fixedRepeats = false; setTimeout(() => api.loadMidiForScore(), 0); }
  if (state.trackIdx >= score.tracks.length) state.trackIdx = 0;
  setProfile();
  applySavedTones(score);
  buildSections(score);
  renderTrackLists();
  clearRange(false);
  $('#p-empty').hidden = true;
  setSubtitle();
  buildFretboard();
});
api.renderStarted.on(() => { $('#p-loading').hidden = false; });
api.renderFinished.on(() => {
  $('#p-loading').hidden = true;
  if (state.afterRender) { const f = state.afterRender; state.afterRender = null; setTimeout(f, 30); }
  else if (state.reselect) { const r = state.reselect; state.reselect = null; setTimeout(() => selectBars(r.a, r.b, false), 30); }
});
api.soundFontLoaded.on(() => log('info', 'Sounds ready in player'));
function applyTrackMix() {
  const sc = state.score;
  if (!sc || !state.trackVol) return;
  // always set every track (the player keeps mute / solo per channel from the previous song)
  api.changeTrackSolo(sc.tracks, false);
  api.changeTrackMute(sc.tracks, false);
  sc.tracks.forEach((t, i) => {
    api.changeTrackVolume([t], (state.trackVol[i] ?? 100) / 100);
    if (state.mute[i]) api.changeTrackMute([t], true);
    if (state.solo[i]) api.changeTrackSolo([t], true);
  });
}
// before another song loads: clear the previous song's mute / solo in the player
// (must run while the old song is still loaded — the player looks tracks up in the current song)
function resetMix(sc) {
  if (!sc || !sc.tracks.length) return;
  try { api.changeTrackSolo(sc.tracks, false); api.changeTrackMute(sc.tracks, false); api.changeTrackVolume(sc.tracks, 1); } catch { /* */ }
}
api.midiLoaded.on(() => { applyTrackMix(); buildMap(); });
// song map on the progress bar: the file's sections (Intro, Verse, Solo …) — tap a name to jump there
function buildMap() {
  const el = $('#p-map');
  const lk = api.tickCache && api.tickCache.masterBars;
  if (!el) return;
  if (!state.score || !lk || !lk.length || !state.sections.length || (state.source && state.source.type === 'riff') || (state.portion && !state.portion.showAll)) { el.innerHTML = ''; $('#progress').classList.remove('has-map'); return; }
  const total = lk[lk.length - 1].end;
  const firstStart = (bar) => { const m = lk.find((x) => x.masterBar.index === bar); return m ? m.start : null; };
  const marks = state.sections.map((sec, k) => ({ k, name: sec.name, t: firstStart(sec.start) })).filter((m) => m.t !== null).sort((a, b) => a.t - b.t);
  el.innerHTML = marks.map((m, i) => {
    const left = (m.t / total) * 100;
    const right = i + 1 < marks.length ? (marks[i + 1].t / total) * 100 : 100;
    return `<button class="pm" data-t="${m.t}" style="left:${left}%;width:${Math.max(0, right - left)}%" title="${esc(m.name)}"><span>${esc(m.name)}</span></button>`;
  }).join('');
  $('#progress').classList.add('has-map');
}
$('#p-map').addEventListener('click', (e) => {
  const b = e.target.closest('.pm');
  if (!b) return;
  e.stopPropagation();
  api.tickPosition = Number(b.dataset.t);
});

// ---------------- sounds (loaded by us: split files, checked, cached on the device) ----------------
const snd = { bytes: null, ready: false, bank: null, loading: null, failed: false };
function sndStatus(txt) {
  const el = $('#snd-status');
  if (!el) return;
  el.hidden = !txt;
  el.textContent = txt || '';
}
function giveSounds(a) {
  if (!snd.bytes || !a) return;
  try { a.loadSoundFont(snd.bytes, false); } catch (e) { log('error', 'Could not give sounds to player: ' + e.message); }
}
function loadSounds(force) {
  if (snd.loading && !force) return snd.loading;
  const want = prefs.soundBank || 'best';
  snd.loading = (async () => {
    const t0 = performance.now();
    try {
      const bytes = await loadBank(want, (d, t) => {
        if (d < t) sndStatus(`Loading sounds… ${(d / 1048576).toFixed(0)} / ${(t / 1048576).toFixed(0)} MB`);
      }, log);
      snd.bytes = bytes; snd.bank = want; snd.failed = false;
      log('info', `Sound bank “${want}” loaded (${(bytes.length / 1048576).toFixed(1)} MB, ${Math.round(performance.now() - t0)} ms)`);
    } catch (e) {
      log('error', 'Sounds: ' + e.message);
      if (want !== 'light') {
        toast('High-quality sounds could not load — using the light sounds');
        try { snd.bytes = await loadBank('light', () => {}, log); snd.bank = 'light'; } catch (e2) { log('error', 'Light sounds: ' + e2.message); }
      }
      if (!snd.bytes) { snd.failed = true; sndStatus('No sounds — tap Play to try again'); snd.loading = null; return; }
    }
    sndStatus('');
    applyVolume(false);
    giveSounds(api);
    if (previewApi) giveSounds(previewApi); else getPreviewApi();
    // both players now hold their own copy: free ours (30 MB less memory on the phone)
    snd.ready = true;
    snd.bytes = null;
  })();
  return snd.loading;
}
// ---------------- audio system (iPhone) ----------------
// “playback”: music plays on the loudspeaker, also with the silent switch on
function setAudioSession(type) { try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch { /* */ } }
setAudioSession('playback');
// replace the players' audio system with a new one (after the tuner, or when it is stuck)
async function freshAudio(why) {
  setAudioSession('playback');
  for (const x of [api, previewApi]) { try { if (x && x.player && x.player.output && x.player.output.source) x.pause(); } catch { /* */ } }
  const old = audioCtx();
  try { old && old.state !== 'closed' && old.close(); } catch { /* */ }
  const fresh = new (window.AudioContext || window.webkitAudioContext)();
  window.__rbCtx = fresh;
  for (const x of [api, previewApi]) if (x && x.player && x.player.output) x.player.output.context = fresh;
  try { await fresh.resume(); } catch { /* */ }
  log('info', `New audio system (${why}): ${fresh.state}`);
}
// after the tuner used the microphone, iPhone may keep the sound on the earpiece: start clean on the next Play
let needFreshAudio = false;
async function beforePlay() {
  if (needFreshAudio) { needFreshAudio = false; await freshAudio('after tuner'); }
  wakeAudio();
}
// ---------------- stuck audio (iPhone) ----------------
// iOS sometimes leaves the audio system “suspended/interrupted”: Play shows pause but nothing moves.
// We check shortly after Play and, if the audio is stuck, give the players a fresh audio system.
function audioCtx() { return window.__rbCtx || (api.player && api.player.output && api.player.output.context); }
function watchAudio(a) {
  const started = performance.now();
  clearTimeout(state.audioWatch);
  state.audioWatch = setTimeout(() => {
    if (a === api ? !state.playing : !state.previewId) return;
    const ctx = audioCtx();
    const moved = (state.lastPosAt || 0) > started;
    const stuck = (ctx && ctx.state !== 'running') || (!moved && !(a === api && state.count));
    if (!stuck) { state.recoverTries = 0; return; }
    state.recoverTries = (state.recoverTries || 0) + 1;
    if (state.recoverTries > 2) { try { a.pause(); } catch { /* */ } toast('The sound is stuck — close the app completely and open it again', 5000); log('error', 'Audio still stuck after 2 restarts'); state.recoverTries = 0; return; }
    recoverAudio(a, ctx);
  }, 1800);
}
async function recoverAudio(a, ctx) {
  log('warn', `Audio was stuck (state: ${ctx ? ctx.state : 'none'}) — restarting the audio`);
  try { a.pause(); } catch { /* */ }
  try { if (ctx) await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 600))]); } catch { /* */ }
  if (!ctx || ctx.state !== 'running') await freshAudio('stuck');
  setTimeout(() => { try { a.play(); } catch { /* */ } }, 150);
}

// keep the screen on while a song is open (Settings › Display)
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && prefs.keepAwake && 'wakeLock' in navigator && !document.hidden) {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    } else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { log('warn', 'Keep screen on: ' + e.message); }
}
const playerOpen = () => app.classList.contains('playing') || (!isMobile() && state.view === 'songs' && !!state.score);
document.addEventListener('visibilitychange', () => { if (!document.hidden && playerOpen()) keepAwake(true); });
// iPhone stops audio when the app goes to background: wake it on the next touch
function wakeAudio() {
  for (const a of [api, previewApi]) {
    try { if (a && a.player && a.player.output && a.player.output.activate) a.player.output.activate(); } catch { /* */ }
  }
}
document.addEventListener('pointerdown', wakeAudio, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeAudio(); });
api.playerReady.on(() => { $('#t-play').disabled = false; });
api.playerStateChanged.on((e) => {
  state.playing = e.state === 1;
  $('#play-icon').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
  if (state.playing && previewApi && state.previewId) stopPreview();
  if (state.playing) watchAudio(api);
});
api.playerPositionChanged.on((e) => {
  state.lastPosAt = performance.now();
  state.endTick = e.endTick;
  const pct = e.endTick ? (e.currentTick / e.endTick) * 100 : 0;
  $('#progress-bar').style.width = pct + '%';
  if (state.score) $('#t-pos').textContent = `bar ${tickToBar(e.currentTick) + 1} / ${state.score.masterBars.length}`;
  // automatic +5% on each loop
  if (state.playing && state.loop && state.autoInc && e.currentTick + 1920 < state.lastTick && state.speed < 100) {
    setSpeed(Math.min(100, state.speed + prefs.autoStep));
    toast(`Speed: ${state.speed}%`);
  }
  state.lastTick = e.currentTick;
});
api.playedBeatChanged.on((beat) => showBeatOnFretboard(beat));
api.playbackRangeChanged.on((e) => {
  if (!state.score) return;
  if (e.playbackRange) {
    const a = tickToBar(e.playbackRange.startTick);
    const b = tickToBar(Math.max(e.playbackRange.startTick, e.playbackRange.endTick - 1));
    setRange(a, b);
  } else if (state.portion && !state.portion.showAll && !state.leavingPortion) {
    // a tap on the score cleared the range: a saved section must keep playing only its own bars
    const p = state.portion.p;
    const now = performance.now();
    if (now - (state.reapplyAt || 0) < 400) { log('warn', 'Section range was cleared again right away — not re-applying (avoids a loop)'); setRange(null); return; }
    state.reapplyAt = now;
    setTimeout(() => {
      if (!state.portion || state.portion.showAll) return;
      // keep the place the user tapped (setting the range would jump back to the section start)
      const tapped = api.tickPosition;
      selectBars(p.startBar, p.endBar, false);
      const r = api.playbackRange;
      if (r && tapped > r.startTick && tapped < r.endTick) api.tickPosition = tapped;
    }, 0);
  } else {
    setRange(null);
  }
});
api.error.on((e) => { console.error('Player/renderer error:', e); $('#p-loading').hidden = true; });

// Re-render without stale selection markers (alphaTab errors if old markers point at beats that no longer exist)
function rerender(fn) {
  if (state.range) {
    state.reselect = state.range;
    try { api.clearPlaybackRangeHighlight(); } catch { /* */ }
  }
  fn();
}

function subtitle(score, track) {
  const parts = [];
  if (cleanArtist(score.artist)) parts.push(cleanArtist(score.artist));
  if (track) {
    parts.push(track.name || 'Track');
    const tuning = track.staves[0].tuning;
    if (tuning && tuning.length) parts.push(tuningName(tuning));
    if (track.staves[0].capo) parts.push('capo ' + track.staves[0].capo);
  }
  return parts.join(' · ');
}
// The line under the title doubles as the track picker (tap → list of tracks)
function setSubtitle() {
  const el = $('#p-sub');
  const sc = state.score;
  if (!sc) return;
  if (state.source && state.source.type === 'riff') { el.textContent = state.riffSub; el.disabled = true; return; }
  const t = sc.tracks[state.trackIdx];
  const rest = subtitle(sc, t).split(' · ').filter((x) => x !== (t.name || 'Track'));
  el.disabled = false;
  el.innerHTML = `${rest.length ? esc(rest[0]) + ' · ' : ''}<b>${esc(t.name || 'Track ' + (state.trackIdx + 1))}</b>`
    + `<svg width="14" height="14"><use href="#i-caret"/></svg>${rest.length > 1 ? ' · ' + esc(rest.slice(1).join(' · ')) : ''}`;
  el.title = sc.tracks.length > 1 ? `${sc.tracks.length} tracks — tap to switch` : '';
}
$('#p-sub').onclick = () => {
  if (!state.score || (state.source && state.source.type === 'riff')) return;
  openTracks();
};
function openTracks() {
  if (!state.score) { toast('Open a song first'); return; }
  if (state.source && state.source.type === 'riff') { toast('Riffs have a single track'); return; }
  renderTrackLists();
  paintRanges($('#sheet-tracks'));
  openSheet('sheet-tracks');
}
$('#t-tracks').onclick = openTracks;

// ---------------- View sheet (Aa): tab/notation, size, paper, text on the score ----------------
function renderViewSheet() {
  $('#view-texts').innerHTML = Object.entries(TEXT_GROUPS).map(([k, g]) => `<label class="set-row"><span>${g.label}<span class="hint">${g.hint}</span></span><input type="checkbox" class="switch" data-vpref="${k}" ${prefs[k] ? 'checked' : ''}></label>`).join('');
  $$('[data-paperpick]').forEach((b) => b.classList.toggle('on', b.dataset.paperpick === prefs.paper));
  $('#zoom-val-2').textContent = Math.round(curScale() * 100) + '%';
}
function openView() { renderViewSheet(); openSheet('sheet-view'); }
$('#p-aa').onclick = openView;
$('#view-texts').addEventListener('change', (e) => {
  const k = e.target.dataset.vpref;
  if (!k) return;
  prefs[k] = e.target.checked; savePrefs();
  applyScoreTexts(api, true);
});
$$('[data-paperpick]').forEach((b) => b.addEventListener('click', () => {
  prefs.paper = b.dataset.paperpick; savePrefs();
  applyDisplayPrefs(true);
  renderViewSheet();
}));
$('#t-more').onclick = () => openSheet('sheet-more');

function tuningName(t) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (const tt of TUNER_TUNINGS) {
    const mids = tt.notes.map(noteToMidi).reverse();
    if (mids.length === t.length && mids.every((m, i) => m === t[i])) return tt.name;
  }
  const low = t.slice().reverse();
  const nm = (m) => names[m % 12].replace('#', '♯');
  if (low.length === 6) {
    const iv = low.slice(1).map((m, i) => m - low[i]).join(',');
    if (iv === '5,5,5,4,5') return nm(low[0]) + ' Standard';
    if (iv === '7,5,5,4,5') return 'Drop ' + nm(low[0]);
  }
  return low.map(nm).join(' ');
}

// Songs with repeat signs play some bars twice, so the playback time of a bar is not its place in the score.
// alphaTab's tick cache knows the real (played) position of every bar.
function tickToBar(tick, a = api) {
  const lk = a.tickCache && a.tickCache.masterBars;
  if (lk && lk.length) {
    for (const m of lk) if (tick >= m.start && tick < m.end) return m.masterBar.index;
    return tick < lk[0].start ? 0 : lk[lk.length - 1].masterBar.index;
  }
  const mbs = state.score ? state.score.masterBars : [];
  let lo = 0, hi = mbs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (mbs[mid].start <= tick) lo = mid; else hi = mid - 1;
  }
  return Math.max(0, lo);
}
// played ticks for bars a..b (first time bar a is played, up to the next time bar b ends)
function barTicks(a, b, inst = api, score = state.score) {
  const lk = inst.tickCache && inst.tickCache.masterBars;
  if (lk && lk.length) {
    const s = lk.find((m) => m.masterBar.index === a);
    if (s) {
      const e = lk.find((m) => m.masterBar.index === b && m.start >= s.start) || s;
      return { startTick: s.start, endTick: e.end };
    }
  }
  const mbs = score.masterBars;
  return { startTick: mbs[a].start, endTick: mbs[b].start + mbs[b].calculateDuration() };
}


// ---------------- stave profile (drums have no tab) & visible bars ----------------
function currentProfile() {
  const t = state.score && state.score.tracks[state.trackIdx];
  if (t && isDrums(t)) return 'Score';
  if (!state.showStd && !state.showTab) state.showTab = true;
  return state.showStd && state.showTab ? 'ScoreTab' : state.showStd ? 'Score' : 'Tab';
}
function setProfile() {
  const p = alphaTab.StaveProfile[currentProfile()];
  if (api.settings.display.staveProfile !== p) { api.settings.display.staveProfile = p; api.updateSettings(); }
}
// A saved section shows only its own bars, unless "Show whole song" is on
function applyDisplayRange() {
  const d = api.settings.display;
  const pv = state.portion;
  if (pv && !pv.showAll) { d.startBar = pv.p.startBar + 1; d.barCount = pv.p.endBar - pv.p.startBar + 1; }
  else { d.startBar = 1; d.barCount = -1; }
  api.updateSettings();
}

// ---------------- which track to open ----------------
function trackHasNotes(t) {
  for (const st of t.staves) for (const bar of st.bars) for (const v of bar.voices) for (const b of v.beats) if (b.notes && b.notes.length) return true;
  return false;
}
const isGuitarProgram = (p) => p >= 24 && p <= 31;
function chooseTrack(score, song) {
  const tracks = score.tracks;
  const ok = (t) => !isDrums(t) && trackHasNotes(t);
  if (prefs.defaultTrack === 'last' && song && song.lastTrack != null && tracks[song.lastTrack]) return song.lastTrack;
  if (prefs.defaultTrack === 'first') { const i = tracks.findIndex(ok); return i >= 0 ? i : 0; }
  const guitars = tracks.map((t, i) => ({ t, i })).filter(({ t }) => ok(t) && isGuitarProgram(t.playbackInfo.program) && !/vocal|voice|voce|bass|bas\b/i.test(t.name || ''));
  if (prefs.defaultTrack === 'lead') {
    const lead = guitars.find(({ t }) => /solo|lead/i.test(t.name || ''));
    if (lead) return lead.i;
  }
  if (guitars.length) return guitars[0].i;
  const any = tracks.findIndex((t) => ok(t) && !/vocal|voice/i.test(t.name || ''));
  return any >= 0 ? any : 0;
}

// ---------------- sources: songs, riffs, saved sections ----------------
function texFor(r) {
  const tex = r.doc ? docToTex(r.doc) : riffToTex(r);
  const tone = TONES.find((t) => t.id === (r.tone || (r.doc && r.doc.tone))) || TONES[0];
  return tex.replace('\\tempo', `\\instrument ${tone.program} \\tempo`);
}

function showPlayer() {
  // remember where the player was opened from (Riffs / Chords / Scales) to go back there
  state.returnTo = state.view === 'riffs' ? 'riffs' : null;
  go('songs');
  keepAwake(true);
  app.classList.add('playing');
  if (isMobile() && history.state !== 'player') history.pushState('player', '');
}

// riffs, chords and scales are short: show them bigger than songs
function useScaleFor(kind) {
  const want = kind === 'riff' ? (prefs.riffZoom || (isMobile() ? 1 : 1.15)) : state.scale;
  $('#zoom-val-2').textContent = Math.round(want * 100) + '%';
  if (api.settings.display.scale !== want) { api.settings.display.scale = want; api.updateSettings(); }
}
async function openSong(song, after) {
  useScaleFor('song');
  resetMix(state.score);
  if (countIn.active) cancelCountIn();
  if (state.playing) api.stop();
  try { api.clearPlaybackRangeHighlight(); } catch { /* */ }
  api.playbackRange = null;
  if (pick.on) setPick(false);
  state.source = { type: 'song', id: song.id };
  state.curSong = song;
  // nothing from the previous song carries over: pending re-selection, loop, speed-up per loop
  state.reselect = null; state.lastTick = 0;
  if (!state.openingPortion) {
    state.portion = null; state.portionId = null;
    if (state.loop) setLoop(false);
    if (state.autoInc) { state.autoInc = false; setPressed(['t-auto', 't-auto-2'], false); }
  }
  applyDisplayRange();
  state.afterRender = after || null;
  $('#p-title').textContent = songTitle(song);
  $('#p-sub').textContent = '';
  $('#p-loading').hidden = false;
  $('#p-edit').hidden = song.kind !== 'doc';
  $('#p-edit-2').hidden = song.kind !== 'doc';
  showPlayer();
  if (!state.openingPortion) { setSpeed(prefs.defaultSpeed); }
  if (prefs.focusOnOpen && !isMobile()) setFocus(true);
  song.lastOpened = Date.now();
  db.put('songs', song, true);
  const inList = state.songs.find((x) => x.id === song.id);
  if (inList) inList.lastOpened = song.lastOpened;
  try {
    if (song.kind === 'doc') { state.trackIdx = 0; api.tex(texFor({ doc: song.doc, tone: song.doc.tone })); }
    else {
      const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(song.data), api.settings);
      state.trackIdx = state.openingPortion && song.lastTrack != null ? song.lastTrack : chooseTrack(score, song);
      if (state.trackIdx >= score.tracks.length) state.trackIdx = 0;
      // long stretches of empty bars become one “multi-bar rest” (like Guitar Pro)
      if (prefs.multiRest && score.stylesheet) {
        score.stylesheet.perTrackMultiBarRest = new Set(score.tracks.map((t, i) => i));
        score.stylesheet.multiTrackMultiBarRest = true;
      }
      api.renderScore(score, [state.trackIdx]);
    }
  } catch (err) {
    console.error('Could not open song', song.name, err);
    $('#p-loading').hidden = true;
  }
  markActive();
  db.setSetting('lastSource', state.source);
}

function openRiff(r, after) {
  useScaleFor('riff');
  resetMix(state.score);
  if (countIn.active) cancelCountIn();
  if (state.playing) api.stop();
  try { api.clearPlaybackRangeHighlight(); } catch { /* */ }
  api.playbackRange = null;
  if (pick.on) setPick(false);
  stopPreview();
  state.source = { type: 'riff', id: r.id };
  state.curSong = null;
  state.reselect = null; state.lastTick = 0;
  if (!state.openingPortion) {
    if (state.loop) setLoop(false);
    if (state.autoInc) { state.autoInc = false; setPressed(['t-auto', 't-auto-2'], false); }
  }
  if (!state.openingPortion) { state.portion = null; state.portionId = null; }
  applyDisplayRange();
  state.trackIdx = 0;
  state.afterRender = after || null;
  $('#p-title').textContent = r.name;
  state.riffSub = [r.genre, r.style, r.bpm + ' BPM'].filter(Boolean).join(' · ');
  $('#p-loading').hidden = false;
  $('#p-edit').hidden = !r.user;
  $('#p-edit-2').hidden = !r.user;
  showPlayer();
  api.tex(texFor(r));
  if (!state.openingPortion) setSpeed(prefs.defaultSpeed);
  markActive();
}

function allRiffs() { return [...BUILTIN_RIFFS, ...state.userRiffs.map((r) => ({ ...r, user: true }))]; }

async function openPortion(p, clip = false) {
  log('info', `Open ${clip ? 'riff' : 'section'} “${p.name}” (bars ${p.startBar + 1}–${p.endBar + 1})`);
  const after = () => {
    selectBars(p.startBar, p.endBar);
    setSpeed(p.speed || 100);
    setLoop(!!prefs.autoLoopSections);
  };
  state.portionId = p.id;
  state.portion = { p, showAll: false, clip };
  state.openingPortion = true;
  try {
    if (p.source.type === 'song') {
      const s = await db.get('songs', p.source.id);
      if (!s || s.deleted) { toast('The original song no longer exists'); state.portion = null; return; }
      s.lastTrack = p.trackIdx || 0;
      await openSong(s, after);
    } else {
      const r = allRiffs().find((x) => x.id === p.source.id);
      if (r) openRiff(r, after);
    }
  } finally { state.openingPortion = false; }
  markActive();
}

function markActive() {
  $$('#song-list .item').forEach((el) => el.classList.toggle('on', !!state.source && state.source.type === 'song' && el.dataset.id === state.source.id && !state.portionId));
  $$('#portion-list .item').forEach((el) => el.classList.toggle('on', el.dataset.id === state.portionId));
}

// ---------------- tracks & sounds ----------------
function isDrums(t) { return t.staves[0].isPercussion || t.playbackInfo.primaryChannel === 9; }
function isBass(prog) { return prog >= 32 && prog <= 39; }

function toneLabel(i) {
  const t = state.score.tracks[i];
  if (isDrums(t)) return 'Drums';
  const p = t.playbackInfo.program;
  const known = TONES.find((x) => x.program === p) || BASS_TONES.find((x) => x.program === p);
  if (p === state.origPrograms[i]) return 'Original' + (known ? ' · ' + known.name : '');
  return known ? known.name : 'Program ' + p;
}

function renderTrackLists() {
  const sc = state.score;
  if (!sc) return;
  const hidden = prefs.hideEmptyTracks ? sc.tracks.filter((t, i) => !state.trackHasNotes[i] && i !== state.trackIdx).length : 0;
  const html = sc.tracks.map((t, i) => (prefs.hideEmptyTracks && !state.trackHasNotes[i] && i !== state.trackIdx) ? '' : `
    <div class="trk ${i === state.trackIdx ? 'cur' : ''} ${state.trackHasNotes[i] ? '' : 'empty'}" data-i="${i}">
      <div class="txt">
        <span class="n" data-act="show" title="Show this track">${esc(t.name || 'Track ' + (i + 1))}</span>
        <button class="tone" data-act="tone" ${isDrums(t) ? 'disabled' : ''}>${esc(toneLabel(i))}${isDrums(t) ? '' : ' ▾'}</button>
      </div>
      <button class="ms ${state.mute[i] ? 'on' : ''}" data-act="mute" aria-label="Mute" title="Mute">M</button>
      <button class="ms ${state.solo[i] ? 'on' : ''}" data-act="solo" aria-label="Solo" title="Solo (only this track)">S</button>
      <label class="tvol" title="Volume of this track"><svg width="13" height="13"><use href="#i-vol"/></svg>
        <input type="range" class="rng" min="0" max="150" step="5" value="${state.trackVol[i]}" data-tv="${i}" aria-label="Volume of ${esc(t.name || 'track ' + (i + 1))}" style="--p:${state.trackVol[i] / 1.5}%">
        <span class="tv-val">${state.trackVol[i]}%</span></label>
    </div>`).join('') + (hidden ? `<div class="empty-note">${hidden} empty track${hidden > 1 ? 's' : ''} hidden (Settings › Tracks)</div>` : '');
  $$('.track-list').forEach((el) => { el.innerHTML = html; });
}

function onTrackClick(e) {
  const row = e.target.closest('.trk');
  const act = e.target.closest('[data-act]');
  if (!row || !act || !state.score) return;
  const i = Number(row.dataset.i);
  const t = state.score.tracks[i];
  switch (act.dataset.act) {
    case 'show':
      state.trackIdx = i;
      setProfile();
      rerender(() => api.renderTracks([t]));
      setSubtitle();
      buildFretboard();
      saveLastTrack(i);
      closeSheet('sheet-tracks');
      break;
    case 'tone': openTonePicker(i); break;
    case 'mute': state.mute[i] = !state.mute[i]; api.changeTrackMute([t], state.mute[i]); break;
    case 'solo': state.solo[i] = !state.solo[i]; api.changeTrackSolo([t], state.solo[i]); break;
  }
  renderTrackLists();
}
$$('.track-list').forEach((el) => {
  el.addEventListener('click', onTrackClick);
  el.addEventListener('input', (e) => {
    const r = e.target.closest('[data-tv]');
    if (!r || !state.score) return;
    const i = Number(r.dataset.tv), v = Number(r.value);
    state.trackVol[i] = v;
    api.changeTrackVolume([state.score.tracks[i]], v / 100);
    $$(`.track-list [data-tv="${i}"]`).forEach((x) => { if (x !== r) x.value = v; x.style.setProperty('--p', v / 1.5 + '%'); x.nextElementSibling.textContent = v + '%'; });
    clearTimeout(state.tvTimer);
    state.tvTimer = setTimeout(async () => {
      if (!state.source || state.source.type !== 'song') return;
      const so = await db.get('songs', state.source.id);
      if (so) { so.trackVol = Object.fromEntries(state.trackVol.map((x, k) => [k, x]).filter(([, x]) => x !== 100)); await db.put('songs', so); for (const c of [state.curSong, state.songs.find((x) => x.id === so.id)]) if (c && c.id === so.id) c.trackVol = so.trackVol; }
    }, 500);
  });
});

async function saveLastTrack(i) {
  if (state.source && state.source.type === 'song') {
    const s = await db.get('songs', state.source.id);
    if (s) { s.lastTrack = i; await db.put('songs', s); }
  }
}

function openTonePicker(i) {
  const t = state.score.tracks[i];
  if (isDrums(t)) return;
  const bass = isBass(state.origPrograms[i]);
  const list = [...(bass ? BASS_TONES : TONES), { name: 'Original from file', desc: 'the sound chosen in Guitar Pro', program: state.origPrograms[i] }];
  $('#tone-title').textContent = 'Sound · ' + (t.name || 'Track ' + (i + 1));
  $('#tone-options').innerHTML = list.map((o, k) => `
    <button class="tone-opt ${t.playbackInfo.program === o.program ? 'on' : ''}" data-k="${k}">
      <span><span class="n">${esc(o.name)}</span><span class="d">${esc(o.desc)}</span></span>
      <span class="m">${t.playbackInfo.program === o.program ? 'active' : ''}</span>
    </button>`).join('');
  $('#tone-options').onclick = (e) => {
    const b = e.target.closest('.tone-opt');
    if (!b) return;
    setTrackProgram(i, list[Number(b.dataset.k)].program);
    closeSheet('sheet-tone');
  };
  openSheet('sheet-tone');
}

// Guitar Pro files also switch instruments inside the song (automations); change those too,
// otherwise the file's own sound comes back on the first beat.
function setProgramEverywhere(t, program) {
  t.playbackInfo.program = program;
  const INSTR = alphaTab.model.AutomationType.Instrument;
  for (const st of t.staves) for (const bar of st.bars) for (const v of bar.voices) for (const b of v.beats) {
    if (b.automations) for (const a of b.automations) if (a.type === INSTR) {
      if (a.rbOrig == null) a.rbOrig = a.value;
      a.value = program === state.origPrograms[t.index] ? a.rbOrig : program;
    }
  }
}
async function setTrackProgram(i, program) {
  const t = state.score.tracks[i];
  setProgramEverywhere(t, program);
  api.loadMidiForScore();
  renderTrackLists();
  const src = state.source;
  if (!src) return;
  if (src.type === 'song') {
    const s = await db.get('songs', src.id);
    if (s) {
      s.tones = s.tones || {}; s.tones[i] = program; await db.put('songs', s);
      for (const c of [state.curSong, state.songs.find((x) => x.id === s.id)]) if (c && c !== s) c.tones = { ...s.tones };
    }
  } else {
    const saved = (await db.getSetting('riffTones', {})) || {};
    saved[src.id] = program;
    await db.setSetting('riffTones', saved);
  }
}

async function applySavedTones(score) {
  const src = state.source;
  if (!src) return;
  let changed = false;
  if (src.type === 'song') {
    const s = state.curSong || state.songs.find((x) => x.id === src.id);
    if (s && s.tones) for (const [i, p] of Object.entries(s.tones)) {
      if (score.tracks[i]) { setProgramEverywhere(score.tracks[i], p); changed = true; }
    }
  } else {
    const saved = (await db.getSetting('riffTones', {})) || {};
    if (saved[src.id] != null && score.tracks[0]) { setProgramEverywhere(score.tracks[0], saved[src.id]); changed = true; }
  }
  if (changed) { api.loadMidiForScore(); renderTrackLists(); }
}

// ---------------- sections & selection (saved sections) ----------------
function buildSections(score) {
  const secs = [];
  score.masterBars.forEach((mb, i) => {
    if (mb.section) secs.push({ name: (mb.section.text || mb.section.marker || 'Section').trim(), start: i });
  });
  secs.forEach((s, k) => { s.end = k + 1 < secs.length ? secs[k + 1].start - 1 : score.masterBars.length - 1; });
  state.sections = secs;
  const html = secs.map((s, k) => `<button class="chip" data-sec="${k}">${esc(s.name)}</button>`).join('');
  $('#p-sections').innerHTML = secs.length ? '<span class="lbl">Sections:</span>' + html : '';
  $('#p-sections').hidden = !secs.length;
  $('#m-sections').innerHTML = html;
  $('#m-sections-sec').hidden = !secs.length;
}
function onSectionClick(e) {
  const b = e.target.closest('[data-sec]');
  if (!b) return;
  const s = state.sections[Number(b.dataset.sec)];
  selectBars(s.start, s.end);
  closeSheet('sheet-more');
}
$('#p-sections').addEventListener('click', onSectionClick);
$('#m-sections').addEventListener('click', onSectionClick);

function selectBars(a, b, moveCursor = true) {
  const sc = state.score;
  if (!sc) return;
  a = Math.max(0, Math.min(a, sc.masterBars.length - 1));
  b = Math.max(a, Math.min(b, sc.masterBars.length - 1));
  const { startTick, endTick } = barTicks(a, b);
  api.playbackRange = { startTick, endTick };
  const bars = sc.tracks[state.trackIdx].staves[0].bars;
  const firstBeat = (bar) => bar && bar.voices[0] && bar.voices[0].beats[0];
  const lastBeat = (bar) => bar && bar.voices[0] && bar.voices[0].beats[bar.voices[0].beats.length - 1];
  const sb = firstBeat(bars[a]), eb = lastBeat(bars[b]);
  // a saved section shown on its own needs no highlight (everything on screen is the section)
  const whole = state.portion && !state.portion.showAll && a === state.portion.p.startBar && b === state.portion.p.endBar;
  if (whole) { try { api.clearPlaybackRangeHighlight(); } catch { /* */ } }
  else if (sb && eb) { try { api.highlightPlaybackRange(sb, eb); } catch { /* no visual markers */ } }
  if (moveCursor) api.tickPosition = startTick;
  setRange(a, b);
}

function setRange(a, b) {
  setRangeUi(a, b);
  loopLabel();
  $('#cut-riff').hidden = !state.range || !state.source || state.source.type !== 'song' || !!(state.portion && (state.portion.clip || $('#p-cut').classList.contains('slim')));
}
function setRangeUi(a, b) {
  const pv = state.portion;
  if (a === null || a === undefined) {
    state.range = null;
    $$('[data-sec]').forEach((x) => x.classList.remove('on'));
    if (!pv) { $('#p-cut').hidden = true; return; }
  } else {
    state.range = { a, b };
    $$('[data-sec]').forEach((x) => { const s = state.sections[Number(x.dataset.sec)]; x.classList.toggle('on', s.start === a && s.end === b); });
  }
  const r = state.range;
  $('#p-cut').hidden = false;
  if (pv) {
    const changed = r && (r.a !== pv.p.startBar || r.b !== pv.p.endBar);
    const bars = `${pv.p.startBar + 1}–${pv.p.endBar + 1}`;
    $('#cut-label').textContent = `${pv.clip ? 'Riff' : 'Section'}: ${pv.p.name.includes(bars) ? pv.p.name : pv.p.name + ' · bars ' + bars}` + (changed ? ` → ${r.a + 1}–${r.b + 1}` : '');
    $('#p-cut').classList.toggle('slim', !changed);
    $('#cut-all').hidden = false;
    $('#cut-all').setAttribute('aria-pressed', String(pv.showAll));
    $('#cut-update').hidden = !changed;
    $('#cut-save').hidden = !changed;
    $('#cut-save').textContent = 'Save as new';
  } else {
    const sec = state.sections.find((s) => s.start === r.a && s.end === r.b);
    $('#cut-label').textContent = `Selection: ${sec ? sec.name + ' · ' : ''}bars ${r.a + 1}–${r.b + 1}`;
    $('#p-cut').classList.remove('slim');
    $('#cut-all').hidden = true;
    $('#cut-update').hidden = true;
    $('#cut-save').hidden = false;
    $('#cut-save').textContent = 'Save section';
  }
}

function clearRange(touchApi = true) {
  if (touchApi) {
    api.playbackRange = null;
    try { api.clearPlaybackRangeHighlight(); } catch { /* */ }
  }
  setRange(null);
}
$('#cut-clear').onclick = () => {
  if (state.portion) {
    // leave the saved section: show the whole song again
    state.portion = null; state.portionId = null;
    applyDisplayRange();
    clearRange();
    $('#p-cut').hidden = true;
    if (state.score) rerender(() => api.render());
    markActive();
    return;
  }
  clearRange();
};
$('#cut-all').onclick = () => {
  const pv = state.portion;
  if (!pv) return;
  pv.showAll = !pv.showAll;
  applyDisplayRange();
  buildMap();
  rerender(() => api.render());
  setRange(state.range ? state.range.a : null, state.range ? state.range.b : null);
  if (pv.showAll) toast('Whole song shown — drag across bars to change the section, then “Update section”', 3500);
};
$('#cut-update').onclick = async () => {
  const pv = state.portion;
  if (!pv || !state.range) return;
  const p = { ...pv.p, startBar: state.range.a, endBar: state.range.b, speed: state.speed, trackIdx: state.trackIdx };
  await db.put(pv.clip ? 'riffs' : 'portions', p);
  pv.p = p;
  await refreshLibrary();
  setRange(state.range.a, state.range.b);
  toast('Section updated');
};

$('#cut-save').onclick = async () => {
  if (!state.range || !state.source) return;
  const { a, b } = state.range;
  const sec = state.sections.find((s) => s.start === a && s.end === b);
  const def = `${sec ? sec.name : 'Bars ' + (a + 1) + '–' + (b + 1)} — ${$('#p-title').textContent}`;
  const name = prompt('Name for this section:', def);
  if (!name) return;
  const p = { id: db.uid(), name, source: state.source, startBar: a, endBar: b, speed: state.speed, trackIdx: state.trackIdx };
  await db.put('portions', p);
  state.portionId = p.id;
  if (state.portion) { state.portion = { p, showAll: state.portion.showAll }; setRange(a, b); }
  await refreshLibrary();
  toast('Section saved');
};

// ---------------- range sliders: amber fill up to the thumb ----------------
function paintRange(el) {
  const mn = Number(el.min) || 0, mx = Number(el.max) || 100;
  el.style.setProperty('--p', ((Number(el.value) - mn) / (mx - mn)) * 100 + '%');
}
function paintRanges(root = document) { root.querySelectorAll('input[type=range]').forEach(paintRange); }
document.addEventListener('input', (e) => { if (e.target && e.target.type === 'range') paintRange(e.target); }, true);

// ---------------- choosing bars by tapping (phones can't drag-select) ----------------
const pick = { on: false, first: null };
function setPick(on) {
  pick.on = on; pick.first = null;
  app.classList.toggle('picking', on);
  setPressed(['p-pick', 'm-pick'], on);
  $('#pick-hint').hidden = !on;
  $('#pick-hint span').textContent = 'Tap the first bar';
  closeSheet('sheet-more');
}
$('#p-pick').onclick = () => { if (!state.score) { toast('Open a song first'); return; } setPick(!pick.on); };
$('#m-pick').onclick = () => { if (!state.score) return; setPick(true); };
$('#pick-cancel').onclick = () => setPick(false);
api.beatMouseUp.on((beat) => {
  if (!pick.on || !beat) return;
  const bar = beat.voice.bar.index;
  setTimeout(() => {
    if (pick.first === null) {
      pick.first = bar;
      selectBars(bar, bar, false);
      $('#pick-hint span').textContent = `First bar: ${bar + 1} — now tap the last bar`;
    } else {
      selectBars(Math.min(pick.first, bar), Math.max(pick.first, bar));
      setPick(false);
      if (!state.loop) setLoop(true);
    }
  }, 40);
});

// Save the selected bars of a song as one of “My riffs” (it stays linked to the song file)
$('#cut-riff').onclick = async () => {
  if (!state.range || !state.source || state.source.type !== 'song') return;
  const { a, b } = state.range;
  const sec = state.sections.find((x) => x.start === a && x.end === b);
  const song = $('#p-title').textContent;
  const name = prompt('Name for this riff:', sec ? `${sec.name} — ${song}` : `${song} riff`);
  if (!name) return;
  const mb = state.score.masterBars[a];
  let bpm = state.score.tempo;
  for (let k = 0; k <= a; k++) for (const au of state.score.masterBars[k].tempoAutomations || []) bpm = au.value;
  const r = {
    id: db.uid(), kind: 'clip', name, genre: 'Mine', style: 'from ' + song, level: 'Song', bpm: Math.round(bpm || 120),
    source: { ...state.source }, startBar: a, endBar: b, trackIdx: state.trackIdx, speed: state.speed, created: Date.now(),
  };
  void mb;
  await db.put('riffs', r);
  await refreshLibrary();
  toast('Saved in Riffs › My riffs');
};

// ---------------- transport ----------------
function setSpeed(v) {
  state.speed = v;
  api.playbackSpeed = v / 100;
  $('#t-speed').value = v; $('#t-speed-2').value = v;
  $('#speed-val').textContent = v + '%'; $('#speed-val-2').textContent = v + '%';
  $('#t-speed-m').textContent = v + '%';
  paintRange($('#t-speed')); paintRange($('#t-speed-2'));
}
function setPressed(ids, on) { ids.forEach((id) => { const el = $('#' + id); if (el) el.setAttribute('aria-pressed', String(on)); }); }
function loopLabel() {
  const r = state.range;
  const t = r ? (r.a === r.b ? `Loop bar ${r.a + 1}` : `Loop bars ${r.a + 1}–${r.b + 1}`) : 'Repeat';
  const sp = $('#t-loop span');
  if (sp) sp.textContent = t;
  $('#t-loop').title = r ? 'Play the selected bars again and again' : 'Play the whole song again when it ends (select bars to loop only those)';
}
function setLoop(on) { state.loop = on; api.isLooping = on; setPressed(['t-loop'], on); loopLabel(); }
$('#t-play').onclick = () => {
  if (!state.score) { toast('Open a song or a riff first'); return; }
  if (!snd.ready) { toast('Sounds are still loading…'); if (snd.failed) loadSounds(true); return; }
  if (countIn.active) { cancelCountIn(); return; }
  if (!state.playing && state.count) { (needFreshAudio ? beforePlay() : Promise.resolve()).then(startCountIn); return; }
  if (needFreshAudio && !state.playing) { beforePlay().then(() => api.playPause()); return; }
  wakeAudio();
  api.playPause();
};

// ---------------- count-in (our own: the player's built-in one loses clicks) ----------------
// Clicks are scheduled exactly on the audio clock; the song starts right after the last click.
const countIn = { active: false, timers: [], nodes: [] };
const COUNT_IN_LEAD = 0.1; // the player needs ~0.1 s from “play” until its first sound
function countInParams() {
  const sc = state.score;
  const bar = tickToBar(api.tickPosition || 0);
  const mb = sc.masterBars[Math.min(bar, sc.masterBars.length - 1)];
  let bpm = sc.tempo || 120;
  for (let k = 0; k <= mb.index; k++) for (const a of sc.masterBars[k].tempoAutomations || []) bpm = a.value;
  const num = mb.timeSignatureNumerator || 4, den = mb.timeSignatureDenominator || 4;
  const beat = (60 / bpm) * (4 / den) / Math.max(0.1, state.speed / 100);
  return { num, beat };
}
function clickAt(ctx, t, accent) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = accent ? 1760 : 1175;
  const vol = 0.22 * (audio.muted ? 0 : audio.vol / 100) * (accent ? 1.25 : 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + 0.08);
  countIn.nodes.push(o);
}
async function startCountIn() {
  wakeAudio();
  const ctx = audioCtx() || (window.__rbCtx = new (window.AudioContext || window.webkitAudioContext)());
  try { if (ctx.state !== 'running') await ctx.resume(); } catch { /* */ }
  const { num, beat } = countInParams();
  api.countInVolume = 0;
  countIn.active = true;
  $('#play-icon').setAttribute('href', '#i-pause');
  const t0 = ctx.currentTime + 0.12;
  for (let i = 0; i < num; i++) clickAt(ctx, t0 + i * beat, i === 0);
  const musicAt = t0 + num * beat;
  // measured: from the very start the player needs ~0.1 s more than from the middle of a song
  const lead = (api.tickPosition || 0) > 10 ? COUNT_IN_LEAD - 0.08 : COUNT_IN_LEAD;
  const wait = Math.max(0, (musicAt - lead - ctx.currentTime) * 1000);
  countIn.timers.push(setTimeout(() => { countIn.active = false; countIn.timers = []; countIn.nodes = []; api.play(); }, wait));
}
function cancelCountIn() {
  countIn.timers.forEach(clearTimeout);
  countIn.nodes.forEach((o) => { try { o.stop(); } catch { /* */ } });
  countIn.active = false; countIn.timers = []; countIn.nodes = [];
  $('#play-icon').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
}
$('#t-stop').onclick = () => { if (countIn.active) cancelCountIn(); api.stop(); };
$('#t-loop').onclick = () => setLoop(!state.loop);
$('#t-speed').oninput = (e) => setSpeed(Number(e.target.value));
$('#t-speed-2').oninput = (e) => setSpeed(Number(e.target.value));
$('#t-speed-m').onclick = () => openSheet('sheet-more');
$('#t-tone-m').onclick = () => { if (state.score) openTonePicker(state.trackIdx); };
const toggleAuto = () => { state.autoInc = !state.autoInc; setPressed(['t-auto', 't-auto-2'], state.autoInc); if (state.autoInc && !state.loop) setLoop(true); };
$('#t-auto').onclick = toggleAuto; $('#t-auto-2').onclick = toggleAuto;
const toggleMetro = () => { state.metro = !state.metro; api.metronomeVolume = state.metro ? prefs.metroVolume / 100 : 0; setPressed(['t-metro', 't-metro-2'], state.metro); };
$('#t-metro').onclick = toggleMetro; $('#t-metro-2').onclick = toggleMetro;
const toggleCount = () => { state.count = !state.count; api.countInVolume = 0; setPressed(['t-count', 't-count-2'], state.count); };
$('#t-count').onclick = toggleCount; $('#t-count-2').onclick = toggleCount;
$('#progress').onclick = (e) => {
  if (!state.endTick) return;
  const r = e.currentTarget.getBoundingClientRect();
  api.tickPosition = Math.round(((e.clientX - r.left) / r.width) * state.endTick);
};
$('#p-more').onclick = () => openSheet('sheet-more');

// ---------------- volume ----------------
const audio = { vol: 80, muted: false };
function applyVolume(save = true) {
  // the high-quality sound bank is recorded quieter: boost it so 100% sounds as loud as before
  const boost = snd.bank === 'light' ? 1 : 2.2;
  const v = audio.muted ? 0 : (audio.vol / 100) * boost;
  api.masterVolume = v;
  if (previewApi) previewApi.masterVolume = v;
  $('#t-vol').value = audio.vol; $('#t-vol-2').value = audio.vol;
  $('#vol-val-2').textContent = audio.muted ? 'muted' : audio.vol + '%';
  $$('.vol-icon').forEach((u) => u.setAttribute('href', audio.muted || audio.vol === 0 ? '#i-mute' : '#i-vol'));
  ['t-mute', 't-mute-2'].forEach((id) => { $('#' + id).classList.toggle('muted', audio.muted); $('#' + id).setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute'); });
  paintRange($('#t-vol')); paintRange($('#t-vol-2'));
  if (save) db.setSetting('audio', { ...audio });
}
const toggleMute = () => { audio.muted = !audio.muted; applyVolume(); };
$('#t-mute').onclick = toggleMute; $('#t-mute-2').onclick = toggleMute;
const onVol = (e) => { audio.vol = Number(e.target.value); audio.muted = audio.vol === 0 ? audio.muted : false; applyVolume(); };
$('#t-vol').oninput = onVol; $('#t-vol-2').oninput = onVol;
$('#p-back').onclick = () => { if (history.state === 'player') history.back(); else closePlayer(); };
function closePlayer() {
  if (countIn.active) cancelCountIn();
  if (state.playing) api.playPause();
  app.classList.remove('playing');
  keepAwake(false);
  if (state.returnTo) { const v = state.returnTo; state.returnTo = null; go(v); }
}
window.addEventListener('popstate', () => { if (app.classList.contains('playing') && isMobile()) closePlayer(); });

// ---------------- display: notation / tab / fretboard, zoom ----------------
function saveView() { db.setSetting('view', { showStd: state.showStd, showTab: state.showTab, showFret: state.showFret, scale: state.scale }); }
function applyStaves() {
  setProfile();
  if (state.score) rerender(() => api.render());
  $$('[data-toggle]').forEach((b) => {
    const k = b.dataset.toggle;
    b.classList.toggle('on', k === 'std' ? state.showStd : k === 'tab' ? state.showTab : state.showFret);
  });
  $('#fretboard').hidden = !state.showFret;
  if (state.showFret) buildFretboard();
  saveView();
}
$$('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.toggle;
  if (k === 'std') state.showStd = !state.showStd;
  if (k === 'tab') state.showTab = !state.showTab;
  if (k === 'fret') state.showFret = !state.showFret;
  applyStaves();
}));

const riffOpen = () => !!(state.source && state.source.type === 'riff');
function curScale() { return api.settings.display.scale || state.scale; }
function setScale(s, fromSettings = false) {
  s = Math.round(Math.max(0.5, Math.min(2.5, s)) * 100) / 100;
  if (s === curScale()) return;
  if (riffOpen() && !fromSettings) {
    // riffs / chords / scales keep their own zoom
    prefs.riffZoom = s; savePrefs();
    $('#zoom-val-2').textContent = Math.round(s * 100) + '%';
    api.settings.display.scale = s; api.updateSettings();
    if (state.score) rerender(() => api.render());
    return;
  }
  state.scale = s;
  $('#zoom-val-2').textContent = Math.round(s * 100) + '%';
  api.settings.display.scale = s;
  api.updateSettings();
  if (state.score) rerender(() => api.render());
  saveView();
  // remember the zoom for next time (separately for phone and computer)
  if (isMobile()) prefs.zoomPhone = s; else prefs.zoomDesktop = s;
  savePrefs();
}
$('#zoom-in-2').onclick = () => setScale(curScale() + 0.1);
$('#zoom-out-2').onclick = () => setScale(curScale() - 0.1);
$('#at-wrap').addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setScale(curScale() + (e.deltaY < 0 ? 0.1 : -0.1));
}, { passive: false });
// two-finger pinch zoom on phones
(() => {
  const wrap = $('#at-wrap'), at = $('#at');
  let d0 = 0, ratio = 1;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  wrap.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); ratio = 1; } }, { passive: true });
  wrap.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !d0) return;
    e.preventDefault();
    ratio = Math.max(0.4, Math.min(3, dist(e.touches) / d0));
    at.style.transformOrigin = '0 0';
    at.style.transform = `scale(${ratio})`;
  }, { passive: false });
  wrap.addEventListener('touchend', () => {
    if (!d0) return;
    at.style.transform = '';
    d0 = 0;
    if (Math.abs(ratio - 1) > 0.05) setScale(curScale() * ratio);
  });
})();

// ---------------- fretboard ----------------
let fbDots = null;
function fretCount() { return isMobile() ? 15 : 22; }
function buildFretboard() {
  const fb = $('#fretboard');
  if (!state.showFret || !state.score) { fb.innerHTML = ''; return; }
  const t = state.score.tracks[state.trackIdx];
  const tuning = t.staves[0].tuning || [];
  if (!tuning.length || isDrums(t)) { fb.innerHTML = '<div class="empty-note" style="padding:16px">This track has no fretboard (e.g. drums).</div>'; return; }
  const N = fretCount();
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let h = '<div class="fb-inner"><div class="fb-nut"></div>';
  for (const f of [3, 5, 7, 9, 15, 17, 19, 21]) if (f <= N) h += `<div class="fb-inlay" style="left:${((f - 0.5) / N) * 100}%;top:50%"></div>`;
  if (12 <= N) h += `<div class="fb-inlay" style="left:${(11.5 / N) * 100}%;top:30%"></div><div class="fb-inlay" style="left:${(11.5 / N) * 100}%;top:70%"></div>`;
  for (let f = 1; f <= N; f++) h += `<div class="fb-fret" style="left:${(f / N) * 100}%"></div><div class="fb-num" style="left:${((f - 0.5) / N) * 100}%">${f}</div>`;
  const n = tuning.length;
  tuning.forEach((m, i) => {
    const y = n > 1 ? (i / (n - 1)) * 100 : 50;
    h += `<div class="fb-str" style="top:${y}%;height:${1 + (i / n) * 2}px"></div><div class="fb-lbl" style="top:${y}%">${names[m % 12]}</div>`;
  });
  h += '<div id="fb-dots"></div></div>';
  fb.innerHTML = h;
  fbDots = $('#fb-dots');
}
function showBeatOnFretboard(beat) {
  if (!state.showFret || !fbDots || !beat) return;
  const N = fretCount();
  const n = beat.voice.bar.staff.tuning.length;
  fbDots.innerHTML = beat.notes.map((note) => {
    const i = n - note.string; // 0 = thinnest string (top)
    const y = n > 1 ? (i / (n - 1)) * 100 : 50;
    const f = note.fret;
    if (f > N) return '';
    const x = f === 0 ? 0 : ((f - 0.5) / N) * 100;
    return `<div class="fb-dot" style="left:${x}%;top:${y}%">${note.isDead ? 'x' : f}</div>`;
  }).join('');
}

// ---------------- library ----------------
async function refreshLibrary() {
  state.songs = await db.getAll('songs');
  state.portions = (await db.getAll('portions')).sort((a, b) => a.name.localeCompare(b.name));
  state.userRiffs = await db.getAll('riffs');
  renderLibrary();
  renderRiffs();
}

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  // songs without an artist (“Other”) go last
  artist: (a, b) => (!songArtist(a) - !songArtist(b)) || (songArtist(a) || '').localeCompare(songArtist(b) || '', undefined, { sensitivity: 'base' }) || songTitle(a).localeCompare(songTitle(b)),
  recent: (a, b) => (b.lastOpened || 0) - (a.lastOpened || 0) || a.name.localeCompare(b.name),
  added: (a, b) => (b.dataAt || 0) - (a.dataAt || 0) || a.name.localeCompare(b.name),
};
const chk = '<span class="chk" aria-hidden="true"><svg width="12" height="12"><use href="#i-check"/></svg></span>';

// artist / title: from the file, or from a name like “Artist - Title”
function splitName(s) {
  const n = niceName(s.name || '');
  const m = n.match(/^(.{2,40}?)\s+[-–]\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: n };
}
// “( Metallica )” → “Metallica”
const cleanArtist = (a) => {
  let t = String(a || '').replace(/\s+/g, ' ').trim();
  for (const [o, c] of [['(', ')'], ['[', ']'], ['{', '}'], ['"', '"'], ['“', '”'], ["'", "'"]]) if (t.startsWith(o) && t.endsWith(c) && t.length > 2) t = t.slice(1, -1).trim();
  return t;
};
const songArtist = (s) => cleanArtist(s.artist) || splitName(s).artist;
const songTitle = (s) => (cleanArtist(s.artist) ? niceName(s.name) : splitName(s).title) || s.name;
function initialsTile(text) {
  const words = String(text || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const ini = ((words[0] || '?')[0] + (words[1] ? words[1][0] : (words[0] || '')[1] || '')).toUpperCase();
  let h = 0; for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `<span class="ini" aria-hidden="true" style="--h:${h}">${esc(ini)}</span>`;
}
// file names as titles: “breaking_benjamin_diary_of_jane (2)” → “Breaking Benjamin Diary Of Jane”
function niceName(n) {
  if (!n || !/_|\(\d+\)\s*$/.test(n)) return n;
  let t = n.replace(/\s*\(\d+\)\s*$/, '').replace(/_{2,}/g, ' – ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (t === t.toLowerCase()) t = t.replace(/(^|[\s–-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return t || n;
}
function renderLibrary() {
  const q = $('#lib-search').value.trim().toLowerCase();
  $('#lib-search-x').hidden = !q;
  const sel = state.selecting, picked = state.picked;
  const songs = state.songs.filter((s) => !q || (s.name + ' ' + (s.artist || '')).toLowerCase().includes(q)).sort(SORTS[prefs.sort] || SORTS.name);
  const grouped = prefs.sort === 'artist' && !q;
  const songRow = (s) => {
    const ar = songArtist(s);
    const meta = [grouped ? '' : ar, s.kind === 'doc' ? 'made in the editor' : (s.ext || '').toUpperCase(), s.tracks ? s.tracks + (s.tracks === 1 ? ' track' : ' tracks') : ''].filter(Boolean).join(' · ');
    return `<div class="item song ${s.fav ? 'is-fav' : ''} ${sel === 'songs' && picked.has(s.id) ? 'picked' : ''}" data-id="${s.id}">
      ${chk}${initialsTile(ar || songTitle(s))}
      <div class="txt"><span class="n">${esc(songTitle(s))}</span><span class="d">${esc(meta)}</span></div>
      <button class="fav-btn ${s.fav ? 'on' : ''}" data-fav="songs:${s.id}" aria-label="${s.fav ? 'Remove from favourites' : 'Add to favourites'}"><svg width="17" height="17"><use href="${s.fav ? '#i-star-on' : '#i-star'}"/></svg></button>
      <button class="icon-btn del" data-del="${s.id}" aria-label="Delete"><svg width="16" height="16"><use href="#i-trash"/></svg></button>
    </div>`;
  };
  let html = '';
  if (!q && !sel) {
    const rec = state.songs.filter((x) => x.lastOpened).sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 6);
    if (rec.length) html += `<div class="lib-sub">${isMobile() ? 'CONTINUE' : 'RECENT'}</div><div class="rc-row">${rec.map((x) => `<button class="rc-card" data-id="${x.id}">${initialsTile(songArtist(x) || songTitle(x))}<span class="rc-t">${esc(songTitle(x))}</span><span class="rc-d">${esc(songArtist(x) || (x.ext || '').toUpperCase())}</span></button>`).join('')}</div>`;
  }
  if (grouped) {
    let last = null;
    for (const x of songs) {
      const ar = songArtist(x) || 'Other';
      if (ar !== last) { const n = songs.filter((y) => (songArtist(y) || 'Other') === ar).length; html += `<div class="lib-sub">${esc(ar.toUpperCase())} · ${n}</div>`; last = ar; }
      html += songRow(x);
    }
  } else html += songs.map(songRow).join('');
  $('#song-list').innerHTML = songs.length ? html : `<div class="empty-note">${q ? 'Nothing found.' : 'No songs yet. Click “Import” or drag GP5 / GPX files onto the page.'}</div>`;
  const ps = state.portions;
  $('#portion-list').innerHTML = ps.length ? ps.map((p) => `
    <div class="item portion ${sel === 'sections' && picked.has(p.id) ? 'picked' : ''}" data-id="${p.id}">
      ${chk}
      <div class="txt"><span class="n">${esc(p.name)}</span><span class="d">bars ${p.startBar + 1}–${p.endBar + 1} · ${p.speed || 100}%</span></div>
<button class="fav-btn ${p.fav ? 'on' : ''}" data-fav="portions:${p.id}" aria-label="${p.fav ? 'Remove from favourites' : 'Add to favourites'}"><svg width="18" height="18"><use href="${p.fav ? '#i-star-on' : '#i-star'}"/></svg></button>
      <button class="icon-btn del" data-pdel="${p.id}" aria-label="Delete"><svg width="16" height="16"><use href="#i-trash"/></svg></button>
    </div>`).join('') : '<div class="empty-note">No saved sections yet. In a song, select bars (drag across them or pick a section) and click “Save section”.</div>';
  // favourites: songs first, then saved sections
  const fs = state.songs.filter((x) => x.fav).sort(SORTS.name), fp = ps.filter((x) => x.fav);
  const favRow = (kind, x, d) => `<div class="item song is-fav" data-kind="${kind}" data-id="${x.id}">
      ${kind === 'songs' ? initialsTile(songArtist(x) || songTitle(x)) : '<span class="ini sec-ini" aria-hidden="true" style="--h:35">✂</span>'}
      <div class="txt"><span class="n">${esc(kind === 'songs' ? songTitle(x) : x.name)}</span><span class="d">${esc(d)}</span></div>
      <button class="fav-btn on" data-fav="${kind}:${x.id}" aria-label="Remove from favourites"><svg width="18" height="18"><use href="#i-star-on"/></svg></button></div>`;
  $('#fav-list').innerHTML = (fs.length || fp.length)
    ? (fs.length ? '<div class="fav-sub">SONGS</div>' + fs.map((x) => favRow('songs', x, [songArtist(x), (x.ext || '').toUpperCase()].filter(Boolean).join(' · '))).join('') : '')
      + (fp.length ? '<div class="fav-sub">SECTIONS</div>' + fp.map((x) => favRow('portions', x, `bars ${x.startBar + 1}–${x.endBar + 1} · ${x.speed || 100}%`)).join('') : '')
    : '<div class="empty-note">No favourites yet. Tap ☆ next to a song or a saved section to keep it here.</div>';
  $('#cnt-favs').textContent = fs.length + fp.length || '';
  $('#cnt-songs').textContent = state.songs.length || '';
  $('#cnt-sections').textContent = state.portions.length || '';
  updateSelBars(songs.length, ps.length);
  markActive();
}

// ----- library tabs -----
function setLibTab(tab) {
  if (!['songs', 'sections', 'favs'].includes(tab)) tab = 'songs';
  state.libTab = tab;
  $$('.lib-tabs [data-tab]').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
  $$('.lib-panel').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  if (state.selecting && state.selecting !== tab) stopSelecting();
  db.setSetting('libTab', tab);
}
$$('.lib-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => setLibTab(b.dataset.tab)));

// ----- search -----
$('#lib-search').oninput = renderLibrary;
$('#lib-search-x').onclick = () => { $('#lib-search').value = ''; renderLibrary(); $('#lib-search').focus(); };
$('#lib-search').addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#lib-search').value = ''; renderLibrary(); } });
$('#lib-sort').onchange = (e) => { prefs.sort = e.target.value; savePrefs(); renderLibrary(); };

// ----- select several & delete -----
function updateSelBars(nSongs, nSections) {
  $$('.sel-bar').forEach((bar) => {
    const kind = bar.dataset.for;
    const on = state.selecting === kind;
    const total = kind === 'songs' ? state.songs.length : state.portions.length;
    bar.querySelector('.sel-info').textContent = on
      ? `${state.picked.size} selected`
      : kind === 'songs' ? (total ? `${nSongs === total ? total : nSongs + ' of ' + total} song${total === 1 ? '' : 's'}` : '') : (total ? `${total} section${total === 1 ? '' : 's'}` : '');
    bar.querySelector('.sel-start').hidden = on || !total;
    bar.querySelector('.sel-allbtn').hidden = !on;
    bar.querySelector('.sel-cancel').hidden = !on;
    const del = bar.querySelector('.sel-del');
    del.hidden = !on;
    del.disabled = !state.picked.size;
    del.textContent = state.picked.size ? `Delete ${state.picked.size}` : 'Delete';
    const sort = bar.querySelector('.mini-select');
    if (sort) sort.hidden = on;
  });
  $('#song-list').classList.toggle('selecting', state.selecting === 'songs');
  $('#portion-list').classList.toggle('selecting', state.selecting === 'sections');
}
function stopSelecting() { state.selecting = null; state.picked.clear(); renderLibrary(); }
$$('.sel-bar').forEach((bar) => {
  const kind = bar.dataset.for;
  bar.querySelector('.sel-start').onclick = () => { state.selecting = kind; state.picked.clear(); renderLibrary(); };
  bar.querySelector('.sel-cancel').onclick = stopSelecting;
  bar.querySelector('.sel-allbtn').onclick = () => {
    const ids = $$(kind === 'songs' ? '#song-list .item' : '#portion-list .item').map((el) => el.dataset.id);
    const all = ids.every((id) => state.picked.has(id));
    ids.forEach((id) => (all ? state.picked.delete(id) : state.picked.add(id)));
    renderLibrary();
  };
  bar.querySelector('.sel-del').onclick = async () => {
    const n = state.picked.size;
    if (!n) return;
    if (kind === 'songs') {
      if (!confirm(`Delete ${n} song${n > 1 ? 's' : ''}? Their saved sections are deleted too.`)) return;
      for (const id of state.picked) {
        await db.remove('songs', id);
        for (const p of state.portions.filter((p) => p.source.type === 'song' && p.source.id === id)) await db.remove('portions', p.id);
      }
    } else {
      if (!confirm(`Delete ${n} saved section${n > 1 ? 's' : ''}?`)) return;
      for (const id of state.picked) await db.remove('portions', id);
    }
    state.selecting = null; state.picked.clear();
    await refreshLibrary();
    toast(`${n} deleted`);
  };
});
function togglePick(id) { state.picked.has(id) ? state.picked.delete(id) : state.picked.add(id); renderLibrary(); }

// phone: press and hold a song for favourite / delete
(() => {
  let timer = null, startY = 0;
  const list = $('#song-list');
  list.addEventListener('touchstart', (e) => {
    const it = e.target.closest('.item.song');
    if (!it || state.selecting) return;
    startY = e.touches[0].clientY;
    timer = setTimeout(() => { timer = null; state.longPressAt = Date.now(); openSongActions(it.dataset.id); }, 550);
  }, { passive: true });
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  list.addEventListener('touchmove', (e) => { if (Math.abs(e.touches[0].clientY - startY) > 8) cancel(); }, { passive: true });
  list.addEventListener('touchend', cancel);
  list.addEventListener('contextmenu', (e) => { if (isMobile() && e.target.closest('.item.song')) e.preventDefault(); });
})();
function openSongActions(id) {
  const s = state.songs.find((x) => x.id === id);
  if (!s) return;
  state.actSong = id;
  $('#song-act-title').textContent = songTitle(s);
  $('#song-act-fav span').textContent = s.fav ? 'Remove from favourites' : 'Add to favourites';
  openSheet('sheet-song');
}
$('#song-act-fav').onclick = async () => { closeSheet('sheet-song'); const b = document.createElement('button'); b.dataset.fav = 'songs:' + state.actSong; await toggleFav(b); };
$('#song-act-del').onclick = async () => {
  closeSheet('sheet-song');
  const s = state.songs.find((x) => x.id === state.actSong);
  if (s && confirm(`Delete “${songTitle(s)}”? Its saved sections are deleted too.`)) {
    await db.remove('songs', s.id);
    for (const p of state.portions.filter((p) => p.source.type === 'song' && p.source.id === s.id)) await db.remove('portions', p.id);
    await refreshLibrary();
  }
};
async function toggleFav(btn) {
  const [store, id] = btn.dataset.fav.split(':');
  const rec = await db.get(store, id);
  if (!rec) return;
  rec.fav = !rec.fav;
  await db.put(store, rec);
  const list = store === 'songs' ? state.songs : state.portions;
  const c = list.find((x) => x.id === id);
  if (c) c.fav = rec.fav;
  renderLibrary();
  toast(rec.fav ? 'Added to favourites ★' : 'Removed from favourites');
}
$$('#song-list, #portion-list, #fav-list').forEach((el) => el.addEventListener('click', (e) => {
  const f = e.target.closest('[data-fav]');
  if (f && !state.selecting) { e.stopImmediatePropagation(); toggleFav(f); }
}, true));
$('#fav-list').addEventListener('click', async (e) => {
  const it = e.target.closest('.item');
  if (!it) return;
  if (it.dataset.kind === 'songs') {
    const s = await db.get('songs', it.dataset.id);
    state.portionId = null;
    if (s) openSong(s);
  } else {
    const p = state.portions.find((x) => x.id === it.dataset.id);
    if (p) openPortion(p);
  }
});
$('#song-list').addEventListener('click', async (e) => {
  if (Date.now() - (state.longPressAt || 0) < 600) return;
  const it = e.target.closest('.item, .rc-card');
  if (state.selecting === 'songs') { if (it) togglePick(it.dataset.id); return; }
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    const s = state.songs.find((x) => x.id === del.dataset.del);
    if (s && confirm(`Delete “${s.name}”? Its saved sections are deleted too.`)) {
      await db.remove('songs', s.id);
      for (const p of state.portions.filter((p) => p.source.type === 'song' && p.source.id === s.id)) await db.remove('portions', p.id);
      await refreshLibrary();
    }
    return;
  }
  if (!it) return;
  const s = await db.get('songs', it.dataset.id);
  state.portionId = null;
  if (s) openSong(s);
});
$('#portion-list').addEventListener('click', async (e) => {
  const it = e.target.closest('.item');
  if (state.selecting === 'sections') { if (it) togglePick(it.dataset.id); return; }
  const del = e.target.closest('[data-pdel]');
  if (del) {
    e.stopPropagation();
    if (confirm('Delete this saved section?')) { await db.remove('portions', del.dataset.pdel); await refreshLibrary(); }
    return;
  }
  if (!it) return;
  const p = state.portions.find((x) => x.id === it.dataset.id);
  if (p) openPortion(p);
});

const IMPORT_EXT = ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'xml', 'musicxml', 'capx'];
// demo songs (public-domain pieces, our own arrangements) — added once, when the library is empty
const DEMO_SONGS = ['demo/House of the Rising Sun.gp', 'demo/F%C3%BCr%20Elise.gp', 'demo/Ode to Joy (Rock).gp'];
async function loadDemoSongs(force = false) {
  if (!force && (prefs.demoLoaded || state.songs.length)) return;
  const files = [];
  for (const path of DEMO_SONGS) {
    try {
      const r = await fetch(path.replace(/ /g, '%20'));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      files.push(new File([await r.arrayBuffer()], decodeURIComponent(path.split('/').pop())));
    } catch (e) { log('warn', `Demo song ${path}: ${e.message}`); }
  }
  prefs.demoLoaded = true; savePrefs();
  if (files.length) await importFiles(files, { quiet: true });
}
async function importFiles(files, opts = {}) {
  if (!files.length) return;
  let last = null, ok = 0;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    log('info', `Importing “${f.name}” (${Math.round(f.size / 1024)} KB)`);
    if (!IMPORT_EXT.includes(ext)) {
      console.warn(`Skipped “${f.name}”: not a Guitar Pro / MusicXML file`);
      toast(`“${f.name}” is not a Guitar Pro file`, 3000);
      continue;
    }
    try {
      const buf = await f.arrayBuffer();
      const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buf), api.settings);
      const base = f.name.replace(/\.[^.]+$/, '');
      const song = {
        id: db.uid(), kind: 'file', ext,
        name: (score.title || '').trim() || base,
        artist: (score.artist || '').trim(),
        tracks: score.tracks.length, data: buf, dataAt: Date.now(), tones: {},
      };
      await db.put('songs', song);
      last = song; ok++;
    } catch (err) {
      console.error(`Could not import “${f.name}”:`, err);
      toast(`Can't open “${f.name}” — unknown format or damaged file`, 3500);
    }
  }
  await refreshLibrary();
  if (opts.quiet) { log('info', `${ok} demo song(s) added`); return; }
  if (last) {
    toast(ok > 1 ? `${ok} files imported` : 'Imported: ' + last.name);
    state.portionId = null;
    openSong(last);
  }
}
$('#file-input').onchange = (e) => { importFiles([...e.target.files]); e.target.value = ''; };
$$('.file-input-2').forEach((i) => { i.onchange = (e) => { importFiles([...e.target.files]); e.target.value = ''; }; });

// drag & drop files anywhere on the page
(() => {
  const ov = $('#drop-overlay');
  let depth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; ov.hidden = false; });
  window.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) ov.hidden = true; });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0; ov.hidden = true;
    importFiles([...e.dataTransfer.files]);
  });
})();

// ---------------- navigation ----------------
function go(view) {
  state.view = view;
  app.dataset.view = view;
  $$('[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === view));
  if (view !== 'tuner' && tuner.running) stopTuner();
  const holder = view === 'editor' ? $('#ed-preview-slot') : $('#aux-holder');
  const auxEl = $('#at-aux');
  if (auxEl.parentElement !== holder) holder.appendChild(auxEl);
  if (view === 'editor') { editor.render(); schedulePreview(0); }
  if (view !== 'songs') { app.classList.toggle('playing', false); keepAwake(false); }
  if (view === 'songs' && state.score && !isMobile()) app.classList.add('playing');
}
$$('[data-go]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.go === 'songs' && state.view === 'songs' && isMobile()) { app.classList.remove('playing'); }
  go(b.dataset.go);
}));

// ---------------- helper player (riff previews + editor) ----------------
let previewApi = null;
let previewWantPlay = false;
function getPreviewApi() {
  if (previewApi) return previewApi;
  previewApi = new alphaTab.AlphaTabApi($('#at-aux'), settingsJson({ display: { scale: 0.9 }, player: { enableUserInteraction: false, scrollElement: $('#ed-preview-slot') } }));
  hideHeaderElements(previewApi);
  giveSounds(previewApi);
  previewApi.masterVolume = audio.muted ? 0 : (audio.vol / 100) * (snd.bank === 'light' ? 1 : 2.2);
  previewApi.midiLoaded.on(() => {
    const pr = state.previewRangeBars;
    const t = pr && previewApi.score ? barTicks(pr.a, pr.b, previewApi, previewApi.score) : null;
    previewApi.playbackRange = t;
    if (t) previewApi.tickPosition = t.startTick;
    if (previewWantPlay) { previewWantPlay = false; previewApi.play(); }
  });
  previewApi.playerStateChanged.on((e) => {
    const playing = e.state === 1;
    $('#ed-play-icon').setAttribute('href', playing && state.view === 'editor' ? '#i-stop' : '#i-play');
  });
  previewApi.playerFinished.on(() => stopPreview());
  previewApi.playerStateChanged.on((e) => { if (e.state === 1) watchAudio(previewApi); });
  previewApi.playerPositionChanged.on((e) => {
    state.lastPosAt = performance.now();
    if (!state.previewId) return;
    const bar = $(`.rf[data-id="${state.previewId}"] .bar div`);
    if (bar && e.endTime) bar.style.width = (e.currentTime / e.endTime) * 100 + '%';
  });
  previewApi.error.on((e) => console.error('Preview error:', e));
  return previewApi;
}

function startPreview(r) {
  if (!snd.ready) { toast('Sounds are still loading…'); if (snd.failed) loadSounds(true); return; }
  if (needFreshAudio) { beforePlay().then(() => startPreview(r)); return; }
  wakeAudio();
  if (state.playing) api.playPause();
  const p = getPreviewApi();
  stopPreview();
  state.previewId = r.id;
  renderRiffs();
  previewWantPlay = true;
  previewRange(p, null);
  if (r.kind === 'clip') { previewClip(p, r); return; }
  p.tex(texFor(r));
}
function previewRange(p, range) {
  const d = p.settings.display;
  if (range) { d.startBar = range.a + 1; d.barCount = range.b - range.a + 1; } else { d.startBar = 1; d.barCount = -1; }
  p.updateSettings();
  state.previewRangeBars = range;
}
async function previewClip(p, r) {
  const song = await db.get('songs', r.source.id);
  if (!song || song.deleted || !song.data) { toast('The original song no longer exists'); stopPreview(); return; }
  try {
    const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(song.data), p.settings);
    if (song.tones) for (const [i, pr] of Object.entries(song.tones)) if (score.tracks[i]) score.tracks[i].playbackInfo.program = pr;
    const mbs = score.masterBars;
    const a = Math.min(r.startBar, mbs.length - 1), b = Math.min(r.endBar, mbs.length - 1);
    previewRange(p, { a, b });
    p.renderScore(score, [Math.min(r.trackIdx || 0, score.tracks.length - 1)]);
  } catch (e) { console.error('Preview error:', e); stopPreview(); }
}
function stopPreview() {
  if (!state.previewId) return;
  state.previewId = null;
  previewWantPlay = false;
  if (previewApi) previewApi.stop();
  renderRiffs();
}

// ---------------- riffs ----------------
function renderRiffs() {
  if (state.rfMode && state.rfMode !== 'riffs') renderTheory();
  $('#rf-genres').innerHTML = GENRES.map((g) => `<button class="chip ${g === state.riffGenre ? 'on' : ''}" data-g="${g}">${g}</button>`).join('');
  let list = allRiffs();
  if (state.riffGenre === 'My riffs') list = list.filter((r) => r.user);
  else if (state.riffGenre !== 'All') list = list.filter((r) => r.genre === state.riffGenre);
  const q = ($('#rf-search').value || '').trim().toLowerCase();
  if (q) list = list.filter((r) => [r.name, r.style, r.level, r.genre, r.tuning].join(' ').toLowerCase().includes(q));
  $('#rf-count').textContent = allRiffs().length;
  $('#rf-list').innerHTML = list.length ? list.map((r) => {
    const playing = r.id === state.previewId;
    const tun = r.tuning && r.tuning !== 'standard' ? ' · ' + ((TUNINGS[r.tuning] || TUNER_TUNINGS.find((t) => t.id === r.tuning) || {}).name || r.tuning) : '';
    return `<div class="rf ${playing ? 'playing' : ''}" data-id="${r.id}">
      <button class="pv" data-pv aria-label="${playing ? 'Stop' : 'Listen'}: ${esc(r.name)}"><svg width="16" height="16"><use href="${playing ? '#i-pause' : '#i-play'}"/></svg></button>
      <div class="txt">
        <div class="n">${esc(r.name)}${r.user ? '<span class="mine">MINE</span>' : ''}</div>
        <div class="d">${esc(r.genre)}${r.style ? ' · ' + esc(r.style) : ''} · ${r.bpm} BPM${esc(tun)}</div>
        ${playing ? '<div class="bar"><div></div></div>' : ''}
      </div>
      ${r.user && r.doc ? `<button class="icon-btn act" data-redit aria-label="Edit"><svg width="16" height="16"><use href="#i-edit"/></svg></button><button class="icon-btn act" data-rdel aria-label="Delete"><svg width="16" height="16"><use href="#i-trash"/></svg></button>` : r.user ? `<button class="icon-btn act" data-rdel aria-label="Delete"><svg width="16" height="16"><use href="#i-trash"/></svg></button>` : ''}
      <span class="lvl lvl-${esc(r.level)}">${esc(r.level)}</span>
    </div>`;
  }).join('') : '<div class="empty-note">No riffs here yet. Click “Add” to create one in the editor.</div>';
}
$('#rf-search').oninput = () => renderRiffs();

// ---------------- chords & scales ----------------
state.rfMode = 'riffs';
state.practice = [];
const chordRiff = (name, frets, tone) => ({ id: 'chord-' + name + frets.join(','), name, genre: 'Chords', style: 'strum', level: 'Easy', bpm: 80, tone, tex: chordStrumTex(frets) });
const scaleRiff = (sc) => ({ id: 'scale-' + sc.id, name: sc.name, genre: 'Scales', style: 'up & down', level: 'Easy', bpm: 80, tone: 'clean', tex: scaleTex(sc) });
function setRfMode(m) {
  state.rfMode = m;
  $$('#rf-mode [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  $$('.rf-pane').forEach((p) => { p.hidden = p.dataset.pane !== m; });
  $('#rf-add').hidden = m !== 'riffs';
  renderTheory();
}
$('#rf-mode').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setRfMode(b.dataset.mode); });
const pvBtn = (id, label) => `<button class="pv small" data-pv="${esc(id)}" aria-label="${state.previewId === id ? 'Stop' : 'Listen'}: ${esc(label)}"><svg width="14" height="14"><use href="${state.previewId === id ? '#i-pause' : '#i-play'}"/></svg></button>`;
function renderTheory() {
  if (state.rfMode === 'chords') {
    const pr = state.practice;
    $('#ch-practice').innerHTML = pr.length
      ? `<div class="ch-seq">${pr.map(([n], k) => `<button class="chip on" data-prm="${k}" title="Remove">${esc(n)} ×</button>`).join('<span class="arr">→</span>')}</div>
         <div class="ch-acts"><button class="btn primary small" id="ch-go">Practice changes</button><button class="btn ghost small" id="ch-clear">Clear</button></div>`
      : '<div class="rf-sub"><span>Tap <b>＋</b> on two or more chords to build a practice sequence (for example C → G → Am → F), then play it in a loop.</span></div>';
    $('#ch-list').innerHTML = CHORD_GROUPS.map((g) => `<h3 class="ch-group">${esc(g.name)}</h3><div class="ch-grid">${g.chords.map(([n, f], k) => {
      const id = chordRiff(n, f, g.tone).id;
      return `<div class="ch-card ${state.previewId === id ? 'playing' : ''}" data-g="${g.id}" data-k="${k}">
        <div class="ch-name">${esc(n)}</div>${chordSvg(f, 92)}
        <div class="ch-btns">${pvBtn(id, n)}<button class="pv small" data-add aria-label="Add ${esc(n)} to practice">＋</button></div></div>`;
    }).join('')}</div>`).join('');
  } else if (state.rfMode === 'scales') {
    $('#sc-list').innerHTML = SCALES.map((sc) => {
      const id = scaleRiff(sc).id;
      return `<div class="sc-card ${state.previewId === id ? 'playing' : ''}" data-sc="${sc.id}">
        <div class="sc-top"><div><div class="n">${esc(sc.name)}</div>${sc.hint ? `<div class="d">${esc(sc.hint)}</div>` : ''}</div>
        <div class="sc-btns">${pvBtn(id, sc.name)}<button class="btn ghost small" data-go-sc>Practice</button></div></div>
        <div class="sc-svg">${scaleSvg(sc, 320)}</div></div>`;
    }).join('');
  }
}
function savePractice() { db.setSetting('chordPractice', state.practice); }
$('#ch-list').addEventListener('click', (e) => {
  const card = e.target.closest('.ch-card');
  if (!card) return;
  const g = CHORD_GROUPS.find((x) => x.id === card.dataset.g);
  const [n, f] = g.chords[Number(card.dataset.k)];
  const r = chordRiff(n, f, g.tone);
  if (e.target.closest('[data-add]')) {
    if (state.practice.length >= 8) { toast('Up to 8 chords in one sequence'); return; }
    state.practice.push([n, f]); savePractice(); renderTheory(); return;
  }
  if (state.previewId === r.id) stopPreview(); else startPreview(r);
});
$('#ch-practice').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-prm]');
  if (rm) { state.practice.splice(Number(rm.dataset.prm), 1); savePractice(); renderTheory(); return; }
  if (e.target.closest('#ch-clear')) { state.practice = []; savePractice(); renderTheory(); return; }
  if (e.target.closest('#ch-go')) {
    if (state.practice.length < 2) { toast('Add at least two chords'); return; }
    const names = state.practice.map(([n]) => n);
    openRiff({ id: 'practice-' + names.join('-'), name: names.join(' → '), genre: 'Chord changes', level: 'Easy', bpm: 70, tone: 'acoustic', tex: changesTex(state.practice) },
      () => setLoop(true));
  }
});
$('#sc-list').addEventListener('click', (e) => {
  const card = e.target.closest('.sc-card');
  if (!card) return;
  const sc = SCALES.find((x) => x.id === card.dataset.sc);
  const r = scaleRiff(sc);
  if (e.target.closest('[data-go-sc]')) { openRiff(r, () => setLoop(true)); return; }
  if (state.previewId === r.id) stopPreview(); else startPreview(r);
});
$('#rf-genres').addEventListener('click', (e) => {
  const b = e.target.closest('[data-g]');
  if (b) { state.riffGenre = b.dataset.g; renderRiffs(); }
});
$('#rf-list').addEventListener('click', async (e) => {
  const row = e.target.closest('.rf');
  if (!row) return;
  const r = allRiffs().find((x) => x.id === row.dataset.id);
  if (!r) return;
  if (e.target.closest('[data-pv]')) { if (state.previewId === r.id) stopPreview(); else startPreview(r); return; }
  if (e.target.closest('[data-rdel]')) {
    if (confirm(`Delete the riff “${r.name}”?`)) { await db.remove('riffs', r.id); await refreshLibrary(); }
    return;
  }
  if (e.target.closest('[data-redit]')) { editExisting('riffs', r); return; }
  state.portionId = null;
  if (r.kind === 'clip') { openPortion(r, true); return; }
  openRiff(r);
});
$('#rf-add').onclick = () => { if (newEditorDoc()) go('editor'); };

// ---------------- editor ----------------
const editor = new TabEditor($('#ed-grid'), {
  onChange: () => { state.dirty = true; schedulePreview(); },
  onPlay: () => edPlay(),
});
let previewTimer = null;
function schedulePreview(ms = 400) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (state.view !== 'editor') return;
    stopPreview();
    previewRange(getPreviewApi(), null);
    getPreviewApi().tex(texFor({ doc: editor.doc, tone: editor.doc.tone }));
  }, ms);
}
function edPlay() {
  const p = getPreviewApi();
  if (p.playerState === 1) { p.stop(); return; }
  previewWantPlay = false;
  p.play();
}
function fillEditorFields() {
  const d = editor.doc;
  $('#ed-name').value = d.name;
  $('#ed-type').value = d.type;
  $('#ed-genre').value = d.genre;
  $('#ed-level').value = d.level;
  $('#ed-bpm').value = d.bpm;
  $('#ed-tuning').value = d.tuning;
  $('#ed-tone').value = d.tone;
  $$('.riff-only').forEach((x) => { x.hidden = d.type !== 'riff'; });
}
function newEditorDoc() {
  if (state.dirty && !confirm('Discard unsaved changes?')) return false;
  state.editing = null;
  editor.load(newDoc());
  fillEditorFields();
  state.dirty = false;
  schedulePreview(0);
  return true;
}
function editExisting(store, rec) {
  if (!rec.doc) { toast('Only riffs created in the editor can be edited'); return; }
  if (state.dirty && !confirm('Discard unsaved changes?')) return;
  state.editing = { store, id: rec.id };
  editor.load(JSON.parse(JSON.stringify(rec.doc)));
  fillEditorFields();
  state.dirty = false;
  go('editor');
}
$('#ed-genre').innerHTML = GENRES.filter((g) => g !== 'All' && g !== 'My riffs').map((g) => `<option>${g}</option>`).join('');
$('#ed-tuning').innerHTML = TUNER_TUNINGS.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
$('#ed-tone').innerHTML = TONES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
$('#ed-fx').innerHTML = FX.map((f) => `<button data-fx="${f.id}" title="${f.title}">${f.label}</button>`).join('');
$('#ed-fx').addEventListener('click', (e) => { const b = e.target.closest('[data-fx]'); if (b) editor.toggleFx(b.dataset.fx); });
const bindField = (id, key, num) => $(id).addEventListener('input', (e) => {
  editor.doc[key] = num ? Number(e.target.value) || 120 : e.target.value;
  state.dirty = true;
  if (key === 'type') fillEditorFields();
  if (key === 'tuning') editor.render();
  schedulePreview();
});
bindField('#ed-name', 'name'); bindField('#ed-type', 'type'); bindField('#ed-genre', 'genre'); bindField('#ed-level', 'level');
bindField('#ed-bpm', 'bpm', true); bindField('#ed-tuning', 'tuning'); bindField('#ed-tone', 'tone');
$$('[data-res-btn]').forEach((b) => b.addEventListener('click', () => editor.setRes(Number(b.dataset.resBtn))));
$('#ed-addm').onclick = () => editor.addMeasure();
$('#ed-delm').onclick = () => { if (confirm('Delete the current bar?')) editor.removeMeasure(); };
$('#ed-play').onclick = () => edPlay();
$('#ed-new').onclick = () => newEditorDoc();
$('#ed-save').onclick = async () => {
  const d = editor.doc;
  d.name = d.name.trim() || 'Untitled';
  const doc = JSON.parse(JSON.stringify(d));
  const prev = state.editing;
  const store = d.type === 'riff' ? 'riffs' : 'songs';
  const id = prev && prev.store === store ? prev.id : db.uid();
  if (prev && prev.store !== store) await db.remove(prev.store, prev.id); // type changed
  if (store === 'riffs') {
    await db.put('riffs', { id, name: d.name, genre: d.genre, style: 'my riff', level: d.level, bpm: d.bpm, tone: d.tone, tuning: d.tuning, doc });
  } else {
    const old = prev && prev.store === 'songs' ? await db.get('songs', id) : null;
    await db.put('songs', { ...(old || {}), id, kind: 'doc', name: d.name, ext: 'gp', tracks: 1, tones: (old && old.tones) || {}, doc });
  }
  state.editing = { store, id };
  state.dirty = false;
  await refreshLibrary();
  toast(store === 'riffs' ? 'Riff saved to Riffs › My riffs' : 'Saved to Songs');
};
$('#ed-export').onclick = () => {
  try {
    const s = new alphaTab.Settings();
    const score = alphaTab.importer.ScoreLoader.loadAlphaTex(texFor({ doc: editor.doc, tone: editor.doc.tone }), s);
    const bytes = new alphaTab.exporter.Gp7Exporter().export(score, s);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    a.download = (editor.doc.name || 'riff').replace(/[\\/:*?"<>|]/g, '_') + '.gp';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (err) { console.error('Export failed:', err); toast('Export failed: ' + err.message); }
};
// on-screen keypad (phone)
(() => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'X', '⌫'];
  let h = keys.map((k) => `<button data-k="${k}">${k}</button>`).join('');
  h += FX.map((f) => `<button class="fx" data-f="${f.id}">${f.label}</button>`).join('');
  h += ['←', '↑', '↓', '→'].map((k) => `<button class="nav" data-n="${k}">${k}</button>`).join('');
  h += '<button class="nav" data-addm>+Bar</button><button class="fx" data-play>▶</button>';
  $('#ed-pad').innerHTML = h;
  $('#ed-pad').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.k) {
      if (b.dataset.k === 'X') editor.setFret('x');
      else if (b.dataset.k === '⌫') editor.clear();
      else editor.typeDigit(b.dataset.k);
    } else if (b.dataset.f) editor.toggleFx(b.dataset.f);
    else if (b.dataset.n) {
      const m = { '←': [-1, 0], '→': [1, 0], '↑': [0, -1], '↓': [0, 1] }[b.dataset.n];
      editor.move(m[0], m[1]);
    } else if (b.hasAttribute('data-addm')) editor.addMeasure();
    else if (b.hasAttribute('data-play')) edPlay();
  });
})();
const editFromPlayer = async () => {
  const src = state.source;
  if (!src) return;
  closeSheet('sheet-more');
  if (src.type === 'song') { const s = await db.get('songs', src.id); if (s) editExisting('songs', s); }
  else { const r = state.userRiffs.find((x) => x.id === src.id); if (r) editExisting('riffs', r); }
};
$('#p-edit').onclick = editFromPlayer;
$('#p-edit-2').onclick = editFromPlayer;

// ---------------- keyboard (PC) ----------------
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if (state.view === 'editor') {
    if (editor.handleKey(e)) e.preventDefault();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (state.view === 'songs' && (e.key === 'f' || e.key === 'F')) { if (!isMobile()) setFocus(!state.focus); return; }
  if (state.view === 'songs' && e.key === 'Escape' && state.focus && !state.range) { setFocus(false); return; }
  if (state.view === 'songs' && state.score) {
    const k = e.key.toLowerCase();
    if (e.key === ' ') { e.preventDefault(); $('#t-play').click(); }
    else if (e.key === '+' || e.key === '=') setScale(curScale() + 0.1);
    else if (e.key === '-') setScale(curScale() - 0.1);
    else if (e.key === 'Escape') clearRange();
    else if (k === 'm') toggleMute();
    else if (k === 'l') setLoop(!state.loop);
    else if (k === 'c') toggleCount();
    else if (k === 't') $('#t-metro').click();
    else if (e.key === '[') setSpeed(Math.max(25, state.speed - 5));
    else if (e.key === ']') setSpeed(Math.min(150, state.speed + 5));
    else if (e.key === 'Home') api.stop();
  }
});

// ---------------- tuner ----------------
const tuner = new Tuner(onTunerData);
const tn = { tuning: TUNER_TUNINGS[0], target: null, auto: true, a4: 440, needle: 0 };
function tunerStringsMidi() { return tn.tuning.notes.map(noteToMidi); }
function saveTuner() { db.setSetting('tuner', { tuning: tn.tuning.id, a4: tn.a4, gain: tuner.gain }); }
function renderTunerStatic() {
  $('#tn-chips').innerHTML = TUNER_TUNINGS.map((t) => `<button class="chip ${t.id === tn.tuning.id ? 'on' : ''}" data-tu="${t.id}">${t.name}</button>`).join('');
  if ($('#tn-note').classList.contains('idle')) $('#tn-note').textContent = prettyNote(tn.tuning.notes[tn.target != null ? tn.target : 0]);
  $('#tn-tuning-sel').innerHTML = TUNER_TUNINGS.map((t) => `<option value="${t.id}" ${t.id === tn.tuning.id ? 'selected' : ''}>${t.name}</option>`).join('');
  $('#tn-sum').textContent = `${tn.auto ? 'auto string' : 'manual string'} · A4 ${tn.a4} Hz`;
  $('#tn-strings').innerHTML = tn.tuning.notes.map((n, i) => `<button data-s="${i}" class="${tn.target === i ? 'on' : ''}" aria-label="String ${6 - i}: ${n}">${prettyNote(n)}<span>${n.replace('b', '♭').replace('#', '♯')}</span></button>`).join('');
}
$('#tn-chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tu]');
  if (!b) return;
  tn.tuning = TUNER_TUNINGS.find((t) => t.id === b.dataset.tu);
  tn.target = null;
  renderTunerStatic();
  saveTuner();
});
$('#tn-tuning-sel').onchange = (e) => { const b = $(`#tn-chips [data-tu="${e.target.value}"]`); if (b) b.click(); };
$('#tn-strings').addEventListener('click', (e) => {
  const b = e.target.closest('[data-s]');
  if (!b) return;
  const i = Number(b.dataset.s);
  tn.target = i;
  tn.auto = false;
  $('#tn-auto').checked = false;
  renderTunerStatic();
  tuner.playReference(midiToFreq(tunerStringsMidi()[i], tn.a4));
});
$('#tn-auto').onchange = (e) => { tn.auto = e.target.checked; if (tn.auto) tn.target = null; renderTunerStatic(); };
$('#tn-gain').oninput = (e) => { tuner.setGain(Number(e.target.value)); saveTuner(); };
const setA4 = (v) => { tn.a4 = Math.max(415, Math.min(466, v)); $('#tn-a4').textContent = tn.a4 + ' Hz'; $('#tn-sum').textContent = `${tn.auto ? 'auto string' : 'manual string'} · A4 ${tn.a4} Hz`; saveTuner(); };
$('#tn-a4-m').onclick = () => setA4(tn.a4 - 1);
$('#tn-a4-p').onclick = () => setA4(tn.a4 + 1);

$('#tn-input').onchange = async (e) => {
  tuner.deviceId = e.target.value || null;
  db.setSetting('tunerInput', tuner.deviceId);
  if (tuner.running) { stopTuner(); await startTuner(); }
};
async function startTuner() {
  try {
    await tuner.start();
    $('#tn-start span').textContent = 'Stop microphone';
    $('#tn-hint').textContent = 'Pluck a string';
    const inputs = await tuner.listInputs();
    $('#tn-input').innerHTML = '<option value="">Default</option>' + inputs.map((d, i) => `<option value="${d.deviceId}" ${d.deviceId === tuner.deviceId ? 'selected' : ''}>${esc(d.label || 'Input ' + (i + 1))}</option>`).join('');
  } catch (err) {
    console.error('Microphone error:', err);
    $('#tn-hint').textContent = location.protocol === 'https:' || location.hostname === 'localhost'
      ? 'No microphone access. Check the browser permission.'
      : 'The microphone only works on https:// or localhost.';
  }
}
function stopTuner() {
  if (tuner.running) needFreshAudio = true;
  tuner.stop();
  $('#tn-start span').textContent = 'Start microphone';
  $('#tn-level').style.width = '0';
}
$('#tn-start').onclick = () => (tuner.running ? stopTuner() : startTuner());

// gauge arc
(() => {
  const cx = 175, cy = 180, r = 150;
  const pt = (deg, rad) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
  const arc = (d1, d2) => { const [x1, y1] = pt(d1, r), [x2, y2] = pt(d2, r); return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`; };
  let ticks = '';
  for (let c = -50; c <= 50; c += 10) { const d = c * 1.2; const [a1, b1] = pt(d, r - 16), [a2, b2] = pt(d, r - (c % 50 === 0 ? 34 : 26)); ticks += `M${a1} ${b1}L${a2} ${b2}`; }
  $('#g-arc').setAttribute('d', arc(-60, 60));
  $('#g-ok').setAttribute('d', arc(-6, 6));
  $('#g-ticks').setAttribute('d', ticks);
})();

function onTunerData({ freq, level }) {
  $('#tn-level').style.width = level * 100 + '%';
  if (freq < 0) {
    $('#tn-note').classList.remove('ok');
    $('#tn-cents').classList.remove('ok');
    $$('#tn-strings button').forEach((b) => b.classList.remove('hit'));
    return;
  }
  const mids = tunerStringsMidi();
  const m = freqToMidi(freq, tn.a4);
  let target = tn.target;
  if (tn.auto || target === null) {
    let best = 0, bd = 1e9;
    mids.forEach((mm, i) => { const d = Math.abs(mm - m); if (d < bd) { bd = d; best = i; } });
    target = best;
  }
  const cents = (m - mids[target]) * 100;
  let noteText = prettyNote(tn.tuning.notes[target]);
  let shown = cents;
  if (Math.abs(cents) > 150) {
    // far from any string: show the actual detected note
    const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const rm = Math.round(m);
    noteText = names[((rm % 12) + 12) % 12];
    shown = (m - rm) * 100;
  }
  const ok = Math.abs(cents) < 5;
  tn.needle += (Math.max(-50, Math.min(50, shown)) * 1.2 - tn.needle) * 0.45;
  $('#g-needle').style.transform = `rotate(${tn.needle}deg)`;
  $('#tn-note').textContent = noteText;
  $('#tn-note').classList.remove('idle');
  $('#tn-note').classList.toggle('ok', ok);
  $('#tn-cents').textContent = (shown > 0 ? '+' : shown < 0 ? '−' : '') + Math.abs(Math.round(shown)) + ' cents';
  $('#tn-cents').classList.toggle('ok', ok);
  $('#tn-hz').textContent = freq.toFixed(1) + ' Hz';
  $('#tn-hint').textContent = ok ? 'In tune ✓' : Math.abs(cents) > 150 ? `Far from the ${prettyNote(tn.tuning.notes[target])} string` : cents < 0 ? 'Too low — tighten the string a little' : 'Too high — loosen the string a little';
  $$('#tn-strings button').forEach((b, i) => b.classList.toggle('hit', i === target));
}

// ---------------- sync (website or Google Drive) ----------------
let syncStatus = null;
async function updateSyncLabel(status) {
  if (status !== undefined) syncStatus = status;
  const cfg = await sync.getConfig();
  const last = await db.getSetting('lastSync');
  let txt = 'Local only', cls = '';
  if (syncStatus) { txt = syncStatus; cls = 'busy'; }
  else if (cfg.mode && last) { txt = 'Synced ' + new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); cls = 'ok'; }
  else if (cfg.mode) txt = 'Sync on';
  $('#sync-label').textContent = txt;
  $('#sync-pill').hidden = !cfg.mode;
  $('#sync-pill').className = 'sync-pill ' + cls;
  state.syncText = cfg.mode ? txt : 'Off — library saved on this device only';
}
async function runSync(silent = false) {
  const cfg = await sync.getConfig();
  if (!cfg.mode) return;
  try {
    const n = await sync.sync((st) => updateSyncLabel(st));
    if (n) await refreshLibrary();
    await updateSyncLabel(null);
    if (!silent) toast(n ? `Synced (${n} change${n === 1 ? '' : 's'})` : 'Everything is up to date');
  } catch (err) {
    console.error('Sync failed:', err);
    await updateSyncLabel(null);
    if (!silent) toast('Sync failed: ' + err.message, 4000);
  }
}
function newCode() {
  const w = 'abcdefghjkmnpqrstuvwxyz23456789';
  let c = '';
  const r = crypto.getRandomValues(new Uint8Array(12));
  r.forEach((x, i) => { c += w[x % w.length]; if (i % 4 === 3 && i < 11) c += '-'; });
  return c;
}
async function renderSyncDialog() {
  const body = $('#sync-body');
  const cfg = await sync.getConfig();
  const last = await db.getSetting('lastSync');
  const web = await sync.websiteAvailable();
  if (!web && sync.websiteProblem) log('warn', 'Website sync unavailable: ' + sync.websiteProblem);
  const status = cfg.mode
    ? `<p class="sy-status ok">Sync is on (${cfg.mode === 'website' ? 'through this website' : 'Google Drive'})${last ? ' · last sync ' + new Date(last).toLocaleString() : ''}.</p>`
    : '<p class="sy-status">Sync is off — the library is saved only on this device.</p>';
  body.innerHTML = `${status}
    <div class="sy-opt ${cfg.mode === 'website' ? 'on' : ''}">
      <div class="sy-title">Through this website <span class="tag">recommended</span></div>
      ${web ? `
        <p>Use the <b>same sync code</b> on every device (PC, Mac, phone). Anyone with the code can see the library, so keep it private.</p>
        <div class="sy-row"><input id="sy-code" class="sy-input" placeholder="Sync code" value="${esc(cfg.code)}" autocomplete="off" spellcheck="false">
          <button class="btn small" id="sy-gen" title="Make a new random code">New code</button></div>
        <div class="btns"><button class="btn primary" id="sy-web">${cfg.mode === 'website' ? 'Save & sync now' : 'Turn on'}</button>
          ${cfg.code ? '<button class="btn" id="sy-copy">Copy code</button>' : ''}</div>`
      : `<p>Not available here${sync.websiteProblem ? ': <b>' + esc(sync.websiteProblem) + '</b>' : ''}.</p><p>It needs the app to run from a website with PHP. On a local copy (localhost) or a host that blocks it, use <b>Backup / Restore</b> in Settings instead.</p>`}
    </div>
    <div class="sy-opt ${cfg.mode === 'google' ? 'on' : ''}">
      <div class="sy-title">Google Drive</div>
      <p>Keeps the library in a <b>Riffbook</b> folder in Google Drive. Google requires a one-time “client ID” for the site — paste it here (no file editing).</p>
      <div class="sy-row"><input id="sy-gid" class="sy-input" placeholder="…apps.googleusercontent.com" value="${esc(cfg.clientId)}" autocomplete="off" spellcheck="false"></div>
      <div class="btns"><button class="btn ${cfg.mode === 'google' ? 'primary' : ''}" id="sy-google">${cfg.mode === 'google' ? 'Sync now' : 'Connect Google Drive'}</button></div>
      <details><summary>How to get a client ID (10 min, once)</summary>
        <ol>
          <li>console.cloud.google.com → new project → enable <b>Google Drive API</b></li>
          <li>OAuth consent screen → “External” → add your Google account under “Test users”</li>
          <li>Credentials → OAuth client ID → <b>Web application</b> → “Authorized JavaScript origins”: <code>${esc(location.origin)}</code></li>
          <li>Copy the Client ID and paste it above</li>
        </ol></details>
    </div>
    ${cfg.mode ? '<div class="btns"><button class="btn" id="sy-off">Turn sync off</button></div>' : ''}`;
  const gen = $('#sy-gen');
  if (gen) gen.onclick = () => { $('#sy-code').value = newCode(); };
  const copy = $('#sy-copy');
  if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(cfg.code); toast('Sync code copied'); } catch { toast(cfg.code, 5000); } };
  const webBtn = $('#sy-web');
  if (webBtn) webBtn.onclick = async () => {
    const code = $('#sy-code').value.trim();
    if (code.length < 6) { toast('The sync code needs at least 6 characters'); return; }
    await sync.setConfig({ mode: 'website', code });
    closeSheet('sheet-sync');
    await runSync(false);
  };
  $('#sy-google').onclick = async () => {
    const clientId = $('#sy-gid').value.trim();
    if (!/\.apps\.googleusercontent\.com$/.test(clientId)) { toast('That does not look like a Google client ID'); return; }
    await sync.setConfig({ mode: 'google', clientId });
    closeSheet('sheet-sync');
    await runSync(false);
  };
  const off = $('#sy-off');
  if (off) off.onclick = async () => {
    if ((await sync.getConfig()).mode === 'google') sync.googleDisconnect();
    await sync.setConfig({ mode: null });
    await updateSyncLabel(null);
    closeSheet('sheet-sync');
    toast('Sync turned off — the library stays on this device');
  };
}
const openSync = async () => { await renderSyncDialog(); openSheet('sheet-sync'); };
$('#sync-pill').onclick = openSync;

async function canSyncQuietly() {
  const cfg = await sync.getConfig();
  return cfg.mode === 'website' || (cfg.mode === 'google' && sync.hasGoogleToken());
}
let syncTimer = null;
window.addEventListener('rb-changed', async () => {
  if (!(await canSyncQuietly())) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => runSync(true), 3000);
});
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && (await canSyncQuietly())) runSync(true);
});
// Website sync starts on its own; Google needs one tap first (the browser requires a gesture for the sign-in window)
async function startAutoSync() {
  const cfg = await sync.getConfig();
  if (cfg.mode === 'website') { runSync(true); setInterval(() => { if (document.visibilityState === 'visible') runSync(true); }, 120000); }
  if (cfg.mode === 'google') {
    const once = () => { window.removeEventListener('pointerdown', once, true); runSync(true); };
    window.addEventListener('pointerdown', once, true);
  }
}

// ---------------- focus mode ----------------
function setFocus(on) {
  state.focus = !!on;
  app.classList.toggle('focus', state.focus);
  $('#p-focus').classList.toggle('on', state.focus);
  $('#focus-icon').setAttribute('href', state.focus ? '#i-shrink' : '#i-expand');
  $('#p-focus').title = state.focus ? 'Exit focus mode (F / Esc)' : 'Focus mode — hide everything except the score (F)';
  if (state.score) setTimeout(() => api.render(), 50);
}
$('#p-focus').onclick = () => setFocus(!state.focus);

// ---------------- display preferences ----------------
const PAPER_COLORS = {
  dark: { staffLineColor: '#5C5F68', barSeparatorColor: '#8A8D96', barNumberColor: '#E5675A', mainGlyphColor: '#E6E6E8', secondaryGlyphColor: 'rgba(230,230,232,0.45)', scoreInfoColor: '#C8C9CE' },
  light: { staffLineColor: '#A5A5A5', barSeparatorColor: '#222222', barNumberColor: '#C8102E', mainGlyphColor: '#000000', secondaryGlyphColor: 'rgba(0,0,0,0.40)', scoreInfoColor: '#000000' },
};
function applyDisplayPrefs(rerenderNow = false) {
  document.documentElement.dataset.theme = prefs.theme;
  app.dataset.paper = prefs.paper;
  $('meta[name="theme-color"]').setAttribute('content', prefs.theme === 'light' ? '#FFFFFF' : '#111214');
  api.settings.fillFromJson({
    display: { barsPerRow: prefs.barsPerRow, padding: isMobile() ? [10, 14] : [20, 24], resources: PAPER_COLORS[prefs.paper === 'dark' ? 'dark' : 'light'] },
    player: { scrollMode: { continuous: 'Continuous', smooth: 'Smooth', off: 'Off' }[prefs.scrollMode] || 'Continuous' },
  });
  api.updateSettings();
  api.metronomeVolume = state.metro ? prefs.metroVolume / 100 : 0;
  $('#lib-sort').value = prefs.sort;
  const step = prefs.autoStep;
  $('#t-auto').textContent = `+${step}% / loop`;
  $('#t-auto-2').textContent = `+${step}% every loop`;
  if (rerenderNow && state.score) rerender(() => api.render());
}

// ---------------- backup / restore ----------------
function abToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64ToAb(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
const SETTING_KEYS = ['prefs', 'view', 'audio', 'tuner', 'tunerInput', 'riffTones', 'libTab'];
async function makeBackup() {
  const songs = (await db.getAll('songs')).map((x) => (x.data ? { ...x, data: abToB64(x.data), _b64: true } : x));
  const settings = {};
  for (const k of SETTING_KEYS) settings[k] = await db.getSetting(k);
  const out = { app: 'riffbook', version: 1, appVersion: APP_VERSION, createdAt: new Date().toISOString(),
    songs, portions: await db.getAll('portions'), riffs: await db.getAll('riffs'), settings };
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `riffbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  await db.setSetting('lastBackup', Date.now());
  toast(`Backup saved: ${songs.length} songs, ${out.portions.length} sections, ${out.riffs.length} riffs`, 3500);
}
async function restoreBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('This is not a Riffbook backup file'); return; }
  if (!data || data.app !== 'riffbook') { toast('This is not a Riffbook backup file'); return; }
  const replace = confirm(`Backup from ${new Date(data.createdAt).toLocaleString()}:\n${(data.songs || []).length} songs · ${(data.portions || []).length} sections · ${(data.riffs || []).length} riffs\n\nOK = add to this library (keeps what you have; newer copies win)\nCancel = do nothing`);
  if (!replace) return;
  let n = 0;
  for (const [store, list] of [['songs', data.songs], ['portions', data.portions], ['riffs', data.riffs]]) {
    for (const rec of list || []) {
      const cur = await db.get(store, rec.id);
      if (cur && (cur.updatedAt || 0) > (rec.updatedAt || 0)) continue;
      const r = { ...rec };
      if (r._b64) { r.data = b64ToAb(r.data); delete r._b64; }
      await db.put(store, r, true);
      n++;
    }
  }
  if (data.settings && confirm('Also restore the settings from the backup (view, sounds, tuner, …)?')) {
    for (const [k, v] of Object.entries(data.settings)) if (v !== null && v !== undefined) await db.setSetting(k, v);
    await loadPrefs();
    state.practice = (await db.getSetting('chordPractice', [])) || [];
    applyDisplayPrefs(true);
  }
  await refreshLibrary();
  toast(`Restored ${n} item${n === 1 ? '' : 's'}`);
}
async function clearAllData() {
  if (!confirm('Delete EVERYTHING on this device: songs, saved sections, your riffs and settings?\n\nTip: make a Backup first.')) return;
  if (!confirm('Really delete everything? This cannot be undone.')) return;
  for (const store of ['songs', 'portions', 'riffs']) for (const r of await db.getAll(store, true)) await db.put(store, { id: r.id, deleted: true, updatedAt: Date.now() }, true);
  for (const k of [...SETTING_KEYS, 'lastSource', 'lastSync', 'sync']) await db.setSetting(k, null);
  toast('All data deleted — reloading…');
  setTimeout(() => location.reload(), 900);
}

// ---------------- settings panel ----------------
const opt = (v, label, cur) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${label}</option>`;
const sel = (key, options) => `<select data-pref="${key}">${options.map(([v, l]) => opt(v, l, prefs[key])).join('')}</select>`;
const tog = (key) => `<input type="checkbox" class="switch" data-pref="${key}" ${prefs[key] ? 'checked' : ''}>`;
const rng = (key, min, max, step, unit) => `<input type="range" data-pref="${key}" min="${min}" max="${max}" step="${step}" value="${prefs[key]}"><span class="val" data-val="${key}">${prefs[key]}${unit}</span>`;
const row = (label, hint, control) => `<label class="set-row"><span>${label}${hint ? `<span class="hint">${hint}</span>` : ''}</span>${control}</label>`;

async function renderSettings() {
  const lastBackup = await db.getSetting('lastBackup');
  const tunings = [['last', 'Last used'], ...TUNER_TUNINGS.map((t) => [t.id, t.name])];
  let storage = '';
  try { const est = await navigator.storage.estimate(); storage = `${(est.usage / 1048576).toFixed(1)} MB used`; } catch { /* */ }
  let persisted = false;
  try { persisted = await navigator.storage.persisted(); } catch { /* */ }
  let sndCached = 0;
  try { sndCached = await cachedSize(); } catch { /* */ }
  const touch = matchMedia('(pointer: coarse)').matches;
  $('#settings-body').innerHTML = `
    <div class="set-sec"><h3>SOUND</h3>
      ${row('Instrument sounds', snd.bank ? `in use: ${snd.bank === 'best' ? 'high quality' : 'light'}` : (snd.failed ? 'not loaded — see the log' : 'loading…'), sel('soundBank', Object.entries(BANKS).map(([k, b]) => [k, b.label])))}
      <div class="set-row"><span>No sound?<span class="hint">restarts the audio (e.g. after the tuner, a phone call or another app)</span></span><button class="btn small" id="st-snd-fix">Fix sound</button></div>
      <div class="set-row"><span>Sounds kept on this device<span class="hint">${(sndCached / 1048576).toFixed(1)} MB — downloaded once, then they work offline</span></span><button class="btn small" id="st-snd-clear">Download again</button></div>
    </div>
    <div class="set-sec"><h3>DISPLAY</h3>
      ${row('Show when a song opens', '', sel('defaultView', [['tab', 'Tab only'], ['both', 'Notation + Tab'], ['std', 'Notation only']]))}
      ${row('Fretboard under the score', 'shown by default', tog('defaultFret'))}
      ${row('Zoom on computer', '', rng('zoomDesktop', 0.6, 2, 0.1, '×'))}
      ${row('Zoom on phone', '', rng('zoomPhone', 0.5, 1.6, 0.1, '×'))}
      ${row('Bars per row', '', sel('barsPerRow', [[-1, 'Automatic'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']]))}
      ${row('Follow the cursor', 'how the score scrolls while playing', sel('scrollMode', [['continuous', 'Jump to the next line'], ['smooth', 'Smooth scroll'], ['off', 'Don’t scroll']]))}
      ${row('App theme', '', sel('theme', [['dark', 'Dark'], ['light', 'Light']]))}
      ${row('Score paper', '', sel('paper', [['cream', 'Cream'], ['white', 'White'], ['dark', 'Dark (night)']]))}
      ${Object.entries(TEXT_GROUPS).map(([k, g]) => row('Show ' + g.label.toLowerCase(), g.hint, tog(k))).join('')}
      ${row('Join empty bars', 'long rests shown as one bar with a number (like Guitar Pro)', tog('multiRest'))}
      ${row('Keep the screen on', 'while a song or riff is open (the phone won’t go to sleep)', tog('keepAwake'))}
      ${row('Focus mode when a song opens', 'computer only — hide everything except the score', tog('focusOnOpen'))}
    </div>
    <div class="set-sec"><h3>PLAYBACK</h3>
      ${row('Speed when a song opens', '', rng('defaultSpeed', 25, 150, 5, '%'))}
      ${row('Speed-up step', 'used by “+% / loop”', rng('autoStep', 1, 10, 1, '%'))}
      ${row('Count-in on by default', '1-2-3-4 before playing', tog('countInDefault'))}
      ${row('Metronome volume', '', rng('metroVolume', 10, 100, 5, '%'))}
      ${row('Loop saved sections', 'loop starts automatically when a saved section opens', tog('autoLoopSections'))}
    </div>
    <div class="set-sec"><h3>TRACKS</h3>
      ${row('Track to open', '', sel('defaultTrack', [['lead', 'Lead / solo guitar if found'], ['guitar', 'First guitar'], ['first', 'First track with notes'], ['last', 'Last one I used']]))}
      ${row('Hide empty tracks', 'tracks without notes (e.g. some vocal tracks)', tog('hideEmptyTracks'))}
    </div>
    <div class="set-sec"><h3>TUNER</h3>
      ${row('Tuning when the tuner opens', '', sel('tunerDefault', tunings))}
      <p class="hint" style="margin:2px 0 4px;font-size:12px;color:var(--mut)">Reference pitch, mic sensitivity and audio input are on the Tuner screen and are remembered.</p>
    </div>
    <div class="set-sec"><h3>LIBRARY</h3>
      ${row('Sort songs by', '', sel('sort', [['name', 'Name'], ['artist', 'Artist'], ['recent', 'Recently opened'], ['added', 'Recently added']]))}
      <div class="set-row"><span>Backup / Restore<span class="hint">One file with all songs, sections, your riffs and settings — keep it on iCloud / Drive / USB, or move it to another device.${lastBackup ? ' Last backup: ' + new Date(lastBackup).toLocaleDateString() + '.' : ''}</span></span></div>
      <div class="set-btns">
        <button class="btn primary small" id="st-backup">Save backup</button>
        <label class="btn small">Restore from file<input type="file" id="st-restore" accept=".json,application/json" hidden></label>
      </div>
      <div class="set-row"><span>Demo songs<span class="hint">House of the Rising Sun, Für Elise, Ode to Joy (Rock) — free to use</span></span><button class="btn small" id="st-demo">Add again</button></div>
      <div class="set-row"><span>Sync between devices<span class="hint">${esc(state.syncText || 'Off')}</span></span><button class="btn small" id="st-sync">Open</button></div>
      <div class="set-row"><span>Storage on this device<span class="hint">${storage}${persisted ? ' · protected from automatic clean-up' : ''}</span></span><button class="btn danger small" id="st-clear">Delete all data</button></div>
    </div>
    <div class="set-sec"><h3>HELP</h3>
      <div class="kbd-grid" ${touch ? 'hidden' : ''}>
        <kbd>Space</kbd><span>Play / pause</span>
        <kbd>L</kbd><span>Loop on / off</span>
        <kbd>[ ]</kbd><span>Speed −5% / +5%</span>
        <kbd>C</kbd><span>Count-in</span>
        <kbd>T</kbd><span>Metronome</span>
        <kbd>M</kbd><span>Mute</span>
        <kbd>+ −</kbd><span>Zoom (also Ctrl + mouse wheel, or two fingers on a phone)</span>
        <kbd>F</kbd><span>Focus mode</span>
        <kbd>Esc</kbd><span>Clear the selection / leave focus mode</span>
        <kbd>Home</kbd><span>Back to the start</span>
      </div>
      <div class="set-btns"><button class="btn small" id="st-log">Show log${errCount ? ` (${errCount} error${errCount > 1 ? 's' : ''})` : ''}</button><button class="btn small" id="st-reset">Reset settings</button></div>
    </div>
    <div class="set-foot">Riffbook ${APP_VERSION} · alphaTab 1.8.4 · ${BUILTIN_RIFFS.length} built-in riffs · sounds: GeneralUser GS by S. Christian Collins</div>`;
  paintRanges($('#settings-body'));
}

$('#settings-body').addEventListener('input', (e) => {
  const el = e.target.closest('[data-pref]');
  if (!el) return;
  const key = el.dataset.pref;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'range' || key === 'barsPerRow') v = Number(v);
  prefs[key] = v;
  savePrefs();
  const val = $(`[data-val="${key}"]`);
  if (val) val.textContent = v + (key.startsWith('zoom') ? '×' : '%');
  // live effects
  if (key === 'zoomDesktop' && !isMobile()) setScale(v, true);
  if (key === 'zoomPhone' && isMobile()) setScale(v, true);
  if (['theme', 'paper', 'barsPerRow', 'scrollMode', 'metroVolume', 'sort', 'autoStep'].includes(key)) applyDisplayPrefs(['paper', 'barsPerRow'].includes(key));
  if (key === 'defaultView') { state.showStd = v !== 'tab'; state.showTab = v !== 'std'; applyStaves(); }
  if (key === 'defaultFret') { state.showFret = v; applyStaves(); }
  if (key === 'hideEmptyTracks') renderTrackLists();
  if (TEXT_GROUPS[key]) applyScoreTexts(api, true);
  if (key === 'multiRest' && state.source && state.source.type === 'song') { const so = state.songs.find((x) => x.id === state.source.id); if (so) db.get('songs', so.id).then((full) => full && openSong(full)); }
  if (key === 'keepAwake') keepAwake(v && playerOpen());
  if (key === 'sort') renderLibrary();
  if (key === 'soundBank') { snd.ready = false; snd.bytes = null; snd.bank = null; toast('Loading the new sounds…'); loadSounds(true).then(() => { if (snd.ready) toast('Sounds ready'); }); }
});
$('#settings-body').addEventListener('click', async (e) => {
  const id = e.target.closest('button') && e.target.closest('button').id;
  if (id === 'st-backup') makeBackup();
  if (id === 'st-demo') { await loadDemoSongs(true); toast('Demo songs added to the library'); }
  if (id === 'st-snd-fix') { await freshAudio('button'); toast('Audio restarted — press Play'); }
  if (id === 'st-snd-clear') { await clearSoundCache(); snd.ready = false; snd.bytes = null; snd.bank = null; toast('Downloading the sounds again…'); loadSounds(true).then(() => { renderSettings(); if (snd.ready) toast('Sounds ready'); }); }
  if (id === 'st-sync') { closeSheet('sheet-settings'); openSync(); }
  if (id === 'st-clear') clearAllData();
  if (id === 'st-log') { closeSheet('sheet-settings'); showLog(); }
  if (id === 'st-reset' && confirm('Reset all settings to their defaults? (Your songs stay.)')) {
    prefs = { ...DEFAULT_PREFS }; await savePrefs(); applyDisplayPrefs(true); renderSettings(); toast('Settings reset');
  }
});
$('#settings-body').addEventListener('change', (e) => {
  if (e.target.id === 'st-restore' && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; closeSheet('sheet-settings'); restoreBackup(f); }
});
async function openSettings() { closeSheet('sheet-more'); await renderSettings(); openSheet('sheet-settings'); }
['#set-btn', '#set-btn-2', '#set-btn-3'].forEach((id) => { $(id).onclick = openSettings; });

// ---------------- start-up ----------------
(async () => {
  try {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* */ }
    await loadPrefs();
    applyScoreTexts(api);
    loadSounds();
    state.practice = (await db.getSetting('chordPractice', [])) || [];
    // view: from the defaults in Settings (the last on-screen choices are kept during the session)
    state.showStd = prefs.defaultView !== 'tab';
    state.showTab = prefs.defaultView !== 'std';
    state.showFret = !!prefs.defaultFret;
    state.scale = isMobile() ? prefs.zoomPhone : prefs.zoomDesktop;
    api.settings.display.scale = state.scale;
    $('#zoom-val-2').textContent = Math.round(state.scale * 100) + '%';
    applyDisplayPrefs();
    applyStaves();
    state.count = !!prefs.countInDefault;
    api.countInVolume = 0; // count-in is done by the app (startCountIn)
    setPressed(['t-count', 't-count-2'], state.count);
    setSpeed(prefs.defaultSpeed);
    setLibTab((await db.getSetting('libTab')) || 'songs');
    tuner.deviceId = (await db.getSetting('tunerInput')) || null;
    const au = await db.getSetting('audio');
    if (au) { audio.vol = au.vol ?? 80; audio.muted = !!au.muted; }
    applyVolume(false);
    const t = await db.getSetting('tuner');
    if (t) {
      const want = prefs.tunerDefault === 'last' ? t.tuning : prefs.tunerDefault;
      tn.tuning = TUNER_TUNINGS.find((x) => x.id === want) || TUNER_TUNINGS[0];
      setA4(t.a4 || 440);
      tuner.setGain(t.gain || 4);
      $('#tn-gain').value = t.gain || 4;
    }
    if (!t && prefs.tunerDefault !== 'last') tn.tuning = TUNER_TUNINGS.find((x) => x.id === prefs.tunerDefault) || TUNER_TUNINGS[0];
    renderTunerStatic();
    editor.load(newDoc());
    fillEditorFields();
    await refreshLibrary();
    await loadDemoSongs();
    await updateSyncLabel();
    startAutoSync();
    window.__rbReady = true;
    log('info', 'Ready');
    // on PC, reopen the last song
    const last = await db.getSetting('lastSource');
    if (!isMobile() && last && last.type === 'song') {
      const s = await db.get('songs', last.id);
      if (s && !s.deleted) openSong(s);
    }
  } catch (err) {
    console.error('Start-up failed:', err);
    window.__rbBootFail('Start-up failed: ' + esc(err.message || err) + '<br><br>If this browser is in private mode, local storage may be blocked.');
  }
  paintRanges();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Offline mode unavailable:', e.message));
  }
})();

window.riffbook = { api, state, db, selectBars, barTicks };
