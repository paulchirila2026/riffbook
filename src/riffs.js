import { MORE_RIFFS } from './riffs-more.js';
import { tuningTex } from './editor.js';
// Built-in riff library (original riffs, written in the style of each genre).
// Each riff is written in alphaTex (the text format of the alphaTab library):
//   fret.string (string 6 = low E), :8 = eighths, :16 = sixteenths,
//   (a b c) = chord, {pm} = palm mute, {h} = hammer-on, {b (0 4)} = full-step bend,
//   {v} = vibrato, x.6 = dead note, r = rest, | = bar line.

export const TUNINGS = {
  standard: { name: 'Standard', notes: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'] },
  dropd: { name: 'Drop D', notes: ['E4', 'B3', 'G3', 'D3', 'A2', 'D2'] },
};

// MIDI programs (sounds) used for playback
export const TONES = [
  { id: 'dist', name: 'Distortion', desc: 'rock / metal, high-gain', program: 30 },
  { id: 'od', name: 'Overdrive', desc: 'warm blues crunch', program: 29 },
  { id: 'clean', name: 'Clean', desc: 'no effects', program: 27 },
  { id: 'jazz', name: 'Jazz', desc: 'round, dark tone', program: 26 },
  { id: 'acoustic', name: 'Acoustic', desc: 'steel strings', program: 25 },
  { id: 'nylon', name: 'Classical', desc: 'nylon strings', program: 24 },
];

const rep = (s, n) => Array(n).fill(s).join(' ');

// Blues shuffle (triplet quarter + eighth = swing feel)
function shuffleBar(root, five, six) {
  const a = `(${root} ${five})`, b = `(${root} ${six})`;
  const pair = (x) => `:4 ${x}{tu 3} :8 ${x}{tu 3}`;
  return [pair(a), pair(a), pair(b), pair(b)].join(' ');
}
const E_SH = shuffleBar('0.6', '2.5', '4.5');
const A_SH = shuffleBar('0.5', '2.4', '4.4');
const B_SH = shuffleBar('2.5', '4.4', '6.4');

// Funk: 16-character pattern, C = chord, . = muted strum (scratch)
function scratch(pattern, chord, mute) {
  return ':16 ' + pattern.split('').map((c) => (c === 'C' ? chord : mute)).join(' ');
}
const E9 = '(7.5 6.4 7.3 7.2 7.1)';
const MUTE = '(x.5 x.4 x.3 x.2)';

const A5 = '(0.5 2.4)', A6 = '(0.5 4.4)', D5 = '(0.4 2.3)', D6 = '(0.4 4.3)';
const chA = '(0.5 2.4 2.3 2.2 0.1)', chD = '(0.4 2.3 3.2 2.1)', chG = '(3.6 2.5 0.4 0.3 0.2 3.1)';
const pm = '0.6{pm}';
const dm7 = '(5.5 5.3 6.2 5.1)', g7 = '(3.6 3.4 4.3 3.2)', cmaj7 = '(3.5 4.3 5.2 3.1)';

const BASE_RIFFS = [
  // ---------- ROCK ----------
  {
    id: 'r01', name: 'A boogie', genre: 'Rock', style: 'AC/DC style', level: 'Easy', bpm: 128, tone: 'od',
    tex: [rep(`${A5} ${A5} ${A6} ${A6}`, 2), rep(`${D5} ${D5} ${D6} ${D6}`, 2), rep(`${A5} ${A5} ${A6} ${A6}`, 2),
      `${A5} ${A5} ${A6} ${A6} :4 (0.6 2.5 2.4) r`].map((b, i) => (i === 3 ? ':8 ' + b : ':8 ' + b)).join(' | '),
  },
  {
    id: 'r02', name: 'Open chords with stops', genre: 'Rock', style: 'AC/DC style', level: 'Easy', bpm: 120, tone: 'od',
    tex: `:8 ${chA} r r ${chA} :4 r :8 ${chD} ${chD} | :8 ${chG} r r ${chG} :4 r :8 ${chD} ${chA} | :8 ${chA} r r ${chA} :4 r :8 ${chD} ${chD} | :4 ${chG} ${chD} :2 ${chA}`,
  },
  {
    id: 'r03', name: 'A pedal tone', genre: 'Rock', style: 'hard rock', level: 'Easy', bpm: 112, tone: 'od',
    tex: ':8 0.5 2.4 0.5 4.4 0.5 5.4 0.5 4.4 | :8 0.5 2.4 0.5 4.4 0.5 2.3 0.5 4.4 | :8 0.5 2.4 0.5 4.4 0.5 5.4 0.5 7.4 | :4 5.4 4.4 :2 (0.5 2.4 2.3)',
  },
  {
    id: 'r04', name: 'Palm-muted power chords', genre: 'Rock', style: 'classic rock', level: 'Easy', bpm: 120, tone: 'dist',
    tex: `:8 ${rep(pm, 4)} (3.6 5.5) ${pm} (5.6 7.5) ${pm} | :8 ${rep(pm, 4)} (7.6 9.5) (5.6 7.5) (3.6 5.5) ${pm} | :8 ${rep(pm, 4)} (3.6 5.5) ${pm} (5.6 7.5) ${pm} | :4 (0.6 2.5 2.4) :8 r (3.6 5.5) :2 (5.6 7.5 7.4)`,
  },
  {
    id: 'r05', name: 'E pentatonic rock', genre: 'Rock', style: 'blues-rock', level: 'Medium', bpm: 104, tone: 'od',
    tex: ':8 0.6 3.6 0.5 2.5 :4 0.4 :8 2.4 0.5 | :8 0.6 3.6 0.5 2.5 :16 0.4 2.4 0.4 2.4 :8 0.5 3.6 | :8 0.6 3.6 0.5 2.5 :4 0.4 :8 2.4 0.5 | :8 0.6 3.6 0.5 2.5 2.4{h} 4.4 :4 2.3{v}',
  },
  {
    id: 'r06', name: 'Hammer-ons in A', genre: 'Rock', style: 'hard rock', level: 'Medium', bpm: 100, tone: 'od',
    tex: ':16 0.5 0.5 2.4{h} 4.4 0.5 0.5 2.4{h} 4.4 0.5 0.5 2.3{h} 4.3 2.4 0.4 2.5 0.5 | :16 0.5 0.5 2.4{h} 4.4 0.5 0.5 2.4{h} 4.4 :8 5.4 4.4 2.4 0.4 | :16 0.5 0.5 2.4{h} 4.4 0.5 0.5 2.4{h} 4.4 0.5 0.5 2.3{h} 4.3 2.4 0.4 2.5 0.5 | :8 0.5 3.6{h} 5.6 0.5 :2 (0.5 2.4 2.3)',
  },

  // ---------- METAL ----------
  {
    id: 'm01', name: 'E gallop', genre: 'Metal', style: 'heavy metal', level: 'Medium', bpm: 140, tone: 'dist',
    tex: (() => {
      const g = `:8 ${pm} :16 ${pm} ${pm}`;
      return `${rep(g, 4)} | ${g} ${g} :4 (1.6 3.5) (3.6 5.5) | ${rep(g, 4)} | ${g} :8 (5.6 7.5) :16 (5.6 7.5) (5.6 7.5) :8 (3.6 5.5) :16 (3.6 5.5) (3.6 5.5) :4 (1.6 3.5)`;
    })(),
  },
  {
    id: 'm02', name: '16th-note downpicking', genre: 'Metal', style: 'thrash', level: 'Hard', bpm: 150, tone: 'dist',
    tex: `:16 ${rep(pm, 6)} (3.6 5.5) ${rep(pm, 7)} (5.6 7.5) ${pm} | :16 ${rep(pm, 6)} (3.6 5.5) ${rep(pm, 5)} :8 (6.6 8.5) (5.6 7.5) | :16 ${rep(pm, 6)} (3.6 5.5) ${rep(pm, 7)} (5.6 7.5) ${pm} | :16 ${rep(pm, 4)} :4 (1.6 3.5) (0.6 2.5) (0.6 2.5 2.4)`,
  },
  {
    id: 'm03', name: 'Drop D riff', genre: 'Metal', style: 'groove metal', level: 'Medium', bpm: 110, tone: 'dist', tuning: 'dropd',
    tex: ':8 (0.6 0.5 0.4) 0.6{pm} 0.6{pm} (3.6 3.5 3.4) 0.6{pm} 0.6{pm} (5.6 5.5 5.4) (6.6 6.5 6.4) | :8 (0.6 0.5 0.4) 0.6{pm} 0.6{pm} (3.6 3.5 3.4) 0.6{pm} :16 0.6{pm} 0.6{pm} :4 (5.6 5.5 5.4) | :8 (0.6 0.5 0.4) 0.6{pm} 0.6{pm} (3.6 3.5 3.4) 0.6{pm} 0.6{pm} (5.6 5.5 5.4) (6.6 6.5 6.4) | :4 (0.6 0.5 0.4) :8 r (8.6 8.5 8.4) :2 (7.6 7.5 7.4)',
  },
  {
    id: 'm04', name: 'Chromatic thrash', genre: 'Metal', style: 'thrash', level: 'Hard', bpm: 150, tone: 'dist',
    tex: ':16 0.6{pm} 1.6 0.6{pm} 2.6 0.6{pm} 3.6 0.6{pm} 4.6 0.6{pm} 5.6 0.6{pm} 4.6 0.6{pm} 3.6 0.6{pm} 2.6 | :16 0.6{pm} 1.6 0.6{pm} 2.6 0.6{pm} 3.6 0.6{pm} 4.6 :4 (7.6 9.5) (6.6 8.5) | :16 0.6{pm} 1.6 0.6{pm} 2.6 0.6{pm} 3.6 0.6{pm} 4.6 0.6{pm} 5.6 0.6{pm} 4.6 0.6{pm} 3.6 0.6{pm} 2.6 | :4 (1.6 3.5) :8 (0.6 2.5) (0.6 2.5) :2 (0.6 2.5 2.4)',
  },
  {
    id: 'm05', name: 'Melodic tremolo in E minor', genre: 'Metal', style: 'melodic metal', level: 'Hard', bpm: 140, tone: 'dist',
    tex: `:16 ${rep('7.2', 4)} ${rep('8.2', 4)} ${rep('10.2', 4)} ${rep('8.2', 4)} | :16 ${rep('7.2', 4)} ${rep('5.2', 4)} ${rep('3.2', 4)} ${rep('5.2', 4)} | :16 ${rep('7.2', 4)} ${rep('8.2', 4)} ${rep('10.2', 4)} ${rep('8.2', 4)} | :16 ${rep('12.2', 4)} ${rep('10.2', 4)} :2 7.2{v}`,
  },
  {
    id: 'm06', name: 'Syncopated palm-mute accents', genre: 'Metal', style: 'modern metal', level: 'Medium', bpm: 130, tone: 'dist',
    tex: `:16 ${pm} ${pm} (2.5 2.4) ${pm} ${pm} (2.5 2.4) ${pm} ${pm} :8 (5.5 5.4) ${pm} :16 ${pm} ${pm} (3.5 3.4) ${pm} | :16 ${pm} ${pm} (2.5 2.4) ${pm} ${pm} (2.5 2.4) ${pm} ${pm} :4 (5.5 5.4) (7.5 7.4) | :16 ${pm} ${pm} (2.5 2.4) ${pm} ${pm} (2.5 2.4) ${pm} ${pm} :8 (5.5 5.4) ${pm} :16 ${pm} ${pm} (3.5 3.4) ${pm} | :4 (0.6 2.5 2.4) :8 r ${pm} :2 (3.6 5.5 5.4)`,
  },

  // ---------- BLUES ----------
  {
    id: 'b01', name: '12-bar shuffle in E', genre: 'Blues', style: 'Chicago blues', level: 'Easy', bpm: 96, tone: 'od',
    tex: [E_SH, E_SH, E_SH, E_SH, A_SH, A_SH, E_SH, E_SH, B_SH, A_SH, E_SH, B_SH].join(' | '),
  },
  {
    id: 'b02', name: 'A blues lick', genre: 'Blues', style: 'pentatonic', level: 'Medium', bpm: 90, tone: 'od',
    tex: ':8 8.1 5.1 8.2 5.2 :4 7.3{b (0 4)} :8 5.3 7.4 | :8 5.3 7.4 5.4 7.5 :4 5.5 5.6{v} | :16 5.1 8.1 5.1 8.1 :8 5.2 8.2{b (0 4)} 8.2 5.2 :4 7.3 | :8 7.3 5.3 7.4 5.4 :2 7.5{v}',
  },
  {
    id: 'b03', name: 'E turnaround', genre: 'Blues', style: 'acoustic', level: 'Medium', bpm: 80, tone: 'acoustic',
    tex: ':8 0.1 (4.3 0.1) 0.1 (3.3 0.1) 0.1 (2.3 0.1) 0.1 (1.3 0.1) | :2 (0.6 2.5 2.4 1.3 0.2 0.1) (2.5 1.4 2.3 0.2 2.1)',
  },

  // ---------- FUNK ----------
  {
    id: 'f01', name: 'E9 scratch', genre: 'Funk', style: 'classic funk', level: 'Medium', bpm: 100, tone: 'clean',
    tex: [scratch('C..C.C..C..C.C..', E9, MUTE), scratch('C.C..C.CC..C.C.C', E9, MUTE), scratch('C..C.C..C..C.C..', E9, MUTE), ':4 ' + E9 + ' r :2 ' + E9].join(' | '),
  },
  {
    id: 'f02', name: 'Single-string funk', genre: 'Funk', style: 'groove', level: 'Medium', bpm: 96, tone: 'clean',
    tex: ':16 0.6 x.6 0.6 3.6 x.6 5.6 x.6 0.6 x.6 0.6 3.6 x.6 2.5 x.5 2.5 x.6 | :16 0.6 x.6 0.6 3.6 x.6 5.6 x.6 0.6 :8 7.5 5.5 :16 2.5{h} 4.5 x.6 0.6 | :16 0.6 x.6 0.6 3.6 x.6 5.6 x.6 0.6 x.6 0.6 3.6 x.6 2.5 x.5 2.5 x.6 | :8 0.6 r :4 (0.6 2.5) :2 r',
  },
  {
    id: 'f03', name: 'Octave funk', genre: 'Funk', style: 'disco-funk', level: 'Medium', bpm: 104, tone: 'clean',
    tex: ':16 (5.6 7.4) x.6 (5.6 7.4) r (5.6 7.4) x.6 r (5.6 7.4) :8 (7.6 9.4) (5.6 7.4) :16 r (3.6 5.4) x.6 (5.6 7.4) | :16 (5.6 7.4) x.6 (5.6 7.4) r (5.6 7.4) x.6 r (5.6 7.4) :4 (10.6 12.4) (8.6 10.4) | :16 (5.6 7.4) x.6 (5.6 7.4) r (5.6 7.4) x.6 r (5.6 7.4) :8 (7.6 9.4) (5.6 7.4) :16 r (3.6 5.4) x.6 (5.6 7.4) | :2 (5.6 7.4) r',
  },

  // ---------- JAZZ ----------
  {
    id: 'j01', name: 'ii–V–I in C', genre: 'Jazz', style: 'Charleston rhythm', level: 'Medium', bpm: 90, tone: 'jazz',
    tex: `:4 ${dm7} :8 r ${dm7} :2 r | :4 ${g7} :8 r ${g7} :2 r | :1 ${cmaj7} | :1 ${cmaj7}`,
  },
  {
    id: 'j02', name: 'Am7 – D7 – Gmaj7 arpeggios', genre: 'Jazz', style: 'easy bebop', level: 'Hard', bpm: 100, tone: 'jazz',
    tex: ':8 5.6 7.5 5.4 5.3 5.2 5.3 5.4 7.5 | :8 5.5 4.4 7.4 5.3 7.3 5.3 7.4 4.4 | :8 3.6 2.5 5.5 4.4 :2 (3.6 4.4 4.3 3.2)',
  },
];

// Builds the full alphaTex text for a riff
export function riffToTex(r) {
  const name = String(r.name).replace(/"/g, "'");
  return `\\title "${name}" \\tempo ${r.bpm || 120} \\tuning ${tuningTex(r.tuning || 'standard')} .\n${r.tex}`;
}

export const BUILTIN_RIFFS = [...BASE_RIFFS, ...MORE_RIFFS];
