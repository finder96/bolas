// Trilha gerada pelos próprios eventos: cada quique toca a próxima nota da melodia.
// Só melodias em domínio público, sintetizadas aqui (sem arquivo de áudio de terceiros).
import { mulberry32 } from './sims.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  return (+m[3] + 1) * 12 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const MELODIES = {
  estrelinha: {
    name: 'Twinkle, Twinkle, Little Star', credit: 'traditional', root: 72, chord: [72, 76, 79, 84],
    notes: 'C5 C5 G5 G5 A5 A5 G5 F5 F5 E5 E5 D5 D5 C5 G5 G5 F5 F5 E5 E5 D5 G5 G5 F5 F5 E5 E5 D5',
  },
  brahms: {
    name: 'Lullaby', credit: 'Brahms (1868)', root: 72, chord: [72, 76, 79, 84],
    notes: 'E5 E5 G5 E5 E5 G5 E5 G5 C6 B5 A5 A5 G5 D5 E5 F5 D5 D5 E5 F5 D5 F5 B5 A5 G5 B5 C6 C5 C5 C6 A5 F5 G5 E5 C5 F5 G5 A5 G5 C5 C5 C6 A5 F5 G5 E5 C5 F5 E5 D5 C5',
  },
  ode: {
    name: 'Ode to Joy', credit: 'Beethoven (1824)', root: 72, chord: [72, 76, 79, 84],
    notes: 'E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 E5 D5 D5 E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 D5 C5 C5 D5 D5 E5 C5 D5 E5 F5 E5 C5 D5 E5 F5 E5 D5 C5 D5 G4 E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 D5 C5 C5',
  },
  elise: {
    name: 'Für Elise', credit: 'Beethoven (1810)', root: 69, chord: [69, 72, 76, 81],
    notes: 'E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 G#4 B4 C5 E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 C5 B4 A4',
  },
  canon: {
    name: 'Canon in D', credit: 'Pachelbel (c. 1680)', root: 74, chord: [74, 78, 81, 86],
    notes: 'F#5 E5 D5 C#5 B4 A4 B4 C#5 D5 C#5 B4 A4 G4 F#4 G4 E4 D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4 F#4 D4 E4 C#5 D5 F#5 A5 A4 B4 G4 A4 F#4 D4 D5 D5 C#5',
  },
  magica: { name: 'Magic Arpeggios', credit: 'original', root: 72, chord: [72, 76, 79, 84], gen: true },
};

export function melodyNotes(id, seed) {
  const m = MELODIES[id] || MELODIES.estrelinha;
  if (!m.gen) return m.notes.split(/\s+/).map(midi);
  const scale = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86];
  const r = mulberry32(seed ^ 0x5eed);
  let p = 5;
  return Array.from({ length: 96 }, () => { p = Math.max(0, Math.min(scale.length - 1, p + Math.round((r() - 0.5) * 4))); return scale[p]; });
}

function impulse(ctx, sec) {
  const sr = ctx.sampleRate, n = Math.floor(sr * sec), b = ctx.createBuffer(2, n, sr), r = mulberry32(99);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  return b;
}

function chain(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
  const master = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver();
  master.gain.value = 0.8; dry.gain.value = 0.85; wet.gain.value = 0.4; conv.buffer = impulse(ctx, 2.6);
  master.connect(dry); master.connect(conv); conv.connect(wet); dry.connect(comp); wet.connect(comp);
  return master;
}

// Timbre de "caixinha de música": fundamental + harmônicos que somem mais rápido.
function tone(ctx, out, t, m, vel, dur = 1.9) {
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  for (const [h, a, type] of [[1, 1, 'sine'], [2, 0.25, 'sine'], [3, 0.08, 'triangle'], [4.2, 0.04, 'sine']]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type; o.frequency.value = f * h;
    og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(a * 0.002, t + dur / h);
    o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }
}

function thud(ctx, out, t, vel = 0.7) {
  const n = Math.floor(ctx.sampleRate * 0.35), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), r = mulberry32(3);
  for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 4);
  const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = b; lp.type = 'lowpass'; lp.frequency.value = 260; g.gain.value = vel;
  src.connect(lp); lp.connect(g); g.connect(out); src.start(t);
}

// Agenda todos os eventos a partir de `from` (segundos do vídeo), tocando em `at` (relógio do contexto).
function schedule(ctx, out, events, melId, seed, from, at) {
  const M = MELODIES[melId] || MELODIES.estrelinha, notes = melodyNotes(melId, seed);
  let k = 0;
  const next = () => notes[k++ % notes.length];
  for (const e of events) {
    let play = [];
    if (e.type === 'hit') play = [[next(), 0.36]];
    else if (e.type === 'break' || e.type === 'pass') { const n = next(); play = [[n, 0.42], [n + 12, 0.18], [n + 19, 0.08]]; }
    else if (e.type === 'land') { if (e.red) play = [['thud'], [M.root - 21, 0.3, 2.2]]; else { const n = next(); play = [[n, 0.4], [n + 12, 0.2]]; } }
    else if (e.type === 'win') {
      play = M.chord.map((c, j) => [c, 0.28, 2.4, j * 0.07]).concat(M.chord.map(c => [c + 12, 0.14, 3.4, 0.4]), [[M.root - 12, 0.3, 3.4, 0.4]]);
    } else if (e.type === 'note') {
      play = [[e.m, e.v ?? 0.15, 0.6]];
    } else if (e.type === 'tick') {
      play = [[M.root + 24, 0.1, 0.18]];
    } else if (e.type === 'reveal') {
      const n = next(); play = [[n, 0.3], [n + 12, 0.16, 1.4, 0.06], [n + 19, 0.1, 1.4, 0.12]];
    } else if (e.type === 'go') {
      play = M.chord.slice(0, 3).map((c, j) => [c, 0.22, 1.2, j * 0.05]);
    } else if (e.type === 'elim') {
      const n = next();
      play = [['thud'], [M.root - 24, 0.28, 1.6], [n - 12, 0.18, 1.2]];
    } else if (e.type === 'finish') {
      const n = next(); play = [[n, 0.35], [n + 12, 0.18], [n + 19, 0.08]];
    } else if (e.type === 'lose') {
      const r = M.root - 12;
      play = [['thud'], [r, 0.32, 2.8], [r + 3, 0.26, 2.8], [r + 7, 0.24, 2.8], [r - 12, 0.3, 3]];
    }
    if (e.t < from) continue;
    const when = at + (e.t - from);
    for (const [n, vel, dur, delay = 0] of play) {
      if (n === 'thud') thud(ctx, out, when); else tone(ctx, out, when + delay, n, vel, dur);
    }
  }
}

export async function renderAudio(tl, melId, sampleRate = 48000) {
  const len = Math.ceil(tl.duration * sampleRate);
  const ctx = new OfflineAudioContext(2, len, sampleRate);
  schedule(ctx, chain(ctx), tl.events, melId, tl.seed, 0, 0);
  return ctx.startRendering();
}

// Prévia ao vivo: o relógio do áudio comanda o quadro mostrado.
export class Player {
  start(tl, melId, fromT, muted) {
    this.ctx = new AudioContext();
    const out = chain(this.ctx);
    if (muted) out.gain.value = 0;
    this.out = out;
    this.t0 = this.ctx.currentTime + 0.08; this.from = fromT;
    schedule(this.ctx, out, tl.events, melId, tl.seed, fromT, this.t0);
  }
  setMuted(m) { if (this.out) this.out.gain.value = m ? 0 : 0.8; }
  now() { return this.from + Math.max(0, this.ctx.currentTime - this.t0); }
  stop() { this.ctx?.close(); this.ctx = null; }
}
