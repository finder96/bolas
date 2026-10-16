// Física determinística: a mesma seed sempre gera o mesmo vídeo.
// Cada simulação devolve uma linha do tempo quadro a quadro + os eventos que viram som.
export const W = 1080, H = 1920, FPS = 30, SUB = 8, DT = 1 / (FPS * SUB), OUTRO = 3.5;
export const CX = 540, CY = 980;
const TAU = Math.PI * 2, G = 1400;

export const DURATIONS = {
  curto: { name: 'Curto (12–30s)', range: [12, 30] },
  medio: { name: 'Médio (25–50s)', range: [25, 50] },
  longo: { name: 'Longo (45–85s)', range: [45, 85] },
  livre: { name: 'Qualquer', range: [5, 90] },
};

export const RACE = [
  { k: 'rosa', n: 'Pink', pt: 'Rosa', c: '#ff4fa3' },
  { k: 'amarelo', n: 'Yellow', pt: 'Amarelo', c: '#ffd23f' },
  { k: 'verde', n: 'Green', pt: 'Verde', c: '#3ddc84' },
  { k: 'roxo', n: 'Purple', pt: 'Roxo', c: '#b06cff' },
  { k: 'laranja', n: 'Orange', pt: 'Laranja', c: '#ff8a3d' },
  { k: 'ciano', n: 'Cyan', pt: 'Ciano', c: '#4de8ff' },
  { k: 'branco', n: 'White', pt: 'Branco', c: '#f2f2f2' },
  { k: 'azul', n: 'Blue', pt: 'Azul', c: '#4d7cff' },
];

export const PLINKO = { rows: 12, sp: 72, top: 520, pegR: 8, ballR: 13, binTop: 1262, floor: 1440, landY: 1275 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(a) { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; }
export const angDiff = (a, b) => Math.abs(wrap(a - b));

// ---------- geometria ----------
// Polígono regular (n=96 vira círculo) com uma fresta. Coordenadas locais, centro em (0,0).
function makeLayer(n, inR, gapAng, gapW) {
  const R = inR / Math.cos(Math.PI / n);
  const sub = n >= 24 ? 1 : Math.max(3, Math.round((TAU * R / n) / 16));
  const segs = [];
  for (let i = 0; i < n; i++) {
    const a0 = i * TAU / n, a1 = (i + 1) * TAU / n;
    const x0 = R * Math.cos(a0), y0 = R * Math.sin(a0), x1 = R * Math.cos(a1), y1 = R * Math.sin(a1);
    for (let k = 0; k < sub; k++) {
      const u0 = k / sub, u1 = (k + 1) / sub;
      const ax = x0 + (x1 - x0) * u0, ay = y0 + (y1 - y0) * u0;
      const bx = x0 + (x1 - x0) * u1, by = y0 + (y1 - y0) * u1;
      const mid = Math.atan2(ay + by, ax + bx);
      segs.push({ ax, ay, bx, by, mid, gap: gapW > 0 && angDiff(mid, gapAng) < gapW / 2 });
    }
  }
  return { n, inR, R, segs, gapAng, gapW, angle: 0, omega: 0, alive: true, c: 0 };
}

function toLocal(L, x, y) {
  const c = Math.cos(L.angle), s = Math.sin(L.angle), dx = x - CX, dy = y - CY;
  return [dx * c + dy * s, -dx * s + dy * c];
}

function inside(L, x, y) {
  const [lx, ly] = toLocal(L, x, y);
  const step = TAU / L.n;
  let phi = (((Math.atan2(ly, lx) - step / 2) % step) + step) % step;
  if (phi > step / 2) phi -= step;
  return Math.hypot(lx, ly) * Math.cos(phi) <= L.inR;
}

// Colisão bola × parede giratória (dos dois lados). Devolve o último segmento atingido.
function collide(b, L) {
  const c = Math.cos(L.angle), s = Math.sin(L.angle);
  const dx = b.x - CX, dy = b.y - CY;
  let lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const d = Math.hypot(lx, ly);
  if (d + b.r < L.inR - 2 || d - b.r > L.R + 2) return null;
  let vx = b.vx * c + b.vy * s, vy = -b.vx * s + b.vy * c;
  let hit = null, moved = false;
  for (const g of L.segs) {
    if (g.gap) continue;
    const ex = g.bx - g.ax, ey = g.by - g.ay;
    let u = ((lx - g.ax) * ex + (ly - g.ay) * ey) / (ex * ex + ey * ey);
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    let nx = lx - (g.ax + ex * u), ny = ly - (g.ay + ey * u);
    const dd = Math.hypot(nx, ny);
    if (dd >= b.r || dd < 1e-9) continue;
    nx /= dd; ny /= dd;
    lx += nx * (b.r - dd); ly += ny * (b.r - dd); moved = true;
    const vn = vx * nx + vy * ny;
    if (vn < 0) { vx -= 2 * vn * nx; vy -= 2 * vn * ny; hit = g; }
  }
  if (moved) {
    b.x = CX + lx * c - ly * s; b.y = CY + lx * s + ly * c;
    b.vx = vx * c - vy * s; b.vy = vx * s + vy * c;
  }
  return hit;
}

function newBall(x, y, speed, ang, r, c) {
  const vx = Math.cos(ang) * speed, vy = Math.sin(ang) * speed;
  return { x, y, vx, vy, r, c, E: 0.5 * speed * speed - G * y, lastHit: -1, alive: true };
}

// Mantém a energia de cada bolinha constante: ela nunca "morre" quicando.
function keepEnergy(b) {
  const v2 = 2 * (b.E + G * b.y), cur = b.vx * b.vx + b.vy * b.vy;
  if (v2 > 100 && cur > 1e-6) { const k = Math.sqrt(v2 / cur); b.vx *= k; b.vy *= k; }
}

function integrate(b, dt, g = G) { b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; }

// ---------- partículas ----------
function burst(s, rng, x, y, n, c, speed = 600, life = 1.2) {
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU, v = speed * (0.25 + rng() * 0.75);
    s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: life * (0.5 + rng() * 0.5), c, sz: 3 + rng() * 5 });
  }
}

function burstLayer(s, rng, L) {
  const ca = Math.cos(L.angle), sa = Math.sin(L.angle);
  const every = Math.max(1, Math.floor(L.segs.length / 70));
  for (let i = 0; i < L.segs.length; i += every) {
    const g = L.segs[i];
    if (g.gap) continue;
    const mx = (g.ax + g.bx) / 2, my = (g.ay + g.by) / 2;
    const x = CX + mx * ca - my * sa, y = CY + mx * sa + my * ca;
    const out = Math.atan2(y - CY, x - CX) + (rng() - 0.5) * 0.6, v = 180 + rng() * 420;
    s.parts.push({ x, y, vx: Math.cos(out) * v, vy: Math.sin(out) * v, age: 0, life: 0.8 + rng() * 0.9, c: L.c, sz: 3 + rng() * 6 });
  }
}

function stepParts(s, dt) {
  if (!s.parts.length) return;
  const k = Math.exp(-1.8 * dt);
  for (const p of s.parts) { p.vx *= k; p.vy = p.vy * k + 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt; }
  if (s.parts.some(p => p.age >= p.life)) s.parts = s.parts.filter(p => p.age < p.life);
}

const snapParts = s => s.parts.map(p => ({ x: p.x, y: p.y, a: 1 - p.age / p.life, c: p.c, s: p.sz }));
const snapBall = (b, extra) => ({ x: b.x, y: b.y, r: b.r, c: b.c, alive: b.alive, ...extra });

function nestedLayers(rng, shapes, N, firstIn, spacing, maxR, gapLen, ballR, giro) {
  const base = [];
  let inR = firstIn;
  for (let i = 0; i < N; i++) {
    const n = shapes[i % shapes.length];
    base.push({ n, inR });
    inR = inR / Math.cos(Math.PI / n) + spacing;
  }
  const last = base[N - 1];
  const k = Math.min(1, maxR / (last.inR / Math.cos(Math.PI / last.n)));
  const r = Math.max(9, ballR * Math.sqrt(k));
  const layers = base.map((q, i) => {
    const R = q.inR * k;
    const gap = Math.max(gapLen * Math.sqrt(k), 2.6 * r) * (0.75 + R / 380);
    const L = makeLayer(q.n, R, rng() * TAU, Math.min(1.2, gap / R));
    L.angle = rng() * TAU;
    L.omega = (i % 2 ? 1 : -1) * (0.8 + rng() * 0.6) * giro;
    L.c = N > 1 ? i / (N - 1) : 0;
    return L;
  });
  return { layers, ballR: r };
}

const SHAPES = { misto: [6, 96, 8, 96], circulos: [96], hexagonos: [6], octogonos: [8], quadrados: [4] };
const FORMAS = [['misto', 'Misto'], ['circulos', 'Círculos'], ['hexagonos', 'Hexágonos'], ['octogonos', 'Octógonos'], ['quadrados', 'Quadrados']];

// ---------- simulações ----------
export const SIMS = {
  labirinto: {
    name: 'Fuga do labirinto', icon: '🌀',
    desc: 'Camadas que giram, cada uma com uma fresta. A bolinha precisa escapar de todas.',
    params: [
      { k: 'camadas', l: 'Camadas', type: 'range', min: 4, max: 16, step: 1, def: 8 },
      { k: 'forma', l: 'Formato', type: 'select', def: 'misto', opts: FORMAS },
      { k: 'giro', l: 'Velocidade do giro', type: 'range', min: 0.4, max: 2, step: 0.1, def: 1 },
      { k: 'fresta', l: 'Tamanho da fresta', type: 'range', min: 0.6, max: 1.6, step: 0.1, def: 1 },
    ],
    outcomes: [['any', 'Sempre escapa (o suspense é o tempo)']],
    hooks: ['Can the little ball escape? 🫣', 'Will it break out of every layer?', "Bet you can't watch till the end 👀", 'How many layers will it break?'],
    ctas: ['Did you think it would make it? 👇', 'Comment how long you lasted 👇', 'Watch again and look at the last one 🔁'],
    tags: '#maze #escape #bouncingball',
    create(s, rng, o) {
      const { layers, ballR } = nestedLayers(rng, SHAPES[o.forma] || SHAPES.misto, o.camadas | 0, 90, 38, 450, 58 * o.fresta, 15, o.giro);
      s.layers = layers; s.cur = 0;
      s.ball = newBall(CX + (rng() - 0.5) * 10, CY, 1100 + rng() * 200, rng() * TAU, ballR, -1);
    },
    step(s, dt, emit, rng) {
      for (const L of s.layers) L.angle += L.omega * dt;
      const b = s.ball;
      integrate(b, dt);
      if (!s.done) {
        const L = s.layers[s.cur];
        if (collide(b, L)) { keepEnergy(b); if (s.time - b.lastHit > 0.06) { b.lastHit = s.time; emit('hit'); } }
        if (!inside(L, b.x, b.y)) {
          L.alive = false; burstLayer(s, rng, L); s.cur++;
          if (s.cur >= s.layers.length) {
            s.done = true; s.outcome = 'escapou'; emit('win');
            burst(s, rng, b.x, b.y, 90, -3, 900, 1.6);
          } else emit('break', { left: s.layers.length - s.cur });
        }
      }
    },
    geo: s => ({ layers: s.layers.map(L => ({ segs: L.segs, n: L.n, c: L.c, inR: L.inR })) }),
    snap: s => ({
      balls: [snapBall(s.ball, { c: s.cur < s.layers.length ? s.layers[s.cur].c : -3 })],
      ang: s.layers.map(L => (L.alive ? L.angle : null)), cur: s.cur, parts: snapParts(s),
    }),
  },

  zona: {
    name: 'Zona vermelha', icon: '🎯',
    desc: 'A bolinha cresce a cada quique e a zona vermelha avança. Ela escapa pela saída ou toca no vermelho?',
    params: [
      { k: 'fenda', l: 'Tamanho da saída', type: 'range', min: 0.7, max: 1.6, step: 0.1, def: 1 },
      { k: 'cresce', l: 'Crescimento da bolinha', type: 'range', min: 0, max: 3, step: 0.2, def: 1.2 },
      { k: 'vermelho', l: 'Avanço da zona vermelha', type: 'range', min: 0, max: 2, step: 0.1, def: 1 },
      { k: 'giro', l: 'Velocidade do giro', type: 'range', min: 0.3, max: 2, step: 0.1, def: 0.7 },
    ],
    outcomes: [['any', 'Aleatório'], ['escapou', 'Escapa pela saída'], ['ruim', 'Cai na zona vermelha']],
    hooks: ['Will it hit the red zone? 😬', 'Can it escape before it gets too big?', 'The more it bounces, the bigger it gets… 😰'],
    ctas: ['Did you guess right? Comment 👇', 'Escaped or caught? Answer without rewinding 👀', 'Tell me what you thought would happen 👇'],
    tags: '#challenge #redzone #bouncingball',
    create(s, rng, o) {
      const L = makeLayer(96, 430, 0, (125 * o.fenda) / 430);
      L.angle = rng() * TAU; L.omega = (rng() < 0.5 ? -1 : 1) * 0.55 * o.giro;
      s.layer = L; s.o = o; s.bounces = 0;
      s.redAng = Math.PI + (rng() - 0.5) * 1.2; s.redW = 0.08;
      s.redMax = 2 * (angDiff(s.redAng, 0) - L.gapW / 2 - 0.12);
      s.ball = newBall(CX, CY - 120, 800 + rng() * 200, rng() * TAU, 18, 0);
    },
    step(s, dt, emit, rng) {
      const L = s.layer, b = s.ball;
      L.angle += L.omega * dt;
      if (b.alive) integrate(b, dt);
      if (s.done) return;
      const hit = collide(b, L);
      if (hit) {
        const [lx, ly] = toLocal(L, b.x, b.y);
        const reach = Math.asin(Math.min(1, b.r / L.inR)) * 0.8;
        if (angDiff(Math.atan2(ly, lx), s.redAng) < s.redW / 2 + reach) {
          s.done = true; s.outcome = 'ruim'; b.alive = false;
          burst(s, rng, b.x, b.y, 120, -2, 1000, 1.4); emit('lose');
          return;
        }
        keepEnergy(b); s.bounces++;
        b.r = Math.min(b.r + 1.1 * s.o.cresce, 200);
        b.c = (s.bounces * 0.07) % 1;
        s.redW = Math.min(s.redMax, s.redW + 0.016 * s.o.vermelho);
        if (s.time - b.lastHit > 0.06) { b.lastHit = s.time; emit('hit'); }
      }
      if (!inside(L, b.x, b.y)) {
        s.done = true; s.outcome = 'escapou'; emit('win');
        burst(s, rng, b.x, b.y, 90, -3, 900, 1.6);
      }
    },
    geo: s => ({ segs: s.layer.segs, inR: s.layer.inR, gapAng: s.layer.gapAng, gapW: s.layer.gapW }),
    snap: s => ({ balls: [snapBall(s.ball)], ang: s.layer.angle, redAng: s.redAng, redW: s.redW, bounces: s.bounces, parts: snapParts(s) }),
  },

  plinko: {
    name: 'Chuva de bolinhas', icon: '💀',
    desc: 'Bolinhas caem uma a uma pelos pinos. Quantas vão parar na zona vermelha?',
    params: [
      { k: 'bolas', l: 'Bolinhas', type: 'range', min: 3, max: 10, step: 1, def: 8 },
      { k: 'zona', l: 'Zona vermelha', type: 'select', def: '1', opts: [['1', '1 casa no centro'], ['3', '3 casas no centro'], ['bordas', 'Casas das bordas']] },
      { k: 'intervalo', l: 'Intervalo entre bolinhas (s)', type: 'range', min: 1, max: 3.5, step: 0.1, def: 2 },
    ],
    outcomes: [['any', 'Aleatório'], ['ultima_ruim', 'A última cai na vermelha'], ['ultima_boa', 'A última se salva'], ['nenhuma', 'Nenhuma cai na vermelha']],
    hooks: ['How many will land in the red zone? 💀', 'Guess a number before it ends 👇', 'The last one decides everything… 😬'],
    ctas: ['What was your guess? 👇', 'Did you call the score? Comment 👇', 'Watch again and guess again 🔁'],
    tags: '#plinko #luck #balls',
    matches: (r, want) => want === 'any' || (want === 'nenhuma' ? r.bad === 0 : r.outcome === want),
    create(s, rng, o) {
      const P = PLINKO;
      s.pegs = [];
      for (let j = 0; j < P.rows; j++) {
        const count = j + 3;
        for (let k = 0; k < count; k++) s.pegs.push({ x: CX + (k - (count - 1) / 2) * P.sp, y: P.top + j * P.sp * 0.9, row: j });
      }
      s.glow = new Float32Array(s.pegs.length);
      s.red = new Set(o.zona === '3' ? [5, 6, 7] : o.zona === 'bordas' ? [0, 1, 11, 12] : [6]);
      s.balls = []; s.counts = new Array(13).fill(0); s.dropped = 0; s.next = 0.6; s.good = 0; s.bad = 0; s.o = o;
    },
    step(s, dt, emit, rng) {
      const P = PLINKO, o = s.o;
      if (s.dropped < o.bolas && s.time >= s.next) {
        const b = newBall(CX + (rng() - 0.5) * 14, 440, 40 + rng() * 40, Math.PI / 2 + (rng() - 0.5) * 0.8, P.ballR, s.dropped / Math.max(1, o.bolas - 1));
        s.balls.push(b); s.dropped++; s.next += o.intervalo;
      }
      const decay = Math.exp(-5 * dt);
      for (let i = 0; i < s.glow.length; i++) s.glow[i] *= decay;
      for (const b of s.balls) {
        if (b.landed) continue;
        integrate(b, dt, 1500);
        for (let i = 0; i < s.pegs.length; i++) {
          const p = s.pegs[i], dx = b.x - p.x, dy = b.y - p.y;
          if (Math.abs(dx) > 30 || Math.abs(dy) > 30) continue;
          const d = Math.hypot(dx, dy), m = b.r + P.pegR;
          if (d >= m || d < 1e-6) continue;
          const nx = dx / d, ny = dy / d;
          b.x += nx * (m - d); b.y += ny * (m - d);
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= 1.45 * vn * nx; b.vy -= 1.45 * vn * ny;
            const j = (rng() - 0.5) * 0.35, c = Math.cos(j), sn = Math.sin(j);
            [b.vx, b.vy] = [b.vx * c - b.vy * sn, b.vx * sn + b.vy * c];
            s.glow[i] = 1;
            if (s.time - b.lastHit > 0.05) { b.lastHit = s.time; emit('hit'); }
          }
        }
        if (b.x < 60 + b.r) { b.x = 60 + b.r; b.vx = Math.abs(b.vx) * 0.6; }
        if (b.x > 1020 - b.r) { b.x = 1020 - b.r; b.vx = -Math.abs(b.vx) * 0.6; }
        if (b.y > P.landY) {
          const slot = Math.max(0, Math.min(12, Math.round((b.x - CX) / P.sp) + 6));
          b.landed = true; b.slot = slot; b.stack = s.counts[slot]++; b.red = s.red.has(slot);
          if (b.red) s.bad++; else s.good++;
          burst(s, rng, CX + (slot - 6) * P.sp, P.binTop + 30, 26, b.red ? -2 : b.c, 420, 0.8);
          if (s.dropped === o.bolas && s.balls.every(x => x.landed)) {
            s.done = true; s.outcome = b.red ? 'ultima_ruim' : 'ultima_boa';
            s.result = { outcome: s.outcome, good: s.good, bad: s.bad };
            emit(b.red ? 'lose' : 'win', { soft: true });
          } else emit('land', { red: b.red });
        }
      }
      const last = s.balls[o.bolas - 1];
      s.timeScale = o.bolas > 1 && last && !last.landed && last.y > 780 ? 0.45 : 1;
    },
    geo: s => ({ pegs: s.pegs, red: [...s.red] }),
    snap: s => ({
      balls: s.balls.map(b => snapBall(b, { landed: !!b.landed, slot: b.slot, stack: b.stack, red: b.red })),
      glow: Float32Array.from(s.glow), good: s.good, bad: s.bad, slow: s.timeScale < 1, parts: snapParts(s),
    }),
  },

  corrida: {
    name: 'Corrida de cores', icon: '🏁',
    desc: 'Bolinhas coloridas presas em camadas giratórias. A primeira que escapar de todas vence.',
    params: [
      { k: 'camadas', l: 'Camadas', type: 'range', min: 1, max: 4, step: 1, def: 3 },
      { k: 'bolas', l: 'Cores na corrida', type: 'range', min: 2, max: 4, step: 1, def: 4 },
      { k: 'giro', l: 'Velocidade do giro', type: 'range', min: 0.4, max: 2, step: 0.1, def: 1 },
      { k: 'fresta', l: 'Tamanho da fresta', type: 'range', min: 0.7, max: 1.6, step: 0.1, def: 1 },
    ],
    outcomes: [['any', 'Aleatório'], ...RACE.slice(0, 4).map(r => [r.k, `${r.pt} vence`])],
    hooks: ['Pick a color before it starts 👇', 'Which color escapes first? 🏁', 'Comment your color and watch till the end'],
    ctas: ['Did your color win? 👇', 'Comment: did you win or lose? 🏆', 'Pick another color and watch again 🔁'],
    tags: '#race #pickacolor #marblerace',
    create(s, rng, o) {
      const N = o.camadas | 0;
      const { layers, ballR } = nestedLayers(rng, [6, 96, 8, 96], N, 150, 110, 450, 70 * o.fresta, 22, o.giro);
      s.layers = layers; s.lastNote = -1;
      s.balls = [];
      for (let k = 0; k < o.bolas; k++) {
        const a = k * TAU / o.bolas + rng() * 0.3;
        const b = newBall(CX + Math.cos(a) * 55, CY + Math.sin(a) * 55, 650 + rng() * 200, rng() * TAU, ballR, -10 - k);
        b.k = k; b.level = 0; s.balls.push(b);
      }
    },
    step(s, dt, emit, rng) {
      for (const L of s.layers) L.angle += L.omega * dt;
      const note = () => { if (s.time - s.lastNote > 0.07) { s.lastNote = s.time; emit('hit'); } };
      for (const b of s.balls) {
        integrate(b, dt);
        for (const L of s.layers) if (collide(b, L)) { keepEnergy(b); note(); }
      }
      for (let i = 0; i < s.balls.length; i++) for (let j = i + 1; j < s.balls.length; j++) {
        const a = s.balls[i], b = s.balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
        if (d >= m || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, push = (m - d) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
          keepEnergy(a); keepEnergy(b); note();
        }
      }
      for (const b of s.balls) {
        let lv = 0;
        for (const L of s.layers) if (!inside(L, b.x, b.y)) lv++;
        if (lv > b.level && !s.done) {
          if (lv === s.layers.length) {
            s.done = true; s.winner = b.k; s.outcome = RACE[b.k].k; emit('win', { k: b.k });
            burst(s, rng, b.x, b.y, 100, b.c, 950, 1.6);
          } else { emit('pass', { k: b.k }); burst(s, rng, b.x, b.y, 18, b.c, 380, 0.7); }
        }
        b.level = lv;
      }
    },
    geo: s => ({ layers: s.layers.map(L => ({ segs: L.segs, n: L.n, c: L.c, inR: L.inR })) }),
    snap: s => ({
      balls: s.balls.map(b => snapBall(b, { level: b.level })),
      ang: s.layers.map(L => L.angle), winner: s.winner, parts: snapParts(s),
    }),
  },
};

// ---------- corrida na pista (pista gerada pela seed, câmera acompanha o líder) ----------
export const TRACK = { X0: 80, X1: 1000, gateY: 700, ballR: 16 };

// Colisão bola × segmento em coordenadas do mundo. `wv` é a velocidade da parede (pás giratórias).
// Devolve a velocidade do impacto (0 se não encostou).
function hitSeg(b, ax, ay, bx, by, e, th = 0, wvx = 0, wvy = 0) {
  const ex = bx - ax, ey = by - ay;
  let u = ((b.x - ax) * ex + (b.y - ay) * ey) / (ex * ex + ey * ey);
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  let nx = b.x - (ax + ex * u), ny = b.y - (ay + ey * u);
  const d = Math.hypot(nx, ny), m = b.r + th;
  if (d >= m || d < 1e-9) return 0;
  nx /= d; ny /= d;
  b.x += nx * (m - d); b.y += ny * (m - d);
  const rvx = b.vx - wvx, rvy = b.vy - wvy, vn = rvx * nx + rvy * ny;
  if (vn >= 0) return 1e-4;
  const tx = rvx - vn * nx, ty = rvy - vn * ny;
  b.vx = tx * 0.9995 - e * vn * nx + wvx; b.vy = ty * 0.9995 - e * vn * ny + wvy;
  return -vn;
}

function hitCirc(b, cx, cy, R, e, kick = 0) {
  let nx = b.x - cx, ny = b.y - cy;
  const d = Math.hypot(nx, ny), m = b.r + R;
  if (d >= m || d < 1e-9) return 0;
  nx /= d; ny /= d;
  b.x += nx * (m - d); b.y += ny * (m - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 1e-4;
  if (kick) { b.vx += (kick - vn) * nx; b.vy += (kick - vn) * ny; } else { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
  return -vn;
}

const BK = 200; // altura de cada balde da grade espacial
function bucketize(items, y0, y1) {
  const map = new Map();
  for (const it of items) {
    const [a, b] = y0(it) < y1(it) ? [y0(it), y1(it)] : [y1(it), y0(it)];
    for (let k = Math.floor(a / BK); k <= Math.floor(b / BK); k++) { if (!map.has(k)) map.set(k, []); map.get(k).push(it); }
  }
  return map;
}
function near(map, b) {
  const a = Math.floor((b.y - b.r - 4) / BK), c = Math.floor((b.y + b.r + 4) / BK);
  if (a === c) return map.get(a) || [];
  return [...new Set([...(map.get(a) || []), ...(map.get(c) || [])])];
}

const SECTIONS = ['zigzag', 'pinos', 'pas', 'serras', 'funil', 'bumpers'];

function buildTrack(rng, o) {
  const { X0, X1, gateY } = TRACK;
  const segs = [], circ = [], spin = [], saws = [], holes = [], marks = [];
  const add = (ax, ay, bx, by, kind = 'wall') => segs.push({ ax, ay, bx, by, kind });
  const haz = o.perigo;
  const wedges = y => { add(X0, y, X0 + 120, y + 90); add(X1, y, X1 - 120, y + 90); };

  const GEN = {
    zigzag(y) {
      const n = 2 + ((rng() * 2) | 0);
      let side = rng() < 0.5 ? 0 : 1;
      for (let k = 0; k < n; k++) {
        const hx = side ? X1 : X0, lx = side ? X0 + 170 : X1 - 170, hy = y, ly = y + 175;
        if (haz > 0 && rng() < 0.1 * haz) {
          const f = 0.35 + rng() * 0.35, w = 54 / Math.abs(lx - hx);
          const P = u => [hx + (lx - hx) * u, hy + (ly - hy) * u];
          const [ax, ay] = P(f - w / 2), [bx, by] = P(f + w / 2);
          add(hx, hy, ax, ay); add(bx, by, lx, ly);
          holes.push({ x1: Math.min(ax, bx) + 4, x2: Math.max(ax, bx) - 4, y1: Math.max(ay, by) + 8, y2: Math.max(ay, by) + 80, ax, ay, bx, by });
        } else add(hx, hy, lx, ly);
        y = ly + 125; side = 1 - side;
      }
      return y + 30;
    },
    pinos(y) {
      const rows = 5 + ((rng() * 2) | 0);
      for (let j = 0; j < rows; j++) {
        for (let x = X0 + 70 + (j % 2 ? 45 : 0); x <= X1 - 70; x += 90) {
          if (rng() < 0.12) continue;
          const r = rng(), kind = haz > 0 && r < 0.012 * haz ? 'mina' : r > 0.9 ? 'bumper' : 'pino';
          circ.push({ x: x + (rng() - 0.5) * 14, y: y + 40 + j * 85, r: kind === 'pino' ? 10 : kind === 'mina' ? 15 : 20, kind });
        }
      }
      return y + 40 + rows * 85 + 30;
    },
    pas(y) {
      wedges(y);
      for (let j = 0; j < 2; j++) {
        const cy = y + 190 + j * 270;
        for (const x of j % 2 ? [320, 760] : [540]) {
          spin.push({ x, y: cy, half: 125, a0: rng() * Math.PI, om: (rng() < 0.5 ? -1 : 1) * (1.6 + rng() * 1.6), kill: haz > 0 && rng() < 0.12 * haz });
        }
      }
      return y + 190 + 2 * 270 + 20;
    },
    serras(y) {
      if (haz <= 0) return GEN.bumpers(y);
      wedges(y);
      const n = Math.min(2, 1 + (rng() < 0.2 * haz ? 1 : 0));
      for (let j = 0; j < n; j++) {
        const sy = y + 170 + j * 230;
        saws.push({ x0: 540, y: sy, amp: 300, w: (1.1 + rng() * 1.0) * (rng() < 0.5 ? -1 : 1), ph: rng() * TAU, r: 24 });
        for (const x of [X0 + 150 + rng() * 200, X1 - 150 - rng() * 200]) circ.push({ x, y: sy + 110, r: 10, kind: 'pino' });
      }
      return y + 170 + n * 230 + 30;
    },
    funil(y) {
      add(X0, y, 488, y + 260); add(X1, y, 592, y + 260);
      circ.push({ x: 540 + (rng() - 0.5) * 30, y: y + 360, r: 24, kind: 'bumper' });
      return y + 430;
    },
    bumpers(y) {
      const rows = 3;
      for (let j = 0; j < rows; j++) {
        const cnt = 2 + ((rng() * 2) | 0);
        for (let k = 0; k < cnt; k++) {
          const x = X0 + 120 + ((k + 0.5) / cnt) * (X1 - X0 - 240) + (rng() - 0.5) * 90;
          const mine = haz > 0 && rng() < 0.04 * haz;
          circ.push({ x, y: y + 110 + j * 175 + (rng() - 0.5) * 40, r: mine ? 16 : 26 + rng() * 6, kind: mine ? 'mina' : 'bumper' });
        }
      }
      return y + 110 + rows * 175 + 20;
    },
  };

  add(X0, gateY, X1, gateY, 'gate');
  let y = gateY + 90, prev = null;
  const N = { curta: 6, media: 10, longa: 14 }[o.tamanho] || 10;
  for (let i = 0; i < N; i++) {
    let t;
    do t = SECTIONS[(rng() * SECTIONS.length) | 0];
    while (t === prev || (i === 0 && t === 'funil') || (t === 'serras' && rng() > 0.5 * haz));
    prev = t; marks.push({ y, t });
    y = GEN[t](y) + 40;
  }
  const finishY = y + 60, floorY = finishY + 300;
  add(X0, floorY, X1, floorY);
  add(X0, 380, X0, floorY); add(X1, 380, X1, floorY);
  return { segs, circ, spin, saws, holes, marks, finishY, floorY, trackH: floorY + 650 };
}

const spinEnds = (p, t) => {
  const a = p.a0 + p.om * t, c = Math.cos(a) * p.half, s = Math.sin(a) * p.half;
  return [p.x - c, p.y - s, p.x + c, p.y + s];
};
const sawX = (p, t) => p.x0 + p.amp * Math.sin(p.w * t + p.ph);
export const trackAt = { spinEnds, sawX };

const PISTA = {
  name: 'Corrida na pista', icon: '🏁',
  desc: 'Pista gerada pela seed: largada, obstáculos, armadilhas que eliminam e linha de chegada.',
  params: [
    { k: 'bolas', l: 'Bolinhas', type: 'range', min: 3, max: 8, step: 1, def: 6 },
    { k: 'tamanho', l: 'Tamanho da pista', type: 'select', def: 'media', opts: [['curta', 'Curta'], ['media', 'Média'], ['longa', 'Longa']] },
    { k: 'perigo', l: 'Armadilhas', type: 'range', min: 0, max: 2, step: 0.25, def: 1 },
  ],
  outcomes: [['any', 'Aleatório'], ['drama', 'Metade ou mais eliminada'], ...RACE.map(r => [r.k, `${r.pt} vence`])],
  hooks: ['Pick your marble before the race 👇', 'Only one gets to the finish first… 🏁', 'Which color survives the track? 💀', 'Comment your color and watch till the end 👇'],
  ctas: ['Did your marble win? 👇', 'Comment your color for the next race 🏁', 'Rematch? Pick a new color 🔁'],
  tags: '#marblerace #marbles #race #pickacolor',
  matches: (r, want) => want === 'any' || (want === 'drama' ? r.elim >= Math.floor(r.n / 2) : r.outcome === want),
  create(s, rng, o) {
    const T = buildTrack(rng, o);
    Object.assign(s, T);
    s.o = o; s.cam = 0; s.placed = 0; s.lastNote = -1; s.go = false;
    s.segMap = bucketize(T.segs, g => g.ay, g => g.by);
    s.circMap = bucketize(T.circ, c => c.y - c.r, c => c.y + c.r);
    s.spinMap = bucketize(T.spin, p => p.y - p.half, p => p.y + p.half);
    s.sawMap = bucketize(T.saws, p => p.y - p.r, p => p.y + p.r);
    s.holeMap = bucketize(T.holes, h => h.y1, h => h.y2);
    const order = [...Array(o.bolas).keys()].sort(() => rng() - 0.5);
    const { X0, X1, gateY, ballR } = TRACK, gap = (X1 - X0 - 240) / Math.max(1, o.bolas - 1);
    s.balls = order.map((k, i) => ({
      x: X0 + 120 + i * gap + (rng() - 0.5) * 6, y: gateY - ballR - 1, vx: 0, vy: 0, r: ballR, c: -10 - k, k,
      alive: true, fin: false, place: 0, still: 0, elimT: null,
    }));
  },
  step(s, dt, emit, rng) {
    const t = s.time;
    if (!s.go && t > 0.9) { s.go = true; emit('go'); }
    const alive = s.balls.filter(b => b.alive);
    const note = imp => { if (imp > 160 && t - s.lastNote > 0.08) { s.lastNote = t; emit('hit'); } };
    const kill = (b, why) => {
      if (b.fin || s.balls.filter(x => x.alive).length <= 1) return false;
      b.alive = false; b.elimT = t;
      burst(s, rng, b.x, b.y, 50, -2, 700, 1.1); burst(s, rng, b.x, b.y, 30, b.c, 500, 0.9);
      emit('elim', { k: b.k, why });
      return true;
    };
    for (const b of alive) {
      b.vy += G * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 950) { b.vx *= 950 / sp; b.vy *= 950 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const g of near(s.segMap, b)) {
        if (g.kind === 'gate' && s.go) continue;
        note(hitSeg(b, g.ax, g.ay, g.bx, g.by, 0.3));
      }
      for (const c of near(s.circMap, b)) {
        if (c.kind === 'mina' && Math.hypot(b.x - c.x, b.y - c.y) < b.r + c.r && kill(b, 'mina')) break;
        note(hitCirc(b, c.x, c.y, c.r, 0.5, c.kind === 'bumper' ? 650 : 0));
      }
      if (!b.alive) continue;
      for (const p of near(s.spinMap, b)) {
        const [ax, ay, bx, by] = spinEnds(p, t), ex = bx - ax, ey = by - ay;
        let u = ((b.x - ax) * ex + (b.y - ay) * ey) / (ex * ex + ey * ey); u = u < 0 ? 0 : u > 1 ? 1 : u;
        const px = ax + ex * u, py = ay + ey * u;
        if (p.kill && Math.hypot(b.x - px, b.y - py) < b.r + 6 && kill(b, 'pa')) break;
        note(hitSeg(b, ax, ay, bx, by, 0.4, 6, -p.om * (py - p.y), p.om * (px - p.x)));
      }
      if (!b.alive) continue;
      for (const p of near(s.sawMap, b)) {
        const x = sawX(p, t);
        if (Math.hypot(b.x - x, b.y - p.y) < b.r + p.r && kill(b, 'serra')) break;
        hitCirc(b, x, p.y, p.r, 0.6);
      }
      if (!b.alive) continue;
      for (const h of near(s.holeMap, b)) if (b.x > h.x1 && b.x < h.x2 && b.y > h.y1 && b.y < h.y2 && kill(b, 'buraco')) break;
      if (!b.alive) continue;
      // destrava bolinha parada (nunca fica presa num canto)
      if (s.go && !b.fin && Math.hypot(b.vx, b.vy) < 30) { b.still += dt; if (b.still > 1.2) { b.vx += (rng() < 0.5 ? -1 : 1) * 320; b.vy -= 260; b.still = 0; } } else b.still = 0;
      if (!b.fin && b.y > s.finishY) {
        b.fin = true; b.place = ++s.placed;
        if (b.place === 1) {
          s.done = true; s.winner = b.k; s.outcome = RACE[b.k].k;
          burst(s, rng, b.x, s.finishY, 110, b.c, 950, 1.6); burst(s, rng, b.x, s.finishY, 50, -3, 800, 1.4);
          emit('win', { k: b.k });
        } else { burst(s, rng, b.x, s.finishY, 20, b.c, 400, 0.8); emit('finish', { place: b.place }); }
      }
    }
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      if (!a.alive || !b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d >= m || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, push = (m - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) { const k = rel * 0.9; a.vx -= k * nx; a.vy -= k * ny; b.vx += k * nx; b.vy += k * ny; note(rel); }
    }
    if (s.done && !s.result) s.result = { outcome: s.outcome, elim: s.balls.filter(b => !b.alive).length, n: s.balls.length };
    const lead = s.winner !== undefined ? s.finishY + 200 : Math.max(0, ...s.balls.filter(b => b.alive && !b.fin).map(b => b.y));
    const target = Math.max(0, Math.min(s.trackH - H, lead - 1000));
    s.cam += (target - s.cam) * (1 - Math.exp(-6 * dt));
  },
  geo: s => ({ segs: s.segs, circ: s.circ, spin: s.spin, saws: s.saws, holes: s.holes, finishY: s.finishY, floorY: s.floorY, trackH: s.trackH }),
  snap: s => ({
    balls: s.balls.map(b => snapBall(b, { k: b.k, fin: b.fin, place: b.place, elimT: b.elimT })),
    cam: s.cam, time: s.time, go: s.go, parts: snapParts(s),
  }),
};
SIMS.pista = PISTA;

export const defaultsOf = def => Object.fromEntries(def.params.map(p => [p.k, p.def]));

export function runSim(id, opts, seed, keepFrames = true, maxT = 90) {
  const def = SIMS[id];
  const o = { ...defaultsOf(def), ...opts };
  const rng = mulberry32(seed >>> 0);
  const s = { time: 0, parts: [], timeScale: 1, done: false, outcome: null };
  def.create(s, rng, o);
  const geo = def.geo(s);
  const frames = [], events = [];
  let t = 0, nFrames = 0, climax = null;
  const emit = (type, data = {}) => events.push({ t, type, ...data });
  for (;;) {
    for (let k = 0; k < SUB; k++) {
      const dt = DT * s.timeScale;
      s.time += dt;
      def.step(s, dt, emit, rng);
      stepParts(s, dt);
      t += DT;
    }
    nFrames++;
    if (keepFrames) frames.push(def.snap(s));
    if (s.done && climax === null) climax = t;
    if (climax !== null && t >= climax + OUTRO) break;
    if (t >= maxT) break;
  }
  const result = s.result || { outcome: s.outcome };
  return { id, o, seed, geo, frames, events, climax, nFrames, duration: nFrames / FPS, result, timeout: climax === null };
}

export function matches(id, result, want) {
  const def = SIMS[id];
  return def.matches ? def.matches(result, want) : want === 'any' || result.outcome === want;
}

// Procura uma seed com o final escolhido e a duração certa.
export async function findSeed(id, opts, want, range, onTry, maxTries = 400) {
  let seed = (Math.random() * 1e6) | 0;
  for (let i = 0; i < maxTries; i++, seed++) {
    const r = runSim(id, opts, seed, false);
    if (!r.timeout && matches(id, r.result, want) && r.duration >= range[0] && r.duration <= range[1]) return seed;
    if (i % 3 === 0) { onTry?.(i + 1); await new Promise(res => setTimeout(res, 0)); }
  }
  return null;
}

export const fmtTime = sec => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')}`;
