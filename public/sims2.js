// Formatos além das bolinhas: pedra-papel-tesoura, ordenação, ache o emoji, corrida de barras,
// quiz de bandeiras, dominó e pixel art. Registrados no SIMS por registerMore() (chamado no fim do sims.js).
import { WB } from './data/wb.js';

const TAU = Math.PI * 2;
const ARENA = { X: 60, Y: 520, S: 960 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- dados compartilhados com o desenho ----------
export const RPS_SETS = {
  classico: { name: 'Pedra, papel e tesoura', items: [['🪨', 'Rock'], ['📄', 'Paper'], ['✂️', 'Scissors']],
    hooks: ['Rock, paper or scissors: pick your side 👇', 'Which one takes over? 🪨📄✂️', 'Comment your pick before it ends 👇'] },
  elementos: { name: 'Fogo, água e planta', items: [['🔥', 'Fire'], ['💧', 'Water'], ['🌿', 'Grass']],
    hooks: ['Fire, water or grass: pick your side 👇', 'Which element takes over? 🔥💧🌿', 'Comment your element before it ends 👇'] },
};
const beats = (a, b) => b === (a + 2) % 3; // pedra>tesoura, papel>pedra, tesoura>papel (e fogo>planta, água>fogo, planta>água)

export const ODD_PAIRS = [
  [['🙂', '🙃'], ['🐻', '🐨'], ['🍎', '🍅'], ['🌕', '🌝'], ['📗', '📘']],
  [['😃', '😄'], ['😺', '😸'], ['🕐', '🕑'], ['😗', '😙'], ['🔵', '🟦']],
  [['😀', '😃'], ['😐', '😑'], ['😗', '😚'], ['👍', '👍🏻'], ['😊', '☺️']],
];
const ODD_GRID = [[6, 8], [7, 10], [8, 12]];

// Bandeiras desenhadas no código (só as que dá para reproduzir fielmente com faixas, cruzes e círculos).
// tier 0 = fácil … 2 = difícil
export const FLAGS = [
  { n: 'Japan', t: 0, k: 'disc', c: ['#FFFFFF', '#BC002D'] },
  { n: 'France', t: 0, k: 'v3', c: ['#0055A4', '#FFFFFF', '#EF4135'] },
  { n: 'Germany', t: 0, k: 'h3', c: ['#000000', '#DD0000', '#FFCE00'] },
  { n: 'Italy', t: 0, k: 'v3', c: ['#009246', '#FFFFFF', '#CE2B37'] },
  { n: 'Ukraine', t: 0, k: 'h2', c: ['#0057B7', '#FFD700'] },
  { n: 'Switzerland', t: 0, k: 'swiss', c: ['#DA291C', '#FFFFFF'] },
  { n: 'Sweden', t: 0, k: 'nordic', c: ['#006AA7', '#FECC00'] },
  { n: 'Poland', t: 0, k: 'h2', c: ['#FFFFFF', '#DC143C'] },
  { n: 'Ireland', t: 1, k: 'v3', c: ['#169B62', '#FFFFFF', '#FF883E'] },
  { n: 'Belgium', t: 1, k: 'v3', c: ['#000000', '#FAE042', '#ED2939'] },
  { n: 'Netherlands', t: 1, k: 'h3', c: ['#AE1C28', '#FFFFFF', '#21468B'] },
  { n: 'Russia', t: 1, k: 'h3', c: ['#FFFFFF', '#0039A6', '#D52B1E'] },
  { n: 'Austria', t: 1, k: 'h3', c: ['#ED2939', '#FFFFFF', '#ED2939'] },
  { n: 'Denmark', t: 1, k: 'nordic', c: ['#C8102E', '#FFFFFF'] },
  { n: 'Finland', t: 1, k: 'nordic', c: ['#FFFFFF', '#002F6C'] },
  { n: 'Norway', t: 1, k: 'nordic', c: ['#BA0C2F', '#FFFFFF', '#00205B'] },
  { n: 'Bangladesh', t: 1, k: 'disc', c: ['#006A4E', '#F42A41'], off: 0.45 },
  { n: 'Indonesia', t: 1, k: 'h2', c: ['#FF0000', '#FFFFFF'] },
  { n: 'Nigeria', t: 1, k: 'v3', c: ['#008751', '#FFFFFF', '#008751'] },
  { n: 'Colombia', t: 1, k: 'colombia', c: ['#FCD116', '#003893', '#CE1126'] },
  { n: 'Hungary', t: 2, k: 'h3', c: ['#CD2A3E', '#FFFFFF', '#436F4D'] },
  { n: 'Bulgaria', t: 2, k: 'h3', c: ['#FFFFFF', '#00966E', '#D62612'] },
  { n: 'Estonia', t: 2, k: 'h3', c: ['#0072CE', '#000000', '#FFFFFF'] },
  { n: 'Lithuania', t: 2, k: 'h3', c: ['#FDB913', '#006A44', '#C1272D'] },
  { n: 'Luxembourg', t: 2, k: 'h3', c: ['#ED2939', '#FFFFFF', '#00A1DE'] },
  { n: 'Armenia', t: 2, k: 'h3', c: ['#D90012', '#0033A0', '#F2A800'] },
  { n: 'Gabon', t: 2, k: 'h3', c: ['#009E60', '#FCD116', '#3A75C4'] },
  { n: 'Romania', t: 2, k: 'v3', c: ['#002B7F', '#FCD116', '#CE1126'] },
  { n: 'Mali', t: 2, k: 'v3', c: ['#14B53A', '#FCD116', '#CE1126'] },
  { n: 'Guinea', t: 2, k: 'v3', c: ['#CE1126', '#FCD116', '#009460'] },
  { n: 'Ivory Coast', t: 2, k: 'v3', c: ['#F77F00', '#FFFFFF', '#009E60'] },
  { n: 'Iceland', t: 2, k: 'nordic', c: ['#02529C', '#FFFFFF', '#DC1E35'] },
  { n: 'Thailand', t: 2, k: 'thai', c: ['#A51931', '#F4F5F8', '#2D2A4A'] },
  { n: 'Yemen', t: 2, k: 'h3', c: ['#CE1126', '#FFFFFF', '#000000'] },
  { n: 'Sierra Leone', t: 2, k: 'h3', c: ['#1EB53A', '#FFFFFF', '#0072C6'] },
];

export const PIXEL_EMOJIS = [
  ['🍓', 'Strawberry'], ['🐸', 'Frog'], ['🌸', 'Cherry blossom'], ['🦊', 'Fox'], ['🍉', 'Watermelon'], ['🐙', 'Octopus'],
  ['🌈', 'Rainbow'], ['🍔', 'Burger'], ['🦄', 'Unicorn'], ['🐼', 'Panda'], ['🍩', 'Donut'], ['🌻', 'Sunflower'],
  ['🐢', 'Turtle'], ['🍕', 'Pizza'], ['🦋', 'Butterfly'], ['🐳', 'Whale'],
];

export const DOMINO = { area: { x0: 110, x1: 970, y0: 580, y1: 1400 }, rows: 6, Hd: 40, w: 30, th: 8 };

// ---------- algoritmos de ordenação (cada operação vira um passo do vídeo) ----------
function* bubble(a) {
  for (let i = 0; i < a.length - 1; i++) {
    let sw = false;
    for (let j = 0; j < a.length - 1 - i; j++) { yield ['c', j, j + 1]; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; yield ['s', j, j + 1]; sw = true; } }
    if (!sw) break;
  }
}
function* cocktail(a) {
  let lo = 0, hi = a.length - 1, sw = true;
  while (sw) {
    sw = false;
    for (let j = lo; j < hi; j++) { yield ['c', j, j + 1]; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; yield ['s', j, j + 1]; sw = true; } }
    hi--;
    for (let j = hi; j > lo; j--) { yield ['c', j - 1, j]; if (a[j - 1] > a[j]) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; yield ['s', j - 1, j]; sw = true; } }
    lo++;
  }
}
function* insertion(a) {
  for (let i = 1; i < a.length; i++) for (let j = i; j > 0; j--) {
    yield ['c', j - 1, j];
    if (a[j - 1] <= a[j]) break;
    [a[j - 1], a[j]] = [a[j], a[j - 1]]; yield ['s', j - 1, j];
  }
}
function* selection(a) {
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) { yield ['c', m, j]; if (a[j] < a[m]) m = j; }
    if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; yield ['s', i, m]; }
  }
}
function* gnome(a) {
  let i = 0;
  while (i < a.length) {
    if (i === 0) { i++; continue; }
    yield ['c', i - 1, i];
    if (a[i - 1] <= a[i]) i++; else { [a[i - 1], a[i]] = [a[i], a[i - 1]]; yield ['s', i - 1, i]; i--; }
  }
}
function* shell(a) {
  for (const g of [57, 23, 10, 4, 1]) {
    if (g >= a.length) continue;
    for (let i = g; i < a.length; i++) for (let j = i; j >= g; j -= g) {
      yield ['c', j - g, j];
      if (a[j - g] <= a[j]) break;
      [a[j - g], a[j]] = [a[j], a[j - g]]; yield ['s', j - g, j];
    }
  }
}
function* merge(a) {
  function* rec(lo, hi) {
    if (hi - lo < 2) return;
    const mid = (lo + hi) >> 1;
    yield* rec(lo, mid); yield* rec(mid, hi);
    const tmp = a.slice(lo, hi);
    let i = 0, j = mid - lo, k = lo;
    while (i < mid - lo && j < hi - lo) { yield ['c', lo + i, lo + j]; a[k] = tmp[i] <= tmp[j] ? tmp[i++] : tmp[j++]; yield ['w', k, a[k]]; k++; }
    while (i < mid - lo) { a[k] = tmp[i++]; yield ['w', k, a[k]]; k++; }
    while (j < hi - lo) { a[k] = tmp[j++]; yield ['w', k, a[k]]; k++; }
  }
  yield* rec(0, a.length);
}
function* quick(a) {
  function* rec(lo, hi) {
    if (lo >= hi) return;
    const p = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (true) { yield ['c', i, (lo + hi) >> 1]; if (a[i] < p) i++; else break; }
      while (true) { yield ['c', j, (lo + hi) >> 1]; if (a[j] > p) j--; else break; }
      if (i <= j) { if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; yield ['s', i, j]; } i++; j--; }
    }
    yield* rec(lo, j); yield* rec(i, hi);
  }
  yield* rec(0, a.length - 1);
}
function* heap(a) {
  const n = a.length;
  function* sift(start, end) {
    let r = start;
    while (2 * r + 1 <= end) {
      let c = 2 * r + 1, sw = r;
      yield ['c', sw, c]; if (a[sw] < a[c]) sw = c;
      if (c + 1 <= end) { yield ['c', sw, c + 1]; if (a[sw] < a[c + 1]) sw = c + 1; }
      if (sw === r) return;
      [a[r], a[sw]] = [a[sw], a[r]]; yield ['s', r, sw]; r = sw;
    }
  }
  for (let s = (n >> 1) - 1; s >= 0; s--) yield* sift(s, n - 1);
  for (let e = n - 1; e > 0; e--) { [a[0], a[e]] = [a[e], a[0]]; yield ['s', 0, e]; yield* sift(0, e - 1); }
}
export const ALGOS = {
  quick: { name: 'Quick Sort', fn: quick, fast: true }, merge: { name: 'Merge Sort', fn: merge, fast: true },
  heap: { name: 'Heap Sort', fn: heap, fast: true }, shell: { name: 'Shell Sort', fn: shell, fast: true },
  bubble: { name: 'Bubble Sort', fn: bubble }, insertion: { name: 'Insertion Sort', fn: insertion },
  selection: { name: 'Selection Sort', fn: selection }, cocktail: { name: 'Cocktail Sort', fn: cocktail }, gnome: { name: 'Gnome Sort', fn: gnome },
};

export function registerMore(K) {
  const { SIMS, THEMES, burst, snapParts, CX, CY } = K;

  // ---------- 1. pedra, papel e tesoura ----------
  SIMS.rps = {
    name: 'Pedra, papel e tesoura', icon: '✂️', sub: 2,
    desc: 'Três exércitos se perseguem e cada um converte quem ele vence. Quem domina o mapa?',
    params: [
      { k: 'tema', l: 'Tema', type: 'select', def: 'classico', opts: Object.entries(RPS_SETS).map(([k, v]) => [k, `${v.items.map(x => x[0]).join('')} ${v.name}`]) },
      { k: 'quantidade', l: 'Quantidade de cada', type: 'range', min: 10, max: 50, step: 5, def: 30 },
    ],
    outcomes: o => [['any', 'Aleatório'], ...RPS_SETS[o.tema].items.map(([, n], i) => ['t' + i, `${n} vence`])],
    texts: o => ({ hooks: RPS_SETS[o.tema].hooks, ctas: ['Did your side win? 👇', 'Rematch? Pick again 🔁', 'Which side are you on? 👇'], tags: '#rockpaperscissors #simulation #pickaside' }),
    hooks: RPS_SETS.classico.hooks, ctas: ['Did your side win? 👇'], tags: '#rockpaperscissors #simulation #pickaside',
    create(s, rng, o) {
      const { X, Y, S } = ARENA, corners = [[0.22, 0.25], [0.78, 0.25], [0.5, 0.8]];
      s.o = o; s.r = 22; s.ag = []; s.lastNote = -1;
      for (let t = 0; t < 3; t++) for (let n = 0; n < o.quantidade; n++) {
        const a = rng() * TAU, d = Math.sqrt(rng()) * 170;
        s.ag.push({ x: X + corners[t][0] * S + Math.cos(a) * d, y: Y + corners[t][1] * S + Math.sin(a) * d, vx: 0, vy: 0, w: rng() * TAU, t, conv: -9 });
      }
      s.counts = [o.quantidade, o.quantidade, o.quantidade];
    },
    step(s, dt, emit, rng) {
      if (s.done) return;
      const { X, Y, S } = ARENA, r = s.r, ag = s.ag, n = ag.length;
      const speed = Math.min(240, 120 + 2.6 * s.time);
      for (const a of ag) {
        let pd = 1e9, px = 0, py = 0, qd = 1e9, qx = 0, qy = 0;
        for (const b of ag) {
          if (b === a || b.t === a.t) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
          if (beats(a.t, b.t)) { if (d < pd) { pd = d; px = dx; py = dy; } } else if (d < qd) { qd = d; qx = dx; qy = dy; }
        }
        let fx = 0, fy = 0;
        if (pd < 1e9) { const d = Math.sqrt(pd) || 1; fx += px / d; fy += py / d; }
        if (qd < 300 * 300) { const d = Math.sqrt(qd) || 1; fx -= (qx / d) * 0.9; fy -= (qy / d) * 0.9; }
        a.w += (rng() - 0.5) * 4 * dt;
        fx += Math.cos(a.w) * 0.45; fy += Math.sin(a.w) * 0.45;
        const L = Math.hypot(fx, fy) || 1, k = Math.min(1, 6 * dt);
        a.vx += ((fx / L) * speed - a.vx) * k; a.vy += ((fy / L) * speed - a.vy) * k;
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < X + r) { a.x = X + r; a.vx = Math.abs(a.vx); } if (a.x > X + S - r) { a.x = X + S - r; a.vx = -Math.abs(a.vx); }
        if (a.y < Y + r) { a.y = Y + r; a.vy = Math.abs(a.vy); } if (a.y > Y + S - r) { a.y = Y + S - r; a.vy = -Math.abs(a.vy); }
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = ag[i], b = ag[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= 2 * r || d < 1e-6) continue;
        if (a.t === b.t) { const p = (2 * r - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; continue; }
        const [win, lose] = beats(a.t, b.t) ? [a, b] : [b, a];
        s.counts[lose.t]--; s.counts[win.t]++; lose.t = win.t; lose.conv = s.time;
        if (s.time - s.lastNote > 0.045) { s.lastNote = s.time; emit('hit'); }
      }
      const w = s.counts.findIndex(c => c === n);
      if (w >= 0) {
        s.done = true; s.outcome = 't' + w; s.result = { outcome: s.outcome, winner: w };
        burst(s, rng, X + S / 2, Y + S / 2, 120, -3, 1100, 1.6); emit('win');
      }
    },
    geo: s => ({ set: s.o.tema }),
    snap: s => {
      const pts = new Float32Array(s.ag.length * 4);
      s.ag.forEach((a, i) => { pts[i * 4] = a.x; pts[i * 4 + 1] = a.y; pts[i * 4 + 2] = a.t; pts[i * 4 + 3] = s.time - a.conv; });
      return { pts, counts: [...s.counts], parts: snapParts(s) };
    },
  };

  // ---------- 2. corrida de algoritmos de ordenação ----------
  const POOLS = { rapidos: ['quick', 'merge', 'heap', 'shell'], lentos: ['bubble', 'insertion', 'selection', 'cocktail', 'gnome'], misto: Object.keys(ALGOS) };
  SIMS.ordenacao = {
    name: 'Corrida de ordenação', icon: '📶', sub: 1,
    desc: 'Três algoritmos ordenam as mesmas barras, cada troca vira uma nota. Qual termina primeiro?',
    params: [
      { k: 'disputa', l: 'Disputa', type: 'select', def: 'rapidos', opts: [['rapidos', 'Rápidos (quick, merge, heap, shell)'], ['lentos', 'Lentos (bubble, insertion…)'], ['misto', 'Misto']] },
      { k: 'barras', l: 'Barras', type: 'range', min: 24, max: 96, step: 8, def: 48 },
      { k: 'dados', l: 'Começo', type: 'select', def: 'aleatorio', opts: [['aleatorio', 'Embaralhado'], ['quase', 'Quase ordenado'], ['invertido', 'Invertido']] },
    ],
    outcomes: o => [['any', 'Aleatório'], ...POOLS[o.disputa].map(k => [k, `${ALGOS[k].name} vence`])],
    hooks: ['Which sorting algorithm finishes first? 🏁', 'Pick your algorithm before it starts 👇', 'The sound of sorting 🔊 who wins?'],
    ctas: ['Did your pick win? 👇', 'Which one should race next? 👇', 'Watch again with sound on 🔊'],
    tags: '#sortingalgorithms #coding #programming #satisfying',
    create(s, rng, o) {
      const n = o.barras | 0, base = Array.from({ length: n }, (_, i) => i + 1);
      if (o.dados === 'invertido') base.reverse();
      else if (o.dados === 'quase') for (let k = 0; k < n / 8; k++) { const i = (rng() * n) | 0, j = clamp(i + ((rng() * 5) | 0) - 2, 0, n - 1); [base[i], base[j]] = [base[j], base[i]]; }
      else for (let i = n - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [base[i], base[j]] = [base[j], base[i]]; }
      const pool = [...POOLS[o.disputa]];
      const chosen = [];
      while (chosen.length < 3) chosen.push(pool.splice((rng() * pool.length) | 0, 1)[0]);
      s.n = n; s.base = base;
      s.lanes = chosen.map(k => ({ k, ops: [...ALGOS[k].fn(base.slice())], arr: Uint8Array.from(base), i: 0, acc: 0, hi: [-1, -1], kind: '', place: 0, doneT: null, lastNote: -1, sweep: -1 }));
      const minOps = Math.min(...s.lanes.map(l => l.ops.length));
      s.rate = minOps / 15; // o mais rápido termina em ~15s
      s.placed = 0; s.outro = 6;
    },
    step(s, dt, emit) {
      if (s.time < 0.8) return;
      for (const [li, L] of s.lanes.entries()) {
        if (L.doneT !== null) {
          // varredura verde depois de terminar (com notas subindo)
          const k = Math.floor(((s.time - L.doneT) / 0.9) * s.n);
          if (k > L.sweep && k <= s.n) { L.sweep = k; if (k % 3 === 0) emit('note', { m: 52 + Math.round((k / s.n) * 36), v: 0.12 }); }
          continue;
        }
        L.acc += s.rate * dt;
        while (L.acc >= 1 && L.i < L.ops.length) {
          L.acc -= 1;
          const op = L.ops[L.i++];
          L.hi = [op[1], op[0] === 'w' ? op[1] : op[2]]; L.kind = op[0];
          if (op[0] === 's') { const t = L.arr[op[1]]; L.arr[op[1]] = L.arr[op[2]]; L.arr[op[2]] = t; } else if (op[0] === 'w') L.arr[op[1]] = op[2];
          if (op[0] !== 'c' && s.time - L.lastNote > 0.035) { L.lastNote = s.time; emit('note', { m: 48 + Math.round((L.arr[op[1]] / s.n) * 36) + li * 0, v: 0.1 }); }
        }
        if (L.i >= L.ops.length) {
          L.doneT = s.time; L.place = ++s.placed; L.hi = [-1, -1];
          if (L.place === 1) { s.done = true; s.outcome = L.k; s.result = { outcome: L.k, ops: s.lanes.map(x => x.ops.length) }; emit('win'); } else emit('finish');
        }
      }
    },
    geo: s => ({ n: s.n, lanes: s.lanes.map(l => ({ k: l.k, name: ALGOS[l.k].name, total: l.ops.length })) }),
    snap: s => ({ lanes: s.lanes.map(l => ({ arr: Uint8Array.from(l.arr), hi: [...l.hi], kind: l.kind, ops: l.i, place: l.place, sweep: l.sweep })), parts: [] }),
  };

  // ---------- 3. ache o emoji diferente ----------
  SIMS.diferente = {
    name: 'Ache o diferente', icon: '🔍', sub: 1,
    desc: 'Três níveis de grade com um emoji diferente escondido. Contagem regressiva e revelação.',
    params: [
      { k: 'tempo', l: 'Segundos por nível', type: 'range', min: 3, max: 8, step: 1, def: 5 },
    ],
    outcomes: [['any', 'Aleatório']],
    hooks: ['Only 1% can find all 3 👀', 'Find the odd emoji before time runs out ⏱️', 'Bet you can’t find level 3 👀'],
    ctas: ['How many did you find? 👇', 'Which level got you? 👇', 'Tag someone who can’t find level 3 😂'],
    tags: '#findtheemoji #brainteaser #eyetest #puzzle',
    create(s, rng, o) {
      s.levels = ODD_PAIRS.map((tier, i) => {
        const pair = tier[(rng() * tier.length) | 0], [cols, rows] = ODD_GRID[i];
        const flip = rng() < 0.5;
        return { a: flip ? pair[1] : pair[0], b: flip ? pair[0] : pair[1], cols, rows, odd: (rng() * cols * rows) | 0 };
      });
      s.T = o.tempo; s.R = 1.6; s.start = 0.6; s.lastSec = -1;
    },
    step(s, dt, emit) {
      const per = s.T + s.R, tt = s.time - s.start;
      if (tt < 0) return;
      const lv = Math.floor(tt / per), tp = tt - lv * per;
      if (lv >= s.levels.length) { if (!s.done) { s.done = true; s.outcome = 'any'; emit('win'); } return; }
      const key = lv * 100 + (tp < s.T ? Math.floor(tp) : 99);
      if (key !== s.lastSec) {
        s.lastSec = key;
        if (tp < s.T) emit('tick'); else emit('reveal');
      }
    },
    geo: s => ({ levels: s.levels, T: s.T, R: s.R, start: s.start }),
    snap: s => ({ t: s.time, parts: [] }),
  };

  // ---------- 4. corrida de barras (dados do Banco Mundial) ----------
  SIMS.barras = {
    name: 'Corrida de barras', icon: '📊', sub: 1,
    desc: 'Ranking dos países ano a ano com dados oficiais do Banco Mundial.',
    params: [
      { k: 'dados', l: 'Dados', type: 'select', def: 'populacao', opts: [['populacao', 'População'], ['pib', 'PIB (US$)']] },
      { k: 'inicio', l: 'Começa em', type: 'select', def: '1960', opts: [['1960', '1960'], ['1980', '1980'], ['2000', '2000']] },
      { k: 'ritmo', l: 'Segundos por ano', type: 'range', min: 0.2, max: 0.8, step: 0.05, def: 0.4 },
    ],
    outcomes: [['any', 'Aleatório']],
    texts: o => {
      const D = WB[o.dados], y1 = D.years[D.years.length - 1];
      const what = o.dados === 'pib' ? 'Biggest economies' : 'Most populated countries';
      return { hooks: [`${what} ${o.inicio}–${y1} 📊`, `${what} since ${o.inicio} 👀 watch the top spot`, `${what}: who is #1 in ${y1}? 📊`],
        ctas: ['Where is your country? 👇', 'Did you expect that #1? 👇', 'Which data should we race next? 👇'], tags: '#barchartrace #data #countries #history' };
    },
    hooks: ['Most populated countries 📊'], ctas: ['Where is your country? 👇'], tags: '#barchartrace #data #countries',
    create(s, rng, o) {
      const D = WB[o.dados];
      s.o = o; s.D = D; s.i0 = Math.max(0, D.years.indexOf(Number(o.inicio))); s.last = D.years.length - 1;
      s.lastYear = -1; s.leader = null; s.outro = 4;
    },
    step(s, dt, emit) {
      const yf = Math.min(s.last, s.i0 + Math.max(0, s.time - 0.8) / s.o.ritmo), yi = Math.floor(yf);
      s.yf = yf;
      if (yi !== s.lastYear) {
        s.lastYear = yi;
        let best = null, bv = -1;
        for (const [name, arr] of Object.entries(s.D.series)) if ((arr[yi] ?? -1) > bv) { bv = arr[yi]; best = name; }
        if (s.leader && best !== s.leader) emit('reveal'); else emit('tick');
        s.leader = best;
      }
      if (!s.done && yf >= s.last) { s.done = true; s.outcome = 'any'; s.result = { outcome: 'any', leader: s.leader, year: s.D.years[s.last] }; emit('win'); }
    },
    geo: s => ({ key: s.o.dados }),
    snap: s => ({ yf: s.yf ?? s.i0, parts: [] }),
  };

  // ---------- 5. quiz de bandeiras ----------
  SIMS.bandeiras = {
    name: 'Quiz de bandeiras', icon: '🏳️', sub: 1,
    desc: 'Uma bandeira por vez com contagem regressiva, do fácil ao difícil. Quantas você acerta?',
    params: [
      { k: 'perguntas', l: 'Bandeiras', type: 'range', min: 3, max: 8, step: 1, def: 5 },
      { k: 'tempo', l: 'Segundos para responder', type: 'range', min: 2, max: 5, step: 1, def: 3 },
    ],
    outcomes: [['any', 'Aleatório']],
    texts: o => ({ hooks: [`Guess all ${o.perguntas} flags in ${o.tempo} seconds 🌍`, `Only geography pros get ${o.perguntas}/${o.perguntas} 🌍`, 'How many flags can you name? ⏱️'],
      ctas: [`How many did you get? 👇 /${o.perguntas}`, 'Comment your score 👇', 'Which flag got you? 👇'], tags: '#flags #geography #quiz #guesstheflag' }),
    hooks: ['Guess all 5 flags in 3 seconds 🌍'], ctas: ['How many did you get? 👇'], tags: '#flags #geography #quiz',
    create(s, rng, o) {
      const q = o.perguntas | 0, picked = [];
      for (let i = 0; i < q; i++) {
        const tier = Math.min(2, Math.floor((i / q) * 3));
        const pool = FLAGS.filter(f => f.t === tier && !picked.includes(f));
        picked.push(pool[(rng() * pool.length) | 0]);
      }
      s.flags = picked; s.T = o.tempo; s.R = 1.4; s.start = 0.5; s.last = -1;
    },
    step(s, dt, emit) {
      const per = s.T + s.R, tt = s.time - s.start;
      if (tt < 0) return;
      const q = Math.floor(tt / per), tp = tt - q * per;
      if (q >= s.flags.length) { if (!s.done) { s.done = true; s.outcome = 'any'; emit('win'); } return; }
      const key = q * 100 + (tp < s.T ? Math.floor(tp) : 99);
      if (key !== s.last) { s.last = key; emit(tp < s.T ? 'tick' : 'reveal'); }
    },
    geo: s => ({ flags: s.flags, T: s.T, R: s.R, start: s.start }),
    snap: s => ({ t: s.time, parts: [] }),
  };

  // ---------- 7. dominó ----------
  SIMS.domino = {
    name: 'Dominó', icon: '🀱', sub: 4,
    desc: 'Uma fileira longa com pontos de risco: algumas peças estão quase longe demais. A última vai cair?',
    params: [
      { k: 'pecas', l: 'Peças', type: 'range', min: 100, max: 320, step: 20, def: 220 },
      { k: 'risco', l: 'Pontos de risco', type: 'range', min: 1, max: 5, step: 1, def: 3 },
    ],
    outcomes: [['any', 'Aleatório'], ['completo', 'Todas caem'], ['parou', 'Para no meio']],
    hooks: ['Will the last domino fall? 😬', 'Watch the gaps… will it make it? 👀', 'One gap could ruin everything 😰'],
    ctas: ['Did you think it would make it? 👇', 'Which gap scared you? 👇', 'Watch again and spot the risky gaps 🔁'],
    tags: '#domino #dominoes #satisfying #chainreaction',
    create(s, rng, o) {
      const { x0, x1, y0, y1 } = DOMINO.area, rows = DOMINO.rows, dy = (y1 - y0) / (rows - 1), R = dy / 2;
      // caminho em zigue-zague: retas + meias-voltas
      const pts = [];
      for (let r = 0; r < rows; r++) {
        const y = y0 + r * dy, ltr = r % 2 === 0;
        for (let x = 0; x <= x1 - x0; x += 2) pts.push([ltr ? x0 + x : x1 - x, y]);
        if (r < rows - 1) {
          const cx = ltr ? x1 : x0, cy = y + R;
          for (let a = 1; a < 90; a++) { const t = -Math.PI / 2 + (a / 90) * Math.PI; pts.push([cx + (ltr ? 1 : -1) * Math.cos(t) * R, cy + Math.sin(t) * R]); }
        }
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const Ltot = cum[cum.length - 1], n = o.pecas | 0, Hd = DOMINO.Hd;
      const risky = new Set();
      while (risky.size < Math.min(o.risco, n - 10)) risky.add(8 + ((rng() * (n - 12)) | 0));
      const gaps = [];
      for (let i = 0; i < n - 1; i++) gaps.push(risky.has(i) ? Hd * (0.955 + rng() * 0.07) : null);
      const fixed = gaps.reduce((a, g) => a + (g || 0), 0), free = gaps.filter(g => g === null).length;
      const base = Math.min(Hd * 0.75, (Ltot - fixed) / free);
      let at = 0, k = 0;
      const where = d => { while (k < cum.length - 2 && cum[k + 1] < d) k++; const u = (d - cum[k]) / ((cum[k + 1] - cum[k]) || 1), p = pts[k], q = pts[k + 1]; return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, Math.atan2(q[1] - p[1], q[0] - p[0])]; };
      s.dom = [];
      for (let i = 0; i < n; i++) {
        const [x, y, dir] = where(at);
        s.dom.push({ x, y, dir, th: 0, om: 0, st: 0, trig: false });
        if (i < n - 1) at += gaps[i] ?? base * (0.94 + rng() * 0.12);
      }
      s.gap = s.dom.slice(0, -1).map((d, i) => Math.hypot(s.dom[i + 1].x - d.x, s.dom[i + 1].y - d.y));
      s.risky = [...risky]; s.fallen = 0; s.lastNote = -1;
    },
    step(s, dt, emit, rng) {
      if (s.done) return;
      const Hd = DOMINO.Hd, D = s.dom, n = D.length;
      if (!D[0].st && s.time > 0.6) { D[0].st = 1; D[0].om = 3.5; emit('go'); }
      let slow = false;
      for (let i = 0; i < n; i++) {
        const d = D[i];
        if (d.st !== 1) continue;
        d.om += 70 * Math.sin(Math.max(d.th, 0.06)) * dt; d.th += d.om * dt;
        if (!d.trig && i < n - 1 && Hd * Math.sin(Math.min(d.th, Math.PI / 2)) >= s.gap[i]) {
          d.trig = true; D[i + 1].st = 1; D[i + 1].om = Math.max(2.2, d.om * 0.5);
          if (s.time - s.lastNote > 0.05) { s.lastNote = s.time; emit('hit'); }
        }
        if (i < n - 1 && !d.trig && s.gap[i] > Hd * 0.9) slow = true;
        if (d.th >= Math.PI / 2) {
          d.th = Math.PI / 2; d.st = 2; s.fallen++;
          if (i === n - 1) { s.done = true; s.outcome = 'completo'; s.result = { outcome: 'completo', fallen: n, total: n }; burst(s, rng, d.x, d.y, 120, -3, 1000, 1.6); emit('win'); }
          else if (!d.trig) { s.done = true; s.outcome = 'parou'; s.result = { outcome: 'parou', fallen: i + 1, total: n }; emit('lose'); }
        }
      }
      s.timeScale = slow ? 0.35 : 1;
    },
    geo: s => ({ dom: s.dom.map(d => ({ x: d.x, y: d.y, dir: d.dir })), risky: s.risky }),
    snap: s => ({ th: Float32Array.from(s.dom, d => d.th), fallen: s.fallen, parts: snapParts(s) }),
  };

  // ---------- 8. pixel art se pintando ----------
  SIMS.pixel = {
    name: 'Pixel art', icon: '🎨', sub: 1,
    desc: 'Um desenho em pixels se pinta sozinho, cor por cor. Adivinhe o que é antes de terminar.',
    params: [
      { k: 'imagem', l: 'Desenho', type: 'select', def: 'aleatorio', opts: [['aleatorio', 'Aleatório'], ...PIXEL_EMOJIS.map(([e, n]) => [e, `${e} ${n}`])] },
      { k: 'tempo', l: 'Tempo para pintar (s)', type: 'range', min: 12, max: 40, step: 2, def: 22 },
    ],
    outcomes: [['any', 'Aleatório']],
    hooks: ['Guess what it is before it’s finished 👀', 'Only real ones guess it in 3 seconds 🎨', 'Comment your guess before the end 👇'],
    ctas: ['Did you guess it? 👇 How fast?', 'What should we paint next? 👇', 'Comment the second you knew 👇'],
    tags: '#pixelart #satisfying #guess #art',
    create(s, rng, o) {
      const pick = PIXEL_EMOJIS[(rng() * PIXEL_EMOJIS.length) | 0];
      const found = PIXEL_EMOJIS.find(([e]) => e === o.imagem);
      s.img = found || pick; s.T = o.tempo; s.steps = 180; s.lastStep = -1; s.start = 0.8;
    },
    step(s, dt, emit) {
      const p = clamp((s.time - s.start) / s.T, 0, 1), k = Math.floor(p * s.steps);
      if (k > s.lastStep) { s.lastStep = k; if (k < s.steps) emit('hit'); }
      s.p = p;
      if (!s.done && p >= 1) { s.done = true; s.outcome = 'any'; s.result = { outcome: 'any', name: s.img[1] }; emit('win'); }
    },
    geo: s => ({ emoji: s.img[0], name: s.img[1] }),
    snap: s => ({ p: s.p || 0, parts: [] }),
  };
}
