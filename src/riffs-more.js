// Extra built-in riffs (original exercises in the style of each genre).
// Same alphaTex notation as riffs.js: fret.string (6 = low E), :8 eighths, :16 sixteenths,
// (..) chord, {pm} palm mute, {h} hammer-on, {sl} slide, {b (0 4)} full bend, {v} vibrato, x = dead note, r = rest.

const rep = (s, n) => Array(n).fill(s).join(' ');
const bars = (...b) => b.join(' | ');

// power chords (root on string s)
const pc = (f, s = 6) => `(${f}.${s} ${f + 2}.${s - 1})`;
const pc3 = (f, s = 6) => `(${f}.${s} ${f + 2}.${s - 1} ${f + 2}.${s - 2})`;
const P = (f = 0, s = 6) => `${f}.${s}{pm}`;
// drop tunings: one-finger chords
const D1 = (f) => `(${f}.6 ${f}.5 ${f}.4)`;
// eighth + two sixteenths
const gal = (x) => `:8 ${x} :16 ${x} ${x}`;
const rgal = (x) => `:16 ${x} ${x} :8 ${x}`;

// boogie (5th ↔ 6th)
function boogie(f, s) {
  const a = `(${f}.${s} ${f + 2}.${s - 1})`, b = `(${f}.${s} ${f + 4}.${s - 1})`;
  return `:8 ${a} ${a} ${b} ${b} ${a} ${a} ${b} ${b}`;
}
// shuffle: triplet quarter + eighth
const pair = (x) => `:4 ${x}{tu 3} :8 ${x}{tu 3}`;
function shuf(f, s, seventh = false) {
  const a = `(${f}.${s} ${f + 2}.${s - 1})`, b = `(${f}.${s} ${f + 4}.${s - 1})`, c = `(${f}.${s} ${f + 5}.${s - 1})`;
  return seventh ? [pair(a), pair(b), pair(c), pair(b)].join(' ') : [pair(a), pair(a), pair(b), pair(b)].join(' ');
}
const trip = (x, y, z) => `:8 ${x}{tu 3} ${y}{tu 3} ${z}{tu 3}`;
const tripC = (c) => trip(c, c, c);

// funk scratch: 16-char pattern, C = chord, . = muted strum
const scratch = (pattern, chord, mute) => ':16 ' + pattern.split('').map((c) => (c === 'C' ? chord : mute)).join(' ');
const M5 = '(x.5 x.4 x.3 x.2)', M6 = '(x.6 x.4 x.3 x.2)';
const nine = (f) => `(${f}.5 ${f - 1}.4 ${f}.3 ${f}.2 ${f}.1)`;
const FP = ['C..C.C..C..C.C..', 'C.C..C.CC..C.C.C', '..C...C...C.C...', 'C...C.C...C.C.CC', '.C.C.C.C.C.C.C.C', 'CC..C..CC..C..C.', 'C.CC.C.CC.C..C.C'];

// jazz chord shapes
const m7r5 = (f) => `(${f}.5 ${f + 2}.4 ${f}.3 ${f + 1}.2)`;
const d7r6 = (f) => `(${f}.6 ${f}.4 ${f + 1}.3 ${f}.2)`;
const d7r5 = (f) => `(${f}.5 ${f + 2}.4 ${f}.3 ${f + 2}.2)`;
const maj7r5 = (f) => `(${f}.5 ${f + 2}.4 ${f + 1}.3 ${f + 2}.2)`;
const maj7r6 = (f) => `(${f}.6 ${f + 1}.4 ${f + 1}.3 ${f}.2)`;
const m7r6 = (f) => `(${f}.6 ${f}.4 ${f}.3 ${f}.2)`;
const m7b5r5 = (f) => `(${f}.5 ${f + 1}.4 ${f}.3 ${f + 1}.2)`;
const charleston = (x) => `:4 ${x} :8 r ${x} :2 r`;
const four = (x) => `:4 ${x} ${x} ${x} ${x}`;
const anticip = (x) => `:8 r ${x} :4 r :8 r ${x} :4 r`;
const iiVI = (k, rh) => bars(rh(m7r5(k + 2)), rh(d7r6(k)), rh(maj7r5(k)), `:1 ${maj7r5(k)}`);

const R = (o) => ({ genre: 'Rock', tone: 'od', ...o });
const MT = (o) => ({ genre: 'Metal', tone: 'dist', ...o });
const B = (o) => ({ genre: 'Blues', tone: 'od', ...o });
const F = (o) => ({ genre: 'Funk', tone: 'clean', ...o });
const J = (o) => ({ genre: 'Jazz', tone: 'jazz', ...o });

const chA = '(0.5 2.4 2.3 2.2)', chAsus = '(0.5 2.4 2.3 3.2)', chDA = '(0.5 0.4 2.3 3.2)';
const G_ = '(3.6 2.5 0.4 0.3 0.2 3.1)', C_ = '(3.5 2.4 0.3 1.2 0.1)', D_ = '(0.4 2.3 3.2 2.1)';

export const MORE_RIFFS = [
  // =================== ROCK ===================
  R({ id: 'r07', name: 'E boogie (I–IV)', style: 'boogie rock', level: 'Easy', bpm: 132, tex: bars(boogie(0, 6), boogie(0, 6), boogie(0, 5), boogie(0, 6)) }),
  R({ id: 'r08', name: 'G boogie (movable)', style: 'boogie rock', level: 'Medium', bpm: 128, tex: bars(boogie(3, 6), boogie(3, 6), boogie(3, 5), boogie(3, 6)) }),
  R({ id: 'r09', name: 'D boogie (movable)', style: 'boogie rock', level: 'Medium', bpm: 128, tex: bars(boogie(5, 5), boogie(5, 5), boogie(5, 4), boogie(5, 5)) }),
  R({ id: 'r10', name: 'C boogie (movable)', style: 'boogie rock', level: 'Medium', bpm: 124, tex: bars(boogie(3, 5), boogie(3, 5), boogie(3, 4), boogie(3, 5)) }),
  R({ id: 'r11', name: 'A sus4 rhythm riff', style: 'AC/DC style', level: 'Easy', bpm: 122,
    tex: bars(`:8 ${chA} ${chA} ${chAsus} ${chAsus} ${chA} r ${chDA} r`, `:8 ${chA} ${chA} ${chAsus} ${chAsus} ${chA} r ${chDA} r`,
      `:8 (3.6 5.5 5.4) r (3.6 5.5 5.4) r :4 (0.5 2.4 2.3) r`, `:8 ${chA} ${chA} ${chAsus} ${chAsus} ${chA} r ${chDA} r`) }),
  R({ id: 'r12', name: 'Backbeat stabs in E', style: 'AC/DC style', level: 'Easy', bpm: 126,
    tex: bars(`:8 ${P()} ${P()} (0.6 2.5 2.4) ${P()} ${P()} ${P()} (0.6 2.5 2.4) ${P()}`,
      `:8 ${P(0, 5)} ${P(0, 5)} (0.5 2.4 2.3) ${P(0, 5)} ${P(0, 5)} ${P(0, 5)} (0.5 2.4 2.3) ${P(0, 5)}`,
      `:8 ${P()} ${P()} (0.6 2.5 2.4) ${P()} ${P()} ${P()} (0.6 2.5 2.4) ${P()}`, ':4 (2.5 4.4 4.3) (2.5 4.4 4.3) :2 (0.6 2.5 2.4)') }),
  R({ id: 'r13', name: 'Rock’n’roll double-stops in A', style: 'classic rock', level: 'Medium', bpm: 150,
    tex: bars(`:8 ${rep('(5.2 5.1)', 4)} (8.2 8.1) (8.2 8.1) (5.2 5.1) (5.2 5.1)`, ':8 (7.3 5.2) (7.3 5.2) (5.3 5.2) (5.3 5.2) :4 7.4 5.4',
      `:8 ${rep('(5.2 5.1)', 4)} (8.2 8.1) (8.2 8.1) (5.2 5.1) (5.2 5.1)`, ':8 7.3{b (0 4)} 5.2 5.1 8.2 :2 5.1{v}') }),
  R({ id: 'r14', name: 'Descending G–F–E', style: 'hard rock', level: 'Easy', bpm: 110,
    tex: bars(`:4 ${pc(3)} :8 ${pc(3)} ${pc(1)} :4 ${pc(1)} :8 r ${pc(0)}`, `:2 ${pc(0)} :8 ${rep(P(), 4)}`, `:4 ${pc(3)} :8 ${pc(3)} ${pc(1)} :4 ${pc(1)} :8 r ${pc(0)}`, `:2 ${pc(0)} :8 ${rep(P(), 4)}`) }),
  R({ id: 'r15', name: 'A pedal with chord hits', style: 'arena rock', level: 'Easy', bpm: 132,
    tex: bars(`:8 ${rep(P(0, 5), 4)} (3.5 5.4) ${P(0, 5)} (5.5 7.4) ${P(0, 5)}`, `:8 ${rep(P(0, 5), 4)} (7.5 9.4) (5.5 7.4) (3.5 5.4) ${P(0, 5)}`,
      `:8 ${rep(P(0, 5), 4)} (3.5 5.4) ${P(0, 5)} (5.5 7.4) ${P(0, 5)}`, ':2 (0.5 2.4 2.3) (3.5 5.4 5.3)') }),
  R({ id: 'r16', name: 'E minor riff', style: 'classic rock', level: 'Easy', bpm: 116,
    tex: bars(':8 0.6 0.6 3.6 0.6 5.6 0.6 3.6 2.6', `:8 0.6 0.6 3.6 0.6 5.6 0.6 :4 ${pc(3)}`, ':8 0.6 0.6 3.6 0.6 5.6 0.6 3.6 2.6', `:4 ${pc(5)} ${pc(3)} :2 (0.6 2.5 2.4)`) }),
  R({ id: 'r17', name: 'G–C–D strumming', style: 'acoustic rock', level: 'Easy', bpm: 100, tone: 'acoustic',
    tex: bars(...[G_, C_, G_, D_].map((c) => `:4 ${c} :8 ${c} ${c} r ${c} :4 ${c}`)) }),
  R({ id: 'r18', name: 'A minor pentatonic run', style: 'lead rock', level: 'Medium', bpm: 96,
    tex: bars(':16 5.6 8.6 5.5 7.5 5.4 7.4 5.3 7.3 5.2 8.2 5.1 8.1 8.1 5.1 8.2 5.2', ':16 7.3 5.3 7.4 5.4 7.5 5.5 8.6 5.6 :2 5.6{v}') }),
  R({ id: 'r19', name: 'Syncopated pushes in A', style: 'hard rock', level: 'Medium', bpm: 128,
    tex: bars(`:8 ${pc(5)} r ${pc(5)} ${pc(8)} r ${pc(8)} ${pc(10)} ${pc(10)}`, `:4 ${pc(5)} :8 r ${pc(3)} :2 ${pc(3)}`,
      `:8 ${pc(5)} r ${pc(5)} ${pc(8)} r ${pc(8)} ${pc(10)} ${pc(10)}`, `:4 ${pc(5)} :8 r ${pc(3)} :2 ${pc(5)}`) }),
  R({ id: 'r20', name: 'Grunge in Drop D', style: 'grunge', level: 'Easy', bpm: 104, tone: 'dist', tuning: 'dropd',
    tex: bars(`:8 ${D1(0)} ${D1(0)} ${D1(3)} ${D1(2)} :4 ${D1(0)} :8 ${D1(5)} ${D1(3)}`, `:2 ${D1(0)} ${D1(7)}`,
      `:8 ${D1(0)} ${D1(0)} ${D1(3)} ${D1(2)} :4 ${D1(0)} :8 ${D1(5)} ${D1(3)}`, `:2 ${D1(5)} ${D1(0)}`) }),
  R({ id: 'r21', name: 'Slides and bends in A', style: 'blues rock', level: 'Medium', bpm: 100,
    tex: bars(':8 5.3{sl} 7.3 5.3 5.2 7.3{sl} 9.3 7.3 5.3', ':8 5.4 7.4 5.3 7.3{b (0 4)} :2 5.2{v}', ':8 5.3{sl} 7.3 5.3 5.2 7.3{sl} 9.3 7.3 5.3', ':8 7.4 5.4 7.5 5.5 :2 5.6{v}') }),
  R({ id: 'r22', name: 'Stadium octaves', style: 'arena rock', level: 'Medium', bpm: 120,
    tex: bars(`:8 ${rep('(7.5 9.3)', 4)} ${rep('(10.5 12.3)', 2)} ${rep('(5.5 7.3)', 2)}`, ':2 (12.5 14.3) (7.5 9.3)', `:8 ${rep('(7.5 9.3)', 4)} ${rep('(10.5 12.3)', 2)} ${rep('(5.5 7.3)', 2)}`, ':2 (5.5 7.3) (7.5 9.3)') }),
  R({ id: 'r23', name: 'Punk downstrokes G–C–D', style: 'punk rock', level: 'Medium', bpm: 170, tone: 'dist',
    tex: bars(`:8 ${rep(pc(3), 8)}`, `:8 ${rep(pc(3, 5), 8)}`, `:8 ${rep(pc(5, 5), 8)}`, `:8 ${rep(pc(3), 4)} :2 ${pc(3)}`) }),
  R({ id: 'r24', name: 'E hammer-on groove', style: 'classic rock', level: 'Medium', bpm: 100,
    tex: bars(':16 0.6 0.6 0.5{h} 2.5 0.6 0.6 0.4{h} 2.4 0.6 0.6 2.4 0.4 2.5 0.5 3.6 0.6', `:4 ${pc(0)} ${pc(3)} ${pc(5)} ${pc(3)}`,
      ':16 0.6 0.6 0.5{h} 2.5 0.6 0.6 0.4{h} 2.4 0.6 0.6 2.4 0.4 2.5 0.5 3.6 0.6', `:4 ${pc(5)} ${pc(3)} :2 (0.6 2.5 2.4)`) }),
  R({ id: 'r25', name: 'D with sus chords', style: 'classic rock', level: 'Easy', bpm: 110, tone: 'acoustic',
    tex: bars(':8 (0.4 2.3 3.2 2.1) (0.4 2.3 3.2 2.1) (0.4 2.3 3.2 3.1) (0.4 2.3 3.2 2.1) (0.4 2.3 3.2 0.1) (0.4 2.3 3.2 2.1) (0.4 2.3 3.2 2.1) r',
      ':8 (0.5 2.4 2.3 2.2 0.1) (0.5 2.4 2.3 2.2 0.1) (0.5 2.4 2.3 3.2 0.1) (0.5 2.4 2.3 2.2 0.1) (0.5 2.4 2.3 0.2 0.1) (0.5 2.4 2.3 2.2 0.1) (0.5 2.4 2.3 2.2 0.1) r',
      ':2 (3.6 2.5 0.4 0.3 3.2 3.1) (3.5 2.4 0.3 3.2 3.1)', ':1 (0.4 2.3 3.2 2.1)') }),

  // =================== METAL ===================
  MT({ id: 'm07', name: 'A gallop with chord changes', style: 'heavy metal', level: 'Medium', bpm: 150,
    tex: bars(rep(gal(P(5)), 4), `${gal(P(5))} ${gal(P(5))} :4 ${pc(8)} ${pc(10)}`, rep(gal(P(5)), 4), `${gal(P(5))} ${gal(pc(3))} ${gal(pc(1))} :4 ${pc(0)}`) }),
  MT({ id: 'm08', name: 'Pedal-point riff in E', style: 'NWOBHM', level: 'Hard', bpm: 140,
    tex: bars(':16 0.6 7.5 0.6 5.5 0.6 7.5 0.6 8.5 0.6 7.5 0.6 5.5 0.6 3.5 0.6 2.5', ':16 0.6 7.5 0.6 5.5 0.6 7.5 0.6 8.5 :4 (10.5 12.4) (7.5 9.4)',
      ':16 0.6 7.5 0.6 5.5 0.6 7.5 0.6 8.5 0.6 7.5 0.6 5.5 0.6 3.5 0.6 2.5', ':16 0.6 7.5 0.6 5.5 0.6 3.5 0.6 2.5 :2 (0.6 2.5 2.4)') }),
  MT({ id: 'm09', name: 'Slow doom riff', style: 'doom', level: 'Easy', bpm: 70,
    tex: bars(`:2 ${pc(0)} :4 ${pc(3)} :8 ${pc(6)} r`, `:2 ${pc(5)} ${pc(3)}`, `:2 ${pc(0)} :4 ${pc(3)} :8 ${pc(6)} r`, `:4 ${pc(0)} ${pc(1)} :2 ${pc(0)}`) }),
  MT({ id: 'm10', name: '16th chug with accents', style: 'thrash', level: 'Hard', bpm: 130,
    tex: bars(`:16 ${pc3(0)} ${rep(P(), 5)} ${pc3(0)} ${rep(P(), 3)} ${pc3(3)} ${rep(P(), 3)} ${pc3(5)} ${P()}`, `:16 ${pc3(0)} ${rep(P(), 5)} ${pc3(0)} ${P()} :4 ${pc3(1)} ${pc3(0)}`,
      `:16 ${pc3(0)} ${rep(P(), 5)} ${pc3(0)} ${rep(P(), 3)} ${pc3(3)} ${rep(P(), 3)} ${pc3(5)} ${P()}`, `:16 ${pc3(0)} ${rep(P(), 5)} ${pc3(0)} ${P()} :4 ${pc3(6)} ${pc3(5)}`) }),
  MT({ id: 'm11', name: 'Half-time breakdown', style: 'metalcore', level: 'Medium', bpm: 90, tuning: 'dropd',
    tex: bars(`:4 ${D1(0)} :8 r :16 ${P()} ${P()} :4 ${D1(0)} :8 r :16 ${P()} ${P()}`, `:8 ${D1(0)} r ${D1(0)} r :16 ${rep(P(), 4)} :8 ${D1(1)} r`,
      `:4 ${D1(0)} :8 r :16 ${P()} ${P()} :4 ${D1(0)} :8 r :16 ${P()} ${P()}`, `:8 ${D1(0)} r ${D1(3)} r :16 ${rep(P(), 4)} :8 ${D1(1)} ${D1(0)}`) }),
  MT({ id: 'm12', name: 'Tremolo melody in A minor', style: 'black metal', level: 'Hard', bpm: 150,
    tex: bars(`:16 ${rep('10.2', 4)} ${rep('8.2', 4)} ${rep('6.2', 4)} ${rep('5.2', 4)}`, `:16 ${rep('6.2', 4)} ${rep('8.2', 4)} :2 10.2{v}`,
      `:16 ${rep('10.2', 4)} ${rep('8.2', 4)} ${rep('6.2', 4)} ${rep('5.2', 4)}`, `:16 ${rep('6.2', 4)} ${rep('5.2', 4)} :2 3.2{v}`) }),
  MT({ id: 'm13', name: 'E harmonic minor run', style: 'neo-classical', level: 'Hard', bpm: 110,
    tex: bars(':16 0.1 2.1 3.1 5.1 7.1 8.1 11.1 12.1 12.1 11.1 8.1 7.1 5.1 3.1 2.1 0.1', ':16 7.2 8.2 7.2 5.2 4.2 5.2 7.2 8.2 :2 7.1{v}') }),
  MT({ id: 'm14', name: 'Chromatic descent', style: 'heavy metal', level: 'Medium', bpm: 130,
    tex: bars(`:8 ${pc(7)} ${P()} ${pc(6)} ${P()} ${pc(5)} ${P()} ${pc(4)} ${P()}`, `:4 ${pc(3)} ${pc(2)} :2 ${pc(0)}`, `:8 ${pc(7)} ${P()} ${pc(6)} ${P()} ${pc(5)} ${P()} ${pc(4)} ${P()}`, `:4 ${pc(3)} ${pc(5)} :2 ${pc(7)}`) }),
  MT({ id: 'm15', name: 'Power-metal gallop in D minor', style: 'power metal', level: 'Medium', bpm: 160,
    tex: bars(`${gal(pc(5, 5))} ${gal(pc(5, 5))} ${gal(pc(8, 5))} ${gal(pc(8, 5))}`, `${gal(pc(1, 5))} ${gal(pc(1, 5))} ${gal(pc(3, 5))} ${gal(pc(3, 5))}`,
      `${gal(pc(5, 5))} ${gal(pc(5, 5))} ${gal(pc(8, 5))} ${gal(pc(10, 5))}`, `${gal(pc(8, 5))} ${gal(pc(3, 5))} :2 ${pc(5, 5)}`) }),
  MT({ id: 'm16', name: 'Industrial Drop D chug', style: 'industrial metal', level: 'Easy', bpm: 112, tuning: 'dropd',
    tex: bars(`:8 ${D1(0)} r :16 ${P()} ${P()} :8 ${D1(0)} r ${D1(0)} :16 ${P()} ${P()} :8 r`, `:8 ${D1(0)} r :16 ${P()} ${P()} :8 ${D1(3)} r ${D1(5)} :4 ${D1(3)}`,
      `:8 ${D1(0)} r :16 ${P()} ${P()} :8 ${D1(0)} r ${D1(0)} :16 ${P()} ${P()} :8 r`, `:8 ${D1(0)} r :16 ${P()} ${P()} :8 ${D1(5)} r ${D1(3)} :4 ${D1(1)}`) }),
  MT({ id: 'm17', name: '3+3+2 syncopation (Drop D)', style: 'modern metal', level: 'Hard', bpm: 120, tuning: 'dropd',
    tex: bars(`:16 ${rep(`${D1(0)} ${P()} ${P()} ${D1(0)} ${P()} ${P()} ${D1(0)} ${P()}`, 2)}`,
      `:16 ${D1(0)} ${P()} ${P()} ${D1(0)} ${P()} ${P()} ${D1(3)} ${P()} ${D1(5)} ${P()} ${P()} ${D1(6)} ${P()} ${P()} ${D1(5)} ${P()}`) }),
  MT({ id: 'm18', name: 'Open-string pull-offs', style: 'metal lead', level: 'Hard', bpm: 120,
    tex: bars(`:16 ${rep('12.1{h} 8.1{h} 0.1 8.1', 4)}`, `:16 ${rep('12.2{h} 8.2{h} 0.2 8.2', 2)} :2 12.1{v}`) }),
  MT({ id: 'm19', name: 'B minor riff', style: 'heavy metal', level: 'Medium', bpm: 126,
    tex: bars(`:8 ${P(7)} ${P(7)} ${pc(10)} ${P(7)} ${P(7)} ${pc(12)} ${pc(10)} ${P(7)}`, `:4 ${pc(5)} ${pc(3)} :2 ${pc(7)}`, `:8 ${P(7)} ${P(7)} ${pc(10)} ${P(7)} ${P(7)} ${pc(12)} ${pc(10)} ${P(7)}`, `:4 ${pc(10)} ${pc(12)} :2 ${pc(7)}`) }),
  MT({ id: 'm20', name: 'Reverse gallop', style: 'heavy metal', level: 'Medium', bpm: 140,
    tex: bars(rep(rgal(P()), 4), `${rgal(P())} ${rgal(P())} :4 ${pc(3)} ${pc(5)}`, rep(rgal(P()), 4), `${rgal(P())} ${rgal(pc(3))} :2 ${pc(0)}`) }),
  MT({ id: 'm21', name: 'Am–E arpeggios', style: 'neo-classical', level: 'Hard', bpm: 100,
    tex: bars(':16 7.4 5.3 5.2 5.1 5.2 5.3 7.4 5.3 6.4 4.3 5.2 4.1 5.2 4.3 6.4 4.3', ':16 7.4 5.3 5.2 5.1 5.2 5.3 7.4 5.3 :2 (7.4 5.3 5.2 5.1)') }),
  MT({ id: 'm22', name: 'Thrash 16ths with chords', style: 'thrash', level: 'Hard', bpm: 150,
    tex: bars(`:16 ${P()} ${P()} ${pc(1)} ${P()} ${P()} ${pc(3)} ${rep(P(), 4)} ${pc(1)} ${P()} ${P()} ${pc(5)} ${P()} ${pc(3)}`, `:16 ${P()} ${P()} ${pc(1)} ${P()} ${P()} ${pc(3)} ${P()} ${P()} :4 ${pc(6)} ${pc(5)}`,
      `:16 ${P()} ${P()} ${pc(1)} ${P()} ${P()} ${pc(3)} ${rep(P(), 4)} ${pc(1)} ${P()} ${P()} ${pc(5)} ${P()} ${pc(3)}`, `:16 ${P()} ${P()} ${pc(1)} ${P()} ${P()} ${pc(3)} ${P()} ${P()} :2 ${pc(0)}`) }),
  MT({ id: 'm23', name: 'Drop D one-finger pump', style: 'nu metal', level: 'Easy', bpm: 110, tuning: 'dropd',
    tex: bars(`:8 ${D1(0)} ${P()} ${P()} ${D1(0)} ${P()} ${P()} ${D1(5)} ${D1(3)}`, `:8 ${D1(0)} ${P()} ${P()} ${D1(0)} :4 ${D1(7)} ${D1(5)}`,
      `:8 ${D1(0)} ${P()} ${P()} ${D1(0)} ${P()} ${P()} ${D1(5)} ${D1(3)}`, `:8 ${D1(0)} ${P()} ${P()} ${D1(0)} :4 ${D1(3)} ${D1(1)}`) }),
  MT({ id: 'm24', name: 'Heavy Drop C riff', style: 'sludge', level: 'Easy', bpm: 80, tuning: 'dropc',
    tex: bars(`:4 ${D1(0)} :8 ${P()} ${P()} ${D1(3)} ${P()} ${D1(2)} ${P()}`, `:2 ${D1(0)} :4 ${D1(5)} ${D1(3)}`, `:4 ${D1(0)} :8 ${P()} ${P()} ${D1(3)} ${P()} ${D1(2)} ${P()}`, `:2 ${D1(0)} :4 ${D1(6)} ${D1(5)}`) }),
  MT({ id: 'm25', name: 'Galloping harmony in thirds', style: 'twin-guitar metal', level: 'Hard', bpm: 150,
    tex: bars(`${gal('(9.3 8.2)')} ${gal('(9.3 8.2)')} ${gal('(7.3 7.2)')} ${gal('(7.3 7.2)')}`, `${gal('(5.3 5.2)')} ${gal('(5.3 5.2)')} ${gal('(7.3 7.2)')} :4 (9.3 8.2)`,
      `${gal('(9.3 8.2)')} ${gal('(9.3 8.2)')} ${gal('(7.3 7.2)')} ${gal('(7.3 7.2)')}`, `${gal('(5.3 5.2)')} ${gal('(7.3 7.2)')} :2 (9.3 8.2)`) }),

  // =================== BLUES ===================
  B({ id: 'b04', name: '12-bar shuffle in A', style: 'Chicago blues', level: 'Easy', bpm: 96,
    tex: bars(...['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E'].map((c) => ({ A: shuf(0, 5), D: shuf(0, 4), E: shuf(0, 6) }[c]))) }),
  B({ id: 'b05', name: '12-bar shuffle in G (movable)', style: 'Chicago blues', level: 'Medium', bpm: 100,
    tex: bars(...['G', 'G', 'G', 'G', 'C', 'C', 'G', 'G', 'D', 'C', 'G', 'D'].map((c) => ({ G: shuf(3, 6), C: shuf(3, 5), D: shuf(5, 5) }[c]))) }),
  B({ id: 'b06', name: 'Quick-change shuffle in E', style: 'Texas blues', level: 'Easy', bpm: 104,
    tex: bars(...['E', 'A', 'E', 'E', 'A', 'A', 'E', 'E', 'B', 'A', 'E', 'B'].map((c) => ({ E: shuf(0, 6), A: shuf(0, 5), B: shuf(2, 5) }[c]))) }),
  B({ id: 'b07', name: '12-bar shuffle in C', style: 'jump blues', level: 'Medium', bpm: 110,
    tex: bars(...['C', 'C', 'C', 'C', 'F', 'F', 'C', 'C', 'G', 'F', 'C', 'G'].map((c) => ({ C: shuf(3, 5), F: shuf(1, 6), G: shuf(3, 6) }[c]))) }),
  B({ id: 'b08', name: 'Triplet lick in A', style: 'pentatonic', level: 'Medium', bpm: 84,
    tex: bars(`${trip('8.1', '5.1', '8.2')} ${trip('5.2', '7.3', '5.3')} ${trip('7.4', '5.4', '7.5')} :4 5.5`, `${trip('5.4', '7.4', '5.3')} ${trip('7.3', '5.3', '7.4')} :2 5.6{v}`) }),
  B({ id: 'b09', name: 'Slow blues box lick', style: 'B.B. King style box', level: 'Medium', bpm: 66,
    tex: bars(':8 10.2 12.2{b (0 4)} 10.2 12.1 10.1 10.2 :4 12.3', ':2 10.2{v} :4 r r', ':8 13.2{b (0 2)} 10.2 12.3 10.2 12.3 10.3 :4 12.4', ':2 12.3{v} :2 r') }),
  B({ id: 'b10', name: 'Double-stops in E', style: 'Texas blues', level: 'Medium', bpm: 100,
    tex: bars(':8 (0.3 0.2) (2.3 3.2) (0.3 0.2) (2.3 3.2) (4.3 5.2) (2.3 3.2) (0.3 0.2) 0.6', ':8 (0.3 0.2) (2.3 3.2) (0.3 0.2) (2.3 3.2) (4.3 5.2) (2.3 3.2) (0.3 0.2) 0.6', ':4 (2.4 2.3) (0.4 0.3) :2 (0.6 2.5 2.4)') }),
  B({ id: 'b11', name: 'Intro lick in E', style: 'Chicago blues', level: 'Medium', bpm: 80,
    tex: bars(`${trip('3.1', '0.1', '3.2')} ${trip('0.2', '2.3', '0.3')} ${trip('2.4', '0.4', '2.5')} :4 0.6`, ':2 (0.6 2.5 2.4) (2.5 1.4 2.3 0.2 2.1)') }),
  B({ id: 'b12', name: 'Ending in A (A7–B♭7–A7)', style: 'classic ending', level: 'Easy', bpm: 90,
    tex: bars(`${trip('8.1', '5.1', '8.2')} ${trip('5.2', '7.3', '5.3')} ${trip('7.4', '5.4', '7.5')} :4 5.6`, ':4 (0.5 2.4 0.3 2.2) :8 r (1.5 3.4 1.3 3.2) :2 (0.5 2.4 0.3 2.2)') }),
  B({ id: 'b13', name: 'Minor blues lick in Am', style: 'minor blues', level: 'Medium', bpm: 76,
    tex: bars(`${trip('8.1', '5.1', '8.2')} ${trip('5.2', '8.3', '7.3')} ${trip('5.3', '7.4', '5.4')} :4 7.5`, `${trip('7.5', '6.5', '5.5')} :4 5.6 :2 r`) }),
  B({ id: 'b14', name: 'Walking boogie bass in E', style: 'boogie-woogie', level: 'Easy', bpm: 120,
    tex: bars(':8 0.6 4.6 2.5 4.5 5.5 4.5 2.5 4.6', ':8 0.6 4.6 2.5 4.5 5.5 4.5 2.5 4.6', ':8 0.5 4.5 2.4 4.4 5.4 4.4 2.4 4.5', ':8 0.6 4.6 2.5 4.5 5.5 4.5 2.5 4.6') }),
  B({ id: 'b15', name: 'Shuffle with 7th in A', style: 'Texas blues', level: 'Medium', bpm: 108,
    tex: bars(shuf(0, 5, true), shuf(0, 5, true), shuf(0, 4, true), shuf(0, 5, true)) }),
  B({ id: 'b16', name: 'A turnaround', style: 'acoustic blues', level: 'Medium', bpm: 80, tone: 'acoustic',
    tex: bars(':8 5.1 (8.3 5.1) 5.1 (7.3 5.1) 5.1 (6.3 5.1) 5.1 (5.3 5.1)', ':2 (0.5 2.4 2.3 2.2) (0.6 2.5 0.4 1.3 0.2 0.1)') }),
  B({ id: 'b17', name: 'Bending exercise in A', style: 'lead blues', level: 'Medium', bpm: 72,
    tex: bars(':4 7.3{b (0 4)} 5.2 :8 8.2{b (0 2)} 5.2 :4 5.1', ':4 8.1{b (0 4)} 5.1 :2 7.2{v}', ':4 7.3{b (0 4)} 5.2 :8 8.2{b (0 2)} 5.2 :4 5.1', ':4 7.4 5.4 :2 7.5{v}') }),
  B({ id: 'b18', name: 'Call and response in E', style: 'Delta blues', level: 'Easy', bpm: 90,
    tex: bars(':8 0.6 3.6 0.5 2.5 :2 r', ':8 r 3.2 0.2 2.3 :2 0.3{v}', ':8 0.6 3.6 0.5 2.5 :2 r', ':8 r 3.1 0.1 3.2 :2 0.2{v}') }),
  B({ id: 'b19', name: 'Slow blues comping in C', style: 'slow blues', level: 'Easy', bpm: 60, tone: 'clean',
    tex: bars(...['(3.5 2.4 3.3 1.2)', '(1.6 1.4 2.3 1.2)', '(3.5 2.4 3.3 1.2)', '(3.6 2.5 0.4 0.3 0.2 1.1)'].map((c) => rep(tripC(c), 4))) }),
  B({ id: 'b20', name: 'Pentatonic box 2 in A', style: 'pentatonic', level: 'Medium', bpm: 96,
    tex: bars(':8 8.2 10.2 7.3 9.3 7.4 10.4 7.5 10.5', ':8 10.5 7.5 10.4 7.4 9.3 7.3 :4 10.2') }),
  B({ id: 'b21', name: 'Chicago riff in G', style: 'Chicago blues', level: 'Easy', bpm: 104,
    tex: bars(':8 3.6 3.6 6.6 3.6 :4 5.5 :8 3.5 5.5', ':4 3.6 :8 r 5.5 :2 3.6', ':8 3.6 3.6 6.6 3.6 :4 5.5 :8 3.5 5.5', ':4 5.5 :8 r 3.5 :2 3.6') }),
  B({ id: 'b22', name: 'Hammer-on licks in E', style: 'country blues', level: 'Easy', bpm: 92,
    tex: bars(':8 0.3{h} 1.3 0.2 0.1 :4 0.1{v} :8 3.2 0.2', ':8 0.4{h} 2.4 0.3 2.3 :2 0.6', ':8 0.3{h} 1.3 0.2 0.1 :4 0.1{v} :8 3.2 0.2', ':8 2.3 0.3 2.4 0.4 :2 (0.6 2.5 2.4)') }),
  B({ id: 'b23', name: 'Jump blues bass line in C', style: 'jump blues', level: 'Medium', bpm: 140,
    tex: bars(':8 3.5 2.4 5.4 2.3 3.3 2.3 5.4 2.4', ':8 3.5 2.4 5.4 2.3 3.3 2.3 5.4 2.4', ':8 1.6 0.5 3.5 0.4 1.4 0.4 3.5 0.5', ':8 3.5 2.4 5.4 2.3 3.3 2.3 5.4 2.4') }),
  B({ id: 'b24', name: 'Rhythm with lead fills in A', style: 'Texas blues', level: 'Hard', bpm: 96,
    tex: bars(`${pair('(0.5 2.4)')} ${pair('(0.5 4.4)')} ${trip('8.1', '5.1', '8.2')} ${trip('5.2', '7.3', '5.3')}`, `${pair('(0.4 2.3)')} ${pair('(0.4 4.3)')} ${trip('7.3', '5.3', '7.4')} ${trip('5.4', '7.5', '5.5')}`) }),
  B({ id: 'b25', name: 'Slides into E chords', style: 'slide style', level: 'Medium', bpm: 80,
    tex: bars(':4 7.3{sl} 9.3 :8 9.2 9.1 :4 9.2', ':2 (9.3 9.2 7.1) (1.3 0.2 0.1)', ':4 7.3{sl} 9.3 :8 9.2 7.1 :4 9.3', ':1 (1.3 0.2 0.1)') }),

  // =================== FUNK ===================
  F({ id: 'f04', name: 'A9–D9 scratch', style: 'classic funk', level: 'Medium', bpm: 100, tex: bars(scratch(FP[0], nine(12), M5), scratch(FP[0], nine(12), M5), scratch(FP[0], nine(5), M5), scratch(FP[1], nine(5), M5)) }),
  F({ id: 'f05', name: 'Sparse Em7 stabs', style: 'groove', level: 'Easy', bpm: 96, tex: bars(...Array(4).fill(scratch(FP[2], m7r5(7), M5))) }),
  F({ id: 'f06', name: 'Dm7–G9 vamp', style: 'classic funk', level: 'Medium', bpm: 104, tex: bars(scratch(FP[1], m7r5(5), M5), scratch(FP[1], m7r5(5), M5), scratch(FP[1], nine(10), M5), scratch(FP[0], nine(10), M5)) }),
  F({ id: 'f07', name: 'C9–F9 scratch', style: 'classic funk', level: 'Medium', bpm: 100, tex: bars(scratch(FP[3], nine(3), M5), scratch(FP[3], nine(3), M5), scratch(FP[3], nine(8), M5), scratch(FP[0], nine(8), M5)) }),
  F({ id: 'f08', name: 'Offbeat Am7–Dm7', style: 'disco funk', level: 'Easy', bpm: 112, tex: bars(scratch(FP[4], m7r6(5), M6), scratch(FP[4], m7r6(5), M6), scratch(FP[4], m7r5(5), M5), scratch(FP[4], m7r5(5), M5)) }),
  F({ id: 'f09', name: 'E9 double-scratch', style: 'classic funk', level: 'Medium', bpm: 98, tex: bars(...Array(4).fill(scratch(FP[5], nine(7), M5))) }),
  F({ id: 'f10', name: 'Gm7–C9 groove', style: 'soul funk', level: 'Medium', bpm: 96, tex: bars(scratch(FP[0], m7r6(3), M6), scratch(FP[0], m7r6(3), M6), scratch(FP[1], nine(3), M5), scratch(FP[0], nine(3), M5)) }),
  F({ id: 'f11', name: 'D9 to E9 shift', style: 'classic funk', level: 'Medium', bpm: 102, tex: bars(scratch(FP[2], nine(5), M5), scratch(FP[2], nine(5), M5), scratch(FP[2], nine(7), M5), scratch(FP[0], nine(7), M5)) }),
  F({ id: 'f12', name: 'Em7–A9 pushes', style: 'groove', level: 'Medium', bpm: 100, tex: bars(scratch(FP[3], m7r5(7), M5), scratch(FP[3], nine(12), M5), scratch(FP[3], m7r5(7), M5), scratch(FP[0], nine(12), M5)) }),
  F({ id: 'f13', name: 'A9 busy 16ths', style: 'classic funk', level: 'Hard', bpm: 104, tex: bars(...Array(4).fill(scratch(FP[1], nine(12), M5))) }),
  F({ id: 'f14', name: 'E7♯9 stabs', style: 'funk rock', level: 'Medium', bpm: 100, tone: 'od', tex: bars(...Array(4).fill(scratch(FP[2], '(7.5 6.4 7.3 8.2)', M5))) }),
  F({ id: 'f15', name: 'Bm7–E9 vamp', style: 'groove', level: 'Medium', bpm: 98, tex: bars(scratch(FP[0], m7r6(7), M6), scratch(FP[0], m7r6(7), M6), scratch(FP[0], nine(7), M5), scratch(FP[3], nine(7), M5)) }),
  F({ id: 'f16', name: 'Single-note riff in A', style: 'funk riff', level: 'Medium', bpm: 96,
    tex: bars(':16 5.6 x.6 5.6 8.6 x.6 5.5 x.5 7.5 5.6 x.6 5.6 8.6 x.6 7.5 5.5 x.6', ':16 5.6 x.6 5.6 8.6 x.6 5.5 x.5 7.5 :4 5.4 r', ':16 5.6 x.6 5.6 8.6 x.6 5.5 x.5 7.5 5.6 x.6 5.6 8.6 x.6 7.5 5.5 x.6', ':16 5.6 x.6 5.6 8.6 x.6 5.5 x.5 7.5 :4 7.5 5.6') }),
  F({ id: 'f17', name: 'Octave funk in D', style: 'octave funk', level: 'Medium', bpm: 100,
    tex: bars(':16 (5.5 7.3) (x.5 x.3) (5.5 7.3) r (5.5 7.3) (x.5 x.3) r (8.5 10.3) (x.5 x.3) (10.5 12.3) r (10.5 12.3) (8.5 10.3) (x.5 x.3) (5.5 7.3) r',
      ':16 (5.5 7.3) (x.5 x.3) (5.5 7.3) r (5.5 7.3) (x.5 x.3) r (5.5 7.3) :4 (3.5 5.3) (5.5 7.3)') }),
  F({ id: 'f18', name: 'Em7 two-pattern groove', style: 'groove', level: 'Medium', bpm: 100, tex: bars(scratch(FP[1], m7r5(7), M5), scratch(FP[4], m7r5(7), M5), scratch(FP[1], m7r5(7), M5), scratch(FP[6], m7r5(7), M5)) }),
  F({ id: 'f19', name: 'Bass-style riff in E', style: 'funk riff', level: 'Medium', bpm: 98,
    tex: bars(':16 0.6 x.6 r 0.6 r 0.6 3.6 x.6 0.6 x.6 r 5.6 x.6 5.6 3.6 0.6', ':16 0.6 x.6 r 0.6 r 0.6 3.6 x.6 :4 2.5 0.5', ':16 0.6 x.6 r 0.6 r 0.6 3.6 x.6 0.6 x.6 r 5.6 x.6 5.6 3.6 0.6', ':16 0.6 x.6 r 0.6 r 0.6 3.6 x.6 :4 5.6 0.6') }),
  F({ id: 'f20', name: 'Chicken-pickin’ 16ths in A', style: 'funk country', level: 'Hard', bpm: 92,
    tex: bars(':16 x.4 7.4 x.4 5.4 x.4 7.4 x.4 5.3 x.3 5.3 x.3 7.3 x.4 5.4 7.4 x.4', ':16 x.4 7.4 x.4 5.4 x.4 7.4 x.4 5.3 :4 (7.4 5.3) r') }),
  F({ id: 'f21', name: 'Disco octaves A–G–F–E', style: 'disco', level: 'Easy', bpm: 118,
    tex: bars(...['(5.6 7.4)', '(3.6 5.4)', '(1.6 3.4)', '(0.6 2.4)'].map((o) => `:16 ${rep(`r ${o}`, 8)}`)) }),
  F({ id: 'f22', name: 'Em9–A13 vamp', style: 'neo-soul funk', level: 'Medium', bpm: 94,
    tex: bars(scratch('C..C..C.C..C.C..', '(7.5 5.4 7.3 7.2)', M5), scratch('C..C..C.C..C.C..', '(7.5 5.4 7.3 7.2)', M5), scratch('C..C..C.C..C.C..', '(5.6 5.4 6.3 7.2)', M6), scratch(FP[0], '(5.6 5.4 6.3 7.2)', M6)) }),
  F({ id: 'f23', name: 'Ghost-note groove in D9', style: 'classic funk', level: 'Hard', bpm: 100, tex: bars(...Array(4).fill(scratch(FP[6], nine(5), M5))) }),
  F({ id: 'f24', name: 'Stop-time riff in E', style: 'funk rock', level: 'Medium', bpm: 104, tone: 'od',
    tex: bars(':8 (0.6 2.5) r r (0.6 2.5) :4 r :8 (3.6 5.5) (5.6 7.5)', ':16 0.6 x.6 0.6 x.6 3.6 x.6 5.6 x.6 :2 (0.6 2.5)', ':8 (0.6 2.5) r r (0.6 2.5) :4 r :8 (3.6 5.5) (5.6 7.5)', ':16 0.6 x.6 0.6 x.6 3.6 x.6 5.6 x.6 :2 (7.6 9.5)') }),
  F({ id: 'f25', name: 'A7 16th strum', style: 'classic funk', level: 'Medium', bpm: 102, tex: bars(scratch(FP[5], d7r6(5), M6), scratch(FP[0], d7r6(5), M6), scratch(FP[5], d7r6(5), M6), scratch(FP[3], d7r6(5), M6)) }),

  // =================== JAZZ ===================
  J({ id: 'j03', name: 'ii–V–I in F', style: 'four to the bar', level: 'Easy', bpm: 120, tex: iiVI(8, four) }),
  J({ id: 'j04', name: 'ii–V–I in B♭', style: 'Charleston rhythm', level: 'Medium', bpm: 110, tex: iiVI(1, charleston) }),
  J({ id: 'j05', name: 'ii–V–I in G', style: 'anticipations', level: 'Medium', bpm: 110, tex: iiVI(10, anticip) }),
  J({ id: 'j06', name: 'ii–V–I in D (two chords per bar)', style: 'comping', level: 'Medium', bpm: 130,
    tex: bars(`:2 ${m7r5(7)} ${d7r6(5)}`, `:1 ${maj7r5(5)}`, `:2 ${m7r5(7)} ${d7r6(5)}`, `:1 ${maj7r5(5)}`) }),
  J({ id: 'j07', name: 'ii–V–I in E♭', style: 'four to the bar', level: 'Medium', bpm: 140, tex: iiVI(6, four) }),
  J({ id: 'j08', name: 'Minor ii–V–i in D', style: 'Charleston rhythm', level: 'Medium', bpm: 110,
    tex: bars(charleston(m7b5r5(7)), charleston(d7r6(5)), charleston(m7r5(5)), `:1 ${m7r5(5)}`) }),
  J({ id: 'j09', name: 'Minor ii–V–i in A', style: 'four to the bar', level: 'Medium', bpm: 120,
    tex: bars(four(m7b5r5(2)), four(d7r6(0)), four(m7r6(5)), `:1 ${m7r6(5)}`) }),
  J({ id: 'j10', name: 'Four to the bar, blues in B♭', style: 'swing rhythm', level: 'Easy', bpm: 150,
    tex: bars(four(d7r6(6)), four(d7r5(6)), four(d7r6(6)), four(d7r6(1))) }),
  J({ id: 'j11', name: 'Jazz blues in F', style: 'Charleston rhythm', level: 'Hard', bpm: 130,
    tex: bars(...[d7r6(1), d7r5(1), d7r6(1), d7r6(1), d7r5(1), d7r5(1), d7r6(1), d7r5(5), m7r6(3), d7r5(3), d7r6(1), d7r5(3)].map(charleston)) }),
  J({ id: 'j12', name: 'Cmaj7–Fmaj7–G7 arpeggios', style: 'arpeggios', level: 'Medium', bpm: 100,
    tex: bars(':8 3.5 2.4 5.4 4.3 5.3 4.3 5.4 2.4', ':8 1.6 0.5 3.5 2.4 3.4 2.4 3.5 0.5', ':8 3.6 2.5 5.5 3.4 4.3 3.4 5.5 2.5', ':1 (3.5 2.4 0.3 0.2)') }),
  J({ id: 'j13', name: 'Walking bass in F', style: 'walking bass', level: 'Medium', bpm: 120,
    tex: bars(':4 1.6 3.6 0.5 3.5', ':4 1.5 3.5 0.4 3.4', ':4 1.6 0.5 3.5 2.5', ':4 3.5 2.5 0.5 0.4') }),
  J({ id: 'j14', name: 'Bebop scale in F', style: 'bebop', level: 'Hard', bpm: 120,
    tex: bars(':8 1.6 3.6 0.5 1.5 3.5 0.4 1.4 2.4', ':8 3.4 2.4 1.4 0.4 3.5 1.5 0.5 3.6', `:1 ${d7r6(1)}`) }),
  J({ id: 'j15', name: 'I–vi–ii–V in C', style: 'chord progression', level: 'Easy', bpm: 100,
    tex: bars(`:2 ${maj7r5(3)} ${m7r6(5)}`, `:2 ${m7r5(5)} ${d7r6(3)}`, `:2 ${maj7r5(3)} ${m7r6(5)}`, `:2 ${m7r5(5)} ${d7r6(3)}`) }),
  J({ id: 'j16', name: 'Rhythm changes in B♭', style: 'swing', level: 'Hard', bpm: 170,
    tex: bars(`:2 ${maj7r6(6)} ${m7r6(3)}`, `:2 ${m7r5(3)} ${d7r6(1)}`, `:2 ${maj7r6(6)} ${m7r6(3)}`, `:2 ${m7r5(3)} ${d7r6(1)}`) }),
  J({ id: 'j17', name: 'Am7–D7 arpeggios to Gmaj7', style: 'arpeggios', level: 'Medium', bpm: 110,
    tex: bars(':8 5.6 3.5 2.4 5.4 5.3 5.4 2.4 3.5', ':8 5.5 4.4 7.4 5.3 7.3 5.3 7.4 4.4', `:1 ${maj7r6(3)}`) }),
  J({ id: 'j18', name: 'C6/9–F6/9 vamp', style: 'anticipations', level: 'Easy', bpm: 104,
    tex: bars(anticip('(3.5 2.4 2.3 3.2 3.1)'), anticip('(3.5 2.4 2.3 3.2 3.1)'), anticip('(8.5 7.4 7.3 8.2 8.1)'), anticip('(8.5 7.4 7.3 8.2 8.1)')) }),
  J({ id: 'j19', name: 'Enclosure lick in C', style: 'bebop', level: 'Hard', bpm: 110,
    tex: bars(':8 6.2 4.2 5.2 3.2 5.3 4.3 2.3 5.4', `:2 ${maj7r5(3)} :2 r`) }),
  J({ id: 'j20', name: 'Dm6–A7 minor comping', style: 'Charleston rhythm', level: 'Medium', bpm: 110,
    tex: bars(charleston('(5.5 7.4 4.3 6.2)'), charleston('(5.5 7.4 4.3 6.2)'), charleston(d7r6(5)), charleston('(5.5 7.4 4.3 6.2)')) }),
  J({ id: 'j21', name: 'Tritone sub ii–V–I in C', style: 'four to the bar', level: 'Hard', bpm: 120,
    tex: bars(four(m7r5(5)), four(d7r5(4)), four(maj7r5(3)), `:1 ${maj7r5(3)}`) }),
  J({ id: 'j22', name: 'Bossa comping in C', style: 'bossa nova', level: 'Medium', bpm: 120, tone: 'nylon',
    tex: bars(...[maj7r5(3), m7r5(5), d7r6(3), maj7r5(3)].map((c) => `:8 ${c} r ${c} r :4 r :8 ${c} r`)) }),
  J({ id: 'j23', name: 'Swing line over Dm7–G7–C', style: 'bebop', level: 'Hard', bpm: 130,
    tex: bars(':8 5.5 8.5 7.4 5.4 7.3 5.3 6.2 5.3', ':8 3.6 2.5 5.5 3.4 4.3 3.4 5.5 2.5', `:1 ${maj7r5(3)}`) }),
  J({ id: 'j24', name: 'Cmaj7–C♯dim7–Dm7–G7', style: 'passing chords', level: 'Medium', bpm: 110,
    tex: bars(`:2 ${maj7r5(3)} (4.5 5.4 3.3 5.2)`, `:2 ${m7r5(5)} ${d7r6(3)}`, `:2 ${maj7r5(3)} (4.5 5.4 3.3 5.2)`, `:2 ${m7r5(5)} ${d7r6(3)}`) }),
  J({ id: 'j25', name: 'ii–V–I in A', style: 'Charleston rhythm', level: 'Easy', bpm: 110, tex: iiVI(0, charleston) }),
];
