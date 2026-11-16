// Acordor: detectarea frecvenței din microfon (autocorelație).
// Procesările automate ale microfonului (anulare ecou, reducere zgomot,
// control automat al volumului) sunt oprite — altfel telefonul „aude” slab instrumentul.

export const TUNER_TUNINGS = [
  { id: 'standard', name: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'dropd', name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'eb', name: 'Eb Standard', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { id: 'dstd', name: 'D Standard', notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { id: 'dropc', name: 'Drop C', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { id: 'dropb', name: 'Drop B', notes: ['B1', 'F#2', 'B2', 'E3', 'G#3', 'C#4'] },
  { id: 'openg', name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { id: 'opend', name: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  { id: 'dadgad', name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'opene', name: 'Open E', notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'] },
];

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

export function noteToMidi(n) {
  const m = /^([A-G][b#]?)(-?\d)$/.exec(n);
  let name = m[1];
  if (FLAT[name]) name = FLAT[name];
  return NAMES.indexOf(name) + (parseInt(m[2], 10) + 1) * 12;
}
export function midiToFreq(m, a4 = 440) { return a4 * Math.pow(2, (m - 69) / 12); }
export function freqToMidi(f, a4 = 440) { return 69 + 12 * Math.log2(f / a4); }
export function midiName(m) { return NAMES[((Math.round(m) % 12) + 12) % 12]; }
export function prettyNote(n) { return n.replace(/(-?\d)$/, '').replace('#', '♯').replace('b', '♭'); }

// Algoritm de autocorelație (varianta ACF2+), returnează frecvența sau -1
function autoCorrelate(buf, sampleRate, threshold) {
  let size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / size);
  if (rms < threshold) return { freq: -1, rms };

  // tăiem marginile liniștite
  let r1 = 0, r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < size / 2; i++) if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
  buf = buf.slice(r1, r2);
  size = buf.length;

  // căutăm perioade doar până la ~45 Hz (suficient pentru Drop B / Drop A)
  const maxLag = Math.min(size - 1, Math.ceil(sampleRate / 45));
  const c = new Float32Array(maxLag + 1);
  for (let i = 0; i <= maxLag; i++) {
    let sum = 0;
    for (let j = 0; j < size - i; j++) sum += buf[j] * buf[j + i];
    c[i] = sum;
  }
  let d = 0;
  while (d < maxLag && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i <= maxLag; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  let T0 = maxpos;
  if (T0 <= 0) return { freq: -1, rms };
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || x2;
  const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  return { freq: sampleRate / T0, rms };
}

export class Tuner {
  constructor(onData) {
    this.onData = onData;
    this.running = false;
    this.gain = 4;           // amplificare (sensibilitate)
    this.threshold = 0.008;  // prag de semnal
    this.deviceId = null;
    this._hist = [];
  }

  async listInputs() {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      return devs.filter((d) => d.kind === 'audioinput');
    } catch { return []; }
  }

  async start() {
    if (this.running) return;
    const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    if (this.deviceId) audio.deviceId = { exact: this.deviceId };
    // iPhone: allow the microphone (otherwise the audio system is “playback only”)
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch { /* */ }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.gain;
    // filtru trece-jos: elimină armonicele foarte înalte care încurcă detectarea
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    src.connect(this.gainNode).connect(lp).connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.running = true;
    this._loop();
  }

  setGain(g) { this.gain = g; if (this.gainNode) this.gainNode.gain.value = g; }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close();
    this.stream = this.ctx = null;
    // iPhone: give the sound back to the loudspeaker (with the mic on it moves to the earpiece)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* */ }
    if (this.onStopped) this.onStopped();
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    if (this._last && now - this._last < 40) { this._raf = requestAnimationFrame(() => this._loop()); return; }
    this._last = now;
    this.analyser.getFloatTimeDomainData(this.buf);
    const { freq, rms } = autoCorrelate(this.buf, this.ctx.sampleRate, this.threshold);
    let f = -1;
    if (freq > 25 && freq < 1500) {
      this._hist.push(freq);
      if (this._hist.length > 5) this._hist.shift();
      const sorted = [...this._hist].sort((a, b) => a - b);
      f = sorted[Math.floor(sorted.length / 2)]; // median — steadier display
    } else {
      this._hist = [];
    }
    this.onData({ freq: f, level: Math.min(1, rms * 8) });
    this._raf = requestAnimationFrame(() => this._loop());
  }

  // Ton de referință pentru o coardă
  playReference(freq, a4 = 440) {
    const ctx = (window.__rbCtx && window.__rbCtx.state !== 'closed') ? window.__rbCtx : (this._refCtx || (this._refCtx = new (window.AudioContext || window.webkitAudioContext)()));
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 2.3);
  }
}
