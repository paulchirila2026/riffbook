// Editor de tabulatură: grilă pe 6 corzi, scriere de la tastatură sau din tastatura de pe ecran.
import { TUNER_TUNINGS, noteToMidi } from './tuner.js';

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FX = [
  { id: 'h', label: 'H', title: 'Hammer-on / Pull-off', tex: 'h' },
  { id: 'sl', label: '/', title: 'Slide', tex: 'sl' },
  { id: 'b', label: 'B', title: 'Bend (full step)', tex: 'b (0 4)' },
  { id: 'hb', label: '½B', title: 'Bend (half step)', tex: 'b (0 2)' },
  { id: 'v', label: '~', title: 'Vibrato', tex: 'v' },
  { id: 'pm', label: 'PM', title: 'Palm mute', tex: 'pm' },
];

export function tuningTex(id) {
  const t = TUNER_TUNINGS.find((x) => x.id === id) || TUNER_TUNINGS[0];
  return t.notes.slice().reverse().map((n) => {
    const m = noteToMidi(n);
    return SHARP[m % 12] + (Math.floor(m / 12) - 1);
  }).join(' ');
}

export function newMeasure(res = 8) {
  return { res, slots: Array.from({ length: res }, () => ({ n: {} })) };
}

export function newDoc() {
  return {
    name: 'New riff', type: 'riff', genre: 'Rock', level: 'Medium', bpm: 120,
    tuning: 'standard', tone: 'dist', measures: [newMeasure(8), newMeasure(8)],
  };
}

function noteTex(s, note) {
  const fx = (note.fx || []).map((id) => (FX.find((f) => f.id === id) || {}).tex).filter(Boolean);
  return `${note.f}.${s}` + (fx.length ? `{${fx.join(' ')}}` : '');
}

export function docBodyTex(doc) {
  return doc.measures.map((m) => {
    const parts = [`:${m.res}`];
    for (const slot of m.slots) {
      const strings = Object.keys(slot.n).filter((k) => slot.n[k] && slot.n[k].f !== '' && slot.n[k].f != null);
      if (!strings.length) parts.push('r');
      else if (strings.length === 1) parts.push(noteTex(strings[0], slot.n[strings[0]]));
      else parts.push('(' + strings.map((s) => noteTex(s, slot.n[s])).join(' ') + ')');
    }
    return parts.join(' ');
  }).join(' | ');
}

export function docToTex(doc) {
  const name = String(doc.name || 'Untitled').replace(/"/g, "'");
  return `\\title "${name}" \\tempo ${doc.bpm || 120} \\tuning ${tuningTex(doc.tuning)} .\n${docBodyTex(doc)}`;
}

// Schimbă rezoluția unei măsuri (pătrimi / optimi / șaisprezecimi) păstrând notele
export function setMeasureRes(m, res) {
  if (m.res === res) return;
  const old = m.slots, oldRes = m.res;
  const slots = Array.from({ length: res }, () => ({ n: {} }));
  old.forEach((slot, i) => {
    const pos = Math.round((i * res) / oldRes);
    if (pos < res && (i * res) % oldRes === 0) slots[pos] = slot;
  });
  m.res = res;
  m.slots = slots;
}

// ---------- Componenta de editare ----------
export class TabEditor {
  constructor(root, { onChange, onPlay }) {
    this.root = root;
    this.onChange = onChange;
    this.onPlay = onPlay;
    this.doc = newDoc();
    this.cur = { m: 0, s: 0, str: 1 };
    this._typed = { t: 0, key: '' };
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cell]');
      if (!c) return;
      const [m, s, str] = c.dataset.cell.split(':').map(Number);
      this.cur = { m, s, str };
      this.render();
    });
  }

  load(doc) { this.doc = doc; this.cur = { m: 0, s: 0, str: 1 }; this.render(); }

  get note() {
    const slot = this.doc.measures[this.cur.m].slots[this.cur.s];
    return slot.n[this.cur.str];
  }

  changed() { this.render(); this.onChange && this.onChange(this.doc); }

  setFret(v) {
    const slot = this.doc.measures[this.cur.m].slots[this.cur.s];
    const n = slot.n[this.cur.str] || { f: '', fx: [] };
    n.f = v;
    slot.n[this.cur.str] = n;
    this.changed();
  }

  typeDigit(d) {
    const now = Date.now();
    const key = `${this.cur.m}:${this.cur.s}:${this.cur.str}`;
    let v = d;
    if (this._typed.key === key && now - this._typed.t < 800) {
      const cand = (this.note && this.note.f) + d;
      if (/^\d+$/.test(cand) && parseInt(cand, 10) <= 24) v = String(parseInt(cand, 10));
    }
    this._typed = { t: now, key };
    this.setFret(v);
  }

  clear() {
    const slot = this.doc.measures[this.cur.m].slots[this.cur.s];
    delete slot.n[this.cur.str];
    this.changed();
  }

  toggleFx(id) {
    const n = this.note;
    if (!n || n.f === '') return;
    n.fx = n.fx || [];
    if (n.fx.includes(id)) n.fx = n.fx.filter((x) => x !== id);
    else {
      if (id === 'b') n.fx = n.fx.filter((x) => x !== 'hb');
      if (id === 'hb') n.fx = n.fx.filter((x) => x !== 'b');
      n.fx.push(id);
    }
    this.changed();
  }

  move(dx, dy) {
    if (dy) this.cur.str = Math.min(6, Math.max(1, this.cur.str + dy));
    if (dx) {
      let { m, s } = this.cur;
      s += dx;
      if (s < 0) { if (m > 0) { m--; s = this.doc.measures[m].slots.length - 1; } else s = 0; }
      if (s >= this.doc.measures[m].slots.length) {
        if (m < this.doc.measures.length - 1) { m++; s = 0; } else s = this.doc.measures[m].slots.length - 1;
      }
      this.cur.m = m; this.cur.s = s;
    }
    this.render();
    const el = this.root.querySelector('.cell.sel');
    if (el) {
      // derulăm doar grila, nu toată pagina
      const g = this.root, gr = g.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (er.right > gr.right - 10) g.scrollLeft += er.right - gr.right + 40;
      else if (er.left < gr.left + 40) g.scrollLeft -= gr.left + 40 - er.left + 40;
    }
  }

  addMeasure() {
    const res = this.doc.measures[this.cur.m].res;
    this.doc.measures.splice(this.cur.m + 1, 0, newMeasure(res));
    this.cur = { m: this.cur.m + 1, s: 0, str: this.cur.str };
    this.changed();
  }

  removeMeasure() {
    if (this.doc.measures.length <= 1) return;
    this.doc.measures.splice(this.cur.m, 1);
    this.cur.m = Math.min(this.cur.m, this.doc.measures.length - 1);
    this.cur.s = 0;
    this.changed();
  }

  setRes(res) { setMeasureRes(this.doc.measures[this.cur.m], res); this.cur.s = 0; this.changed(); }

  handleKey(e) {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { this.typeDigit(k); return true; }
    if (k === 'x' || k === 'X') { this.setFret('x'); return true; }
    if (k === 'ArrowUp') { this.move(0, -1); return true; }
    if (k === 'ArrowDown') { this.move(0, 1); return true; }
    if (k === 'ArrowLeft') { this.move(-1, 0); return true; }
    if (k === 'ArrowRight' || k === 'Tab') { this.move(1, 0); return true; }
    if (k === 'Delete' || k === 'Backspace') { this.clear(); return true; }
    const map = { h: 'h', p: 'h', s: 'sl', b: 'b', v: 'v', m: 'pm' };
    if (map[k.toLowerCase()]) { this.toggleFx(map[k.toLowerCase()]); return true; }
    if (k === ' ') { this.onPlay && this.onPlay(); return true; }
    return false;
  }

  render() {
    const t = TUNER_TUNINGS.find((x) => x.id === this.doc.tuning) || TUNER_TUNINGS[0];
    const labels = t.notes.slice().reverse().map((n) => n.replace(/-?\d$/, ''));
    let html = '<div class="grid-labels">' + labels.map((l) => `<div>${l}</div>`).join('') + '</div>';
    this.doc.measures.forEach((m, mi) => {
      html += `<div class="measure ${mi === this.cur.m ? 'cur' : ''}" data-res="${m.res}"><div class="mnum">${mi + 1}</div>`;
      for (let str = 1; str <= 6; str++) {
        html += '<div class="mrow">';
        m.slots.forEach((slot, si) => {
          const n = slot.n[str];
          const sel = mi === this.cur.m && si === this.cur.s && str === this.cur.str;
          const col = mi === this.cur.m && si === this.cur.s;
          const fx = n && n.fx && n.fx.length ? `<sup>${n.fx.map((id) => FX.find((f) => f.id === id).label).join('')}</sup>` : '';
          html += `<button class="cell ${sel ? 'sel' : ''} ${col ? 'col' : ''} ${si % (m.res / 4 || 1) === 0 ? 'beat' : ''}" data-cell="${mi}:${si}:${str}" aria-label="Bar ${mi + 1}, position ${si + 1}, string ${str}">${n && n.f !== '' ? n.f : ''}${fx}</button>`;
        });
        html += '</div>';
      }
      html += '</div>';
    });
    this.root.innerHTML = html;
    const info = document.getElementById('ed-info');
    if (info) {
      const n = this.note;
      const fx = n && n.fx && n.fx.length ? n.fx.map((id) => FX.find((f) => f.id === id).title).join(', ') : '—';
      info.textContent = `Bar ${this.cur.m + 1} · position ${this.cur.s + 1}/${this.doc.measures[this.cur.m].res} · string ${this.cur.str} (${labels[this.cur.str - 1]}) · fret ${n && n.f !== '' ? n.f : '—'} · techniques: ${fx}`;
    }
    document.querySelectorAll('[data-res-btn]').forEach((b) => b.classList.toggle('on', Number(b.dataset.resBtn) === this.doc.measures[this.cur.m].res));
  }
}
