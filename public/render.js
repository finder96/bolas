// Desenha um quadro da linha do tempo num canvas 1080×1920.
import { W, H, FPS, CX, CY, RACE, PLINKO, TRACK, MULTI, ARENA, trackAt, angDiff, mulberry32, raceLabels, ranking, leagueResult } from './sims.js';

const TAU = Math.PI * 2;
const FONT = "Fredoka, 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";

export const PALETTES = {
  neon: { name: 'Neon', stops: ['#ff3cac', '#ffb86c', '#f1fa8c', '#50fa7b', '#8be9fd', '#bd93f9'] },
  pastel: { name: 'Pastel', stops: ['#ffc8dd', '#ffe5b4', '#fdffb6', '#caffbf', '#bde0fe', '#e0c3fc'] },
  'por-do-sol': { name: 'Pôr do sol', stops: ['#ffe29a', '#ffb36b', '#ff7b6b', '#ff4f8b', '#c86bff'] },
  gelo: { name: 'Gelo', stops: ['#f0fdff', '#a5f3fc', '#67e8f9', '#a5b4fc', '#d8b4fe'] },
  ouro: { name: 'Ouro', stops: ['#fff6d5', '#ffe08a', '#ffc94d', '#f5a742', '#fff1c1'] },
  lotus: { name: 'Roxo + turquesa', stops: ['#5fd3c4', '#8be3d6', '#c08bd8', '#a0408f', '#e9a8ff'] },
};

export const BACKGROUNDS = {
  noite: { name: 'Noite estrelada', grad: ['#060a1c', '#171238', '#3a2357'], stars: true },
  aurora: { name: 'Aurora', grad: ['#03100f', '#0a2a2f', '#1b1240'], blobs: ['#14f1c6', '#7b5cff', '#ff4fa3'] },
  'por-do-sol': { name: 'Pôr do sol', grad: ['#1d1036', '#6e2a5a', '#e0775a'], bokeh: true },
  oceano: { name: 'Fundo do mar', grad: ['#021821', '#05384a', '#0b5c6b'], rays: true },
  grafite: { name: 'Grafite', grad: ['#0b0b0e', '#15151b', '#0b0b0e'], grid: true },
};

// ---------- cores ----------
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => v + (B[i] - v) * t)); };

function paletteAt(stops, t) {
  t = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  return mix(stops[i], stops[i + 1], t - i);
}

const easeBack = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const clamp01 = x => Math.max(0, Math.min(1, x));

function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

export class Renderer {
  constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); }

  async setup(tl, st) {
    this.tl = tl; this.st = st;
    this.stops = (PALETTES[st.palette] || PALETTES.neon).stops;
    this.img = null;
    if (st.bgUrl) this.img = await loadImage(st.bgUrl).catch(() => null);
    this.bg = BACKGROUNDS[st.bg] || BACKGROUNDS.noite;
    this.bgCache = document.createElement('canvas'); this.bgCache.width = W; this.bgCache.height = H;
    const b = this.bgCache.getContext('2d'), g = b.createLinearGradient(0, 0, 0, H);
    this.bg.grad.forEach((c, i) => g.addColorStop(i / (this.bg.grad.length - 1), c));
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    const r = mulberry32(7);
    this.stars = Array.from({ length: 160 }, () => ({ x: r() * W, y: r() * H, s: 0.6 + r() * 2.2, p: r() * TAU }));
    this.bokeh = Array.from({ length: 18 }, () => ({ x: r() * W, y: r() * H, s: 30 + r() * 110, v: 6 + r() * 16, p: r() * TAU }));
    const ev = tl.events;
    this.flashes = ev.filter(e => e.type === 'break' || e.type === 'win' || e.type === 'pass').map(e => [e.t, e.type === 'win' ? 0.45 : 0.16]);
    this.loseT = ev.find(e => e.type === 'lose' && !e.soft)?.t ?? null;
    this.elims = ev.filter(e => e.type === 'elim').map(e => e.t);
    this.labels = raceLabels(tl.o);
    this.league = null;
    await Promise.all([document.fonts.load(`700 64px Fredoka`), document.fonts.load(`600 40px Fredoka`)]).catch(() => {});
  }

  color(code) {
    if (code >= 0) return paletteAt(this.stops, code);
    if (code === -1) return '#ffffff';
    if (code === -2) return '#ff3b4a';
    if (code === -3) return '#ffd54a';
    return RACE[-10 - code]?.c || '#ffffff';
  }

  draw(i) {
    const { ctx, tl } = this;
    i = Math.max(0, Math.min(i, tl.frames.length - 1));
    const f = tl.frames[i], t = i / FPS;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.drawBg(t);
    if (this.loseT !== null && t >= this.loseT && t < this.loseT + 0.45) {
      const k = 1 - (t - this.loseT) / 0.45;
      ctx.translate(Math.sin(t * 90) * 18 * k, Math.cos(t * 77) * 14 * k);
    }
    ctx.translate(0, -(f.cam || 0)); // só a pista tem câmera; nas outras cam = 0
    DRAW[tl.id](this, f, i);
    this.drawParts(f.parts);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const et of this.elims) {
      if (t >= et && t < et + 0.25) { ctx.fillStyle = `rgba(255,40,60,${0.14 * (1 - (t - et) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
    }
    for (const [ft, a] of this.flashes) {
      if (t >= ft && t < ft + 0.18) { ctx.fillStyle = `rgba(255,255,255,${a * (1 - (t - ft) / 0.18)})`; ctx.fillRect(0, 0, W, H); }
    }
    if (this.loseT !== null && t >= this.loseT && t < this.loseT + 0.6) {
      ctx.fillStyle = `rgba(255,40,60,${0.28 * (1 - (t - this.loseT) / 0.6)})`; ctx.fillRect(0, 0, W, H);
    }
    if (tl.id === 'pista') {
      const top = ctx.createLinearGradient(0, 0, 0, 560);
      top.addColorStop(0, 'rgba(8,6,16,0.85)'); top.addColorStop(0.75, 'rgba(8,6,16,0.6)'); top.addColorStop(1, 'rgba(8,6,16,0)');
      ctx.fillStyle = top; ctx.fillRect(0, 0, W, 560);
      const bot = ctx.createLinearGradient(0, 1430, 0, H);
      bot.addColorStop(0, 'rgba(8,6,16,0)'); bot.addColorStop(0.3, 'rgba(8,6,16,0.75)'); bot.addColorStop(1, 'rgba(8,6,16,0.9)');
      ctx.fillStyle = bot; ctx.fillRect(0, 1430, W, H - 1430);
    }
    this.drawTexts(t, f);
  }

  // ---------- fundo ----------
  drawBg(t) {
    const { ctx, bg } = this;
    if (this.img) {
      const im = this.img, z = 1 + 0.08 * clamp01(t / Math.max(1, this.tl.duration));
      const s = Math.max(W / im.width, H / im.height) * z, w = im.width * s, h = im.height * s;
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.5, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      return;
    }
    ctx.drawImage(this.bgCache, 0, 0);
    if (bg.stars) {
      ctx.fillStyle = '#fff';
      for (const s of this.stars) {
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.7 + s.p));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (bg.blobs) {
      ctx.globalCompositeOperation = 'lighter';
      bg.blobs.forEach((c, k) => {
        const x = W / 2 + Math.sin(t * 0.25 + k * 2.1) * 380, y = 500 + k * 420 + Math.cos(t * 0.2 + k) * 160, r = 520;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(c, 0.22)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    if (bg.bokeh) {
      for (const b of this.bokeh) {
        const y = (b.y - t * b.v + H * 4) % (H + 200) - 100;
        ctx.fillStyle = `rgba(255,220,200,${0.06 + 0.05 * Math.sin(t + b.p)})`;
        ctx.beginPath(); ctx.arc(b.x, y, b.s, 0, TAU); ctx.fill();
      }
    }
    if (bg.rays) {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const x = 150 + k * 200 + Math.sin(t * 0.3 + k) * 60;
        const g = ctx.createLinearGradient(x, 0, x + 160, H);
        g.addColorStop(0, 'rgba(140,240,255,0.10)'); g.addColorStop(0.7, 'rgba(140,240,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 40, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x + 330, H); ctx.lineTo(x + 120, H); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (bg.grid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 2;
      const off = (t * 20) % 90;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 90) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = -90 + off; y <= H; y += 90) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // ---------- peças ----------
  glowPath(color, width = 5, alpha = 1) {
    const { ctx } = this;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.2 * alpha; ctx.lineWidth = width * 3.4; ctx.stroke();
    ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = Math.max(1.2, width * 0.3); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  segPath(segs, pred) {
    const { ctx } = this, n = segs.length;
    ctx.beginPath();
    let i0 = -1;
    for (let i = 0; i < n; i++) if (!pred(segs[i])) { i0 = i; break; }
    if (i0 < 0) {
      ctx.moveTo(segs[0].ax, segs[0].ay);
      for (const g of segs) ctx.lineTo(g.bx, g.by);
      ctx.closePath(); return;
    }
    let pen = false;
    for (let k = 1; k <= n; k++) {
      const g = segs[(i0 + k) % n];
      if (pred(g)) { if (!pen) { ctx.moveTo(g.ax, g.ay); pen = true; } ctx.lineTo(g.bx, g.by); } else pen = false;
    }
  }

  layer(L, angle, color, width, alpha) {
    const { ctx } = this;
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(angle);
    this.segPath(L.segs, g => !g.gap);
    this.glowPath(color, width, alpha);
    ctx.restore();
  }

  ball(b, col, trail) {
    const { ctx } = this;
    if (trail) trail.forEach((p, k) => {
      const a = (1 - (k + 1) / (trail.length + 1)) * 0.35;
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath(); ctx.arc(p.x, p.y, b.r * (1 - k * 0.06), 0, TAU); ctx.fill();
    });
    const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.4, b.x, b.y, b.r * 2.6);
    g.addColorStop(0, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.6, 0, TAU); ctx.fill();
    const body = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.4, mix(col, '#ffffff', 0.45)); body.addColorStop(1, col);
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }

  trail(i, k, n = 8) {
    const out = [];
    for (let j = 1; j <= n; j++) {
      const f = this.tl.frames[i - j * 1];
      const b = f?.balls[k];
      if (!b || !b.alive || b.landed) break;
      out.push(b);
    }
    return out;
  }

  drawParts(parts) {
    const { ctx } = this;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = this.color(p.c);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.4 + 0.6 * p.a), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // sigla (ARI, BRA, JAN…) escrita dentro da bolinha
  code(str, x, y, r) {
    if (!str) return;
    const { ctx } = this;
    ctx.font = `700 ${Math.round(r * 0.78)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#120d24'; ctx.fillText(str, x, y + 1);
  }

  ansColor(a) {
    const k = this.tl.geo.answers?.length || 1;
    return this.color(k > 1 ? a / (k - 1) : 0.5);
  }

  // Tabela da liga no fim da corrida: pontos de hoje somados ao acumulado.
  drawLeague(t) {
    const { ctx, st, tl } = this, start = tl.climax + 0.9;
    if (!st.league || tl.id !== 'pista' || tl.timeout || t < start) return;
    const res = leagueResult(tl), before = st.league.pts || {};
    const rows = res.map(x => ({ ...x, total: (before[x.name] || 0) + x.add }))
      .sort((a, b) => b.total - a.total || b.add - a.add);
    const a = clamp01((t - start) / 0.35), rowH = Math.min(62, 760 / rows.length);
    const top = 560, h = 120 + rows.length * rowH;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,7,22,0.9)';
    ctx.beginPath(); ctx.roundRect(70, top, W - 140, h, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,213,74,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    this.text(st.league.title, W / 2, top + 58, 46, { alpha: a, color: '#ffd54a', maxW: W - 220 });
    rows.forEach((x, i) => {
      const ra = clamp01((t - start - 0.25 - i * 0.07) / 0.3);
      if (ra <= 0) return;
      const y = top + 120 + i * rowH + rowH / 2, dx = (1 - ra) * 60;
      ctx.save(); ctx.globalAlpha = ra; ctx.translate(dx, 0);
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(rowH * 0.5)}px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(String(i + 1), 150, y);
      this.ball({ x: 190, y, r: rowH * 0.28 }, x.color);
      ctx.textAlign = 'left'; ctx.fillStyle = x.out ? 'rgba(255,255,255,0.45)' : '#ffffff';
      ctx.fillText(x.name, 230, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = x.add ? '#5ff59a' : '#ff5a66';
      ctx.fillText(x.add ? `+${x.add}` : '✖', 830, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(x.total), 960, y);
      ctx.restore();
    });
  }

  // ---------- textos ----------
  text(str, x, y, size, { weight = 700, color = '#fff', maxW = 940, alpha = 1, scale = 1, stroke = true } = {}) {
    if (!str) return;
    const { ctx } = this;
    let s = size, lines;
    for (;;) {
      ctx.font = `${weight} ${s}px ${FONT}`;
      lines = wrapLines(ctx, str, maxW);
      if (lines.length <= 2 || s <= 40) break;
      s -= 4;
    }
    ctx.save();
    ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lh = s * 1.18, y0 = -((lines.length - 1) * lh) / 2;
    lines.forEach((ln, k) => {
      if (stroke) { ctx.lineWidth = s * 0.16; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineJoin = 'round'; ctx.strokeText(ln, 0, y0 + k * lh); }
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18;
      ctx.fillStyle = color; ctx.fillText(ln, 0, y0 + k * lh);
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  }

  drawTexts(t, f) {
    const { st, tl } = this;
    const end = tl.climax ?? Infinity;
    const intro = clamp01(t / 0.45);
    const out = clamp01((t - end - 0.5) / 0.35);
    // O gancho já aparece no quadro 0 (é a capa no TikTok/Reels); só dá um "pulo" leve.
    if (out < 1) this.text(st.hook, W / 2, 330, 68, { alpha: 1 - out, scale: 0.88 + 0.12 * easeBack(intro) });
    if (out > 0) this.text(st.cta, W / 2, 330, 64, { alpha: out, scale: 0.7 + 0.3 * easeBack(out), color: '#fff3c4' });
    if (st.handle) this.text(st.handle.startsWith('@') ? st.handle : '@' + st.handle, W / 2, 455, 32, { weight: 600, alpha: 0.7, stroke: false });
    if (t >= end && !tl.timeout) {
      const k = clamp01((t - end) / 0.35);
      const [label, color] = RESULT[tl.id](tl, this);
      this.text(label, W / 2, 1535, 84, { scale: 0.5 + 0.5 * easeBack(k), alpha: k, color });
    } else HUD[tl.id](this, f, t);
    this.drawLeague(t);
  }
}

function wrapLines(ctx, str, maxW) {
  // Emoji e pontuação soltos ficam grudados na palavra anterior (não quebram sozinhos).
  const words = [], lines = [];
  for (const w of str.split(/\s+/).filter(Boolean)) {
    if (words.length && !/[\p{L}\p{N}]/u.test(w)) words[words.length - 1] += ' ' + w; else words.push(w);
  }
  let cur = '';
  for (const w of words) {
    const tryL = cur ? cur + ' ' + w : w;
    if (ctx.measureText(tryL).width <= maxW || !cur) cur = tryL; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- desenho por simulação ----------
const DRAW = {
  labirinto(r, f, i) {
    const layers = r.tl.geo.layers;
    for (let k = layers.length - 1; k >= 0; k--) {
      if (f.ang[k] === null) continue;
      const active = k === f.cur;
      r.layer(layers[k], f.ang[k], r.color(layers[k].c), active ? 6 : 4.5, active ? 1 : 0.8);
    }
    const b = f.balls[0];
    r.ball(b, r.color(b.c), r.trail(i, 0));
  },

  zona(r, f, i) {
    const { ctx } = r, geo = r.tl.geo, t = i / FPS;
    const isRed = g => angDiff(g.mid, f.redAng) < f.redW / 2;
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(f.ang);
    r.segPath(geo.segs, g => !g.gap && !isRed(g));
    r.glowPath(r.color((f.bounces * 0.035) % 1), 6);
    r.segPath(geo.segs, g => !g.gap && isRed(g));
    r.glowPath('#ff3b4a', 11, 0.85 + 0.15 * Math.sin(t * 9));
    for (const s of [-1, 1]) {
      const a = geo.gapAng + s * geo.gapW / 2, x = Math.cos(a) * geo.inR, y = Math.sin(a) * geo.inR;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
      g.addColorStop(0, 'rgba(61,220,132,0.9)'); g.addColorStop(1, 'rgba(61,220,132,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eafff2'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    }
    ctx.restore();
    const b = f.balls[0];
    if (b.alive) r.ball(b, r.color(b.c), r.trail(i, 0, 5));
  },

  plinko(r, f, i) {
    const { ctx } = r, P = PLINKO, geo = r.tl.geo, red = new Set(geo.red);
    for (let s = 0; s <= 12; s++) {
      const x0 = CX + (s - 6.5) * P.sp;
      const g = ctx.createLinearGradient(0, P.binTop, 0, P.floor);
      const c = geo.answers ? r.ansColor(geo.slotAns[s]) : red.has(s) ? '#ff3b4a' : r.color(Math.abs(s - 6) / 6);
      g.addColorStop(0, rgba(c, 0)); g.addColorStop(1, rgba(c, red.has(s) ? 0.42 : 0.2));
      ctx.fillStyle = g; ctx.fillRect(x0, P.binTop, P.sp, P.floor - P.binTop);
    }
    ctx.beginPath();
    for (let s = 0; s <= 13; s++) { const x = CX + (s - 6.5) * P.sp; ctx.moveTo(x, P.binTop); ctx.lineTo(x, P.floor); }
    ctx.moveTo(CX - 6.5 * P.sp, P.floor); ctx.lineTo(CX + 6.5 * P.sp, P.floor);
    r.glowPath('#ffffff', 3, 0.75);
    ctx.font = `600 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of red) ctx.fillText('💀', CX + (s - 6) * P.sp, P.floor + 34);
    if (geo.answers) for (let s = 0; s <= 12; s++) ctx.fillText(geo.answers[geo.slotAns[s]][1], CX + (s - 6) * P.sp, P.floor + 34);
    geo.pegs.forEach((p, k) => {
      const gl = f.glow[k], c = r.color(p.row / (P.rows - 1));
      if (gl > 0.04) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10 + 26 * gl);
        g.addColorStop(0, rgba(c, 0.8 * gl)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 10 + 26 * gl, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = mix(c, '#ffffff', 0.55 + 0.45 * gl);
      ctx.beginPath(); ctx.arc(p.x, p.y, P.pegR, 0, TAU); ctx.fill();
    });
    f.balls.forEach((b, k) => {
      const col = b.landed && geo.answers ? r.ansColor(b.ans) : b.landed && b.red ? '#ff3b4a' : r.color(b.c);
      if (b.landed) {
        const x = CX + (b.slot - 6) * P.sp + (b.stack % 2 ? 15 : -15), y = P.floor - b.r - 2 - Math.floor(b.stack / 2) * (b.r * 2 + 1);
        r.ball({ x, y, r: b.r }, col);
      } else r.ball(b, col, r.trail(i, k, 6));
    });
  },

  corrida(r, f, i) {
    const layers = r.tl.geo.layers;
    layers.forEach((L, k) => r.layer(L, f.ang[k], r.color(layers.length > 1 ? k / (layers.length - 1) : 0.5), 5.5, 0.95));
    f.balls.forEach((b, k) => r.ball(b, r.color(b.c), r.trail(i, k, 6)));
  },
};

DRAW.pista = (r, f, i) => {
  const { ctx } = r, g = r.tl.geo, t = f.time, { X0, X1 } = TRACK;
  const top = f.cam - 120, bot = f.cam + H + 120;
  const vis = (a, b) => Math.max(a, b) > top && Math.min(a, b) < bot;
  const y0 = Math.max(top, 380), y1 = Math.min(bot, g.floorY);
  if (y1 > y0) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(X0, y0, X1 - X0, y1 - y0); }
  if (vis(g.finishY - 60, g.finishY + 30)) {
    const sq = 23;
    for (let x = X0, k = 0; x < X1; x += sq, k++) for (let row = 0; row < 2; row++) {
      ctx.fillStyle = (k + row) % 2 ? '#ffffff' : '#15121c';
      ctx.fillRect(x, g.finishY - sq + row * sq, Math.min(sq, X1 - x), sq);
    }
    ctx.font = `700 40px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText('🏁 FINISH 🏁', W / 2, g.finishY - 62);
  }
  for (const h of g.holes) {
    if (!vis(h.y1 - 40, h.y2)) continue;
    const x = (h.ax + h.bx) / 2, y = (h.ay + h.by) / 2 + 14, gr = ctx.createRadialGradient(x, y, 0, x, y, 70);
    gr.addColorStop(0, 'rgba(255,40,60,0.75)'); gr.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 70, 0, TAU); ctx.fill();
    ctx.font = `600 30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💀', x, y + 46);
  }
  for (const s of g.segs) {
    if (!vis(s.ay, s.by)) continue;
    if (s.kind === 'gate' && f.go) continue;
    ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by);
    r.glowPath(s.kind === 'gate' ? '#ffffff' : r.color(0.25 + 0.75 * clamp01((s.ay + s.by) / 2 / g.trackH)), 6, s.kind === 'gate' ? 0.9 : 1);
  }
  for (const c of g.circ) {
    if (!vis(c.y - 40, c.y + 40)) continue;
    const col = r.color(0.25 + 0.75 * clamp01(c.y / g.trackH));
    if (c.kind === 'pino') {
      ctx.fillStyle = mix(col, '#ffffff', 0.55); ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
    } else if (c.kind === 'bumper') {
      ctx.fillStyle = rgba(col, 0.18); ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
      r.glowPath(col, 5);
    } else {
      const pulse = 0.6 + 0.4 * Math.sin(t * 8 + c.x);
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = k * TAU / 8 + t;
        ctx.moveTo(c.x + Math.cos(a) * c.r * 0.6, c.y + Math.sin(a) * c.r * 0.6);
        ctx.lineTo(c.x + Math.cos(a) * c.r * 1.55, c.y + Math.sin(a) * c.r * 1.55);
      }
      r.glowPath('#ff3b4a', 4, pulse);
      ctx.fillStyle = '#ff3b4a'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd0d4'; ctx.beginPath(); ctx.arc(c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.3, 0, TAU); ctx.fill();
    }
  }
  for (const p of g.spin) {
    if (!vis(p.y - p.half, p.y + p.half)) continue;
    const [ax, ay, bx, by] = trackAt.spinEnds(p, t);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    r.glowPath(p.kill ? '#ff3b4a' : '#ffffff', 12, p.kill ? 0.75 + 0.25 * Math.sin(t * 9) : 0.9);
    ctx.fillStyle = p.kill ? '#ff3b4a' : '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.fill();
  }
  for (const p of g.saws) {
    if (!vis(p.y - 60, p.y + 60)) continue;
    ctx.beginPath(); ctx.moveTo(p.x0 - p.amp, p.y); ctx.lineTo(p.x0 + p.amp, p.y);
    ctx.strokeStyle = 'rgba(255,90,102,0.25)'; ctx.lineWidth = 4; ctx.stroke();
    const x = trackAt.sawX(p, t), rot = t * 9;
    const gr = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 2.4);
    gr.addColorStop(0, 'rgba(255,40,60,0.45)'); gr.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - p.r * 2.4, p.y - p.r * 2.4, p.r * 4.8, p.r * 4.8);
    ctx.beginPath();
    for (let k = 0; k < 24; k++) { const a = rot + k * TAU / 24, rr = k % 2 ? p.r * 0.78 : p.r * 1.18; ctx.lineTo(x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
    ctx.closePath();
    ctx.fillStyle = '#ff4a58'; ctx.fill();
    ctx.fillStyle = '#2a0b12'; ctx.beginPath(); ctx.arc(x, p.y, p.r * 0.3, 0, TAU); ctx.fill();
  }
  f.balls.forEach((b, k) => {
    if (!b.alive) return;
    r.ball(b, RACE[b.k].c, r.trail(i, k, 6));
    r.code(r.labels[b.k].short, b.x, b.y, b.r);
  });
};

DRAW.multiplica = (r, f) => {
  const { ctx } = r, { R } = MULTI;
  ctx.save(); ctx.translate(CX, CY);
  ctx.beginPath();
  if (f.gapW > 0) ctx.arc(0, 0, R, f.ang + f.gapW / 2, f.ang - f.gapW / 2 + TAU); else ctx.arc(0, 0, R, 0, TAU);
  r.glowPath(r.color(0.2), 7);
  if (f.gapW > 0) for (const sgn of [-1, 1]) {
    const a = f.ang + sgn * f.gapW / 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
    ctx.fillStyle = '#ff5a66'; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // milhares de bolinhas: agrupa por cor para desenhar com poucos comandos
  const pts = f.pts, n = pts.length / 3, B = 12, groups = Array.from({ length: B }, () => []);
  for (let j = 0; j < n; j++) groups[Math.min(B - 1, (pts[j * 3 + 2] * B) | 0)].push(j);
  const rr = MULTI.r;
  ctx.globalCompositeOperation = 'lighter';
  groups.forEach((list, g) => {
    if (!list.length) return;
    ctx.fillStyle = rgba(r.color((g + 0.5) / B), 0.22); ctx.beginPath();
    for (const j of list) { const x = pts[j * 3], y = pts[j * 3 + 1]; ctx.moveTo(x + rr * 2.2, y); ctx.arc(x, y, rr * 2.2, 0, TAU); }
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  groups.forEach((list, g) => {
    if (!list.length) return;
    ctx.fillStyle = mix(r.color((g + 0.5) / B), '#ffffff', 0.35); ctx.beginPath();
    for (const j of list) { const x = pts[j * 3], y = pts[j * 3 + 1]; ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU); }
    ctx.fill();
  });
};

DRAW.guerra = (r, f) => {
  const { ctx } = r, { N, cell, X, Y } = ARENA, size = N * cell, T = r.tl.geo.T;
  const fills = r.labels.slice(0, T).map(l => mix(l.color, '#0b0820', 0.35));
  const sx = new Array(T).fill(0), sy = new Array(T).fill(0), sn = new Array(T).fill(0);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = f.cells[j * N + i];
    ctx.fillStyle = fills[t]; ctx.fillRect(X + i * cell, Y + j * cell, cell + 0.6, cell + 0.6);
    sx[t] += i; sy[t] += j; sn[t]++;
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 1; k < N; k++) { ctx.moveTo(X + k * cell, Y); ctx.lineTo(X + k * cell, Y + size); ctx.moveTo(X, Y + k * cell); ctx.lineTo(X + size, Y + k * cell); }
  ctx.stroke();
  ctx.beginPath(); ctx.rect(X, Y, size, size); r.glowPath('#ffffff', 4, 0.8);
  // nome de cada time no meio do território dele
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let t = 0; t < T; t++) {
    if (sn[t] < 12) continue;
    const l = r.labels[t], txt = l.short || l.name;
    ctx.font = `700 ${txt.length > 6 ? 40 : 54}px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText(txt, X + (sx[t] / sn[t] + 0.5) * cell, Y + (sy[t] / sn[t] + 0.5) * cell);
  }
  for (const b of f.balls) {
    const col = r.labels[b.team].color;
    r.ball(b, '#ffffff');
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.stroke();
  }
  if (f.left <= 5 && f.left > 0) {
    const k = f.left % 1;
    r.text(String(Math.ceil(f.left)), X + size / 2, Y + size / 2, 300, { alpha: 0.25 + 0.35 * k, scale: 0.8 + 0.2 * k });
  }
};

const HUD = {
  labirinto(r, f) {
    const left = r.tl.geo.layers.length - f.cur;
    r.text(`${left} ${left === 1 ? 'layer left' : 'layers left'}`, W / 2, 1535, 50, { weight: 600 });
  },
  zona(r, f) { r.text(`Bounces: ${f.bounces}`, W / 2, 1535, 50, { weight: 600 }); },
  plinko(r, f) {
    const a = r.tl.geo.answers;
    if (a) r.text(a.map(([, e], i) => `${e} ${f.ans[i]}`).join('    '), W / 2, 1535, 54, { weight: 600 });
    else r.text(`✅ ${f.good}     💀 ${f.bad}`, W / 2, 1535, 56, { weight: 600 });
  },
  corrida(r, f) {
    const { ctx } = r, n = f.balls.length, total = r.tl.geo.layers.length, w = 220, x0 = W / 2 - ((n - 1) * w) / 2;
    f.balls.forEach((b, k) => {
      const x = x0 + k * w, y = 1530;
      r.ball({ x: x - 50, y, r: 18 }, RACE[k].c);
      ctx.font = `600 34px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(RACE[k].n, x - 22, y - 14);
      for (let d = 0; d < total; d++) {
        ctx.fillStyle = d < b.level ? RACE[k].c : 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(x - 14 + d * 22, y + 22, 7, 0, TAU); ctx.fill();
      }
    });
  },
};

HUD.pista = (r, f) => {
  const { ctx } = r, g = r.tl.geo, x = 40, y0 = 560, y1 = 1440;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  ctx.font = `600 30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText('🏁', x, y1 + 32);
  for (const b of f.balls) {
    if (!b.alive) continue;
    const p = clamp01((b.y - TRACK.gateY) / (g.finishY - TRACK.gateY));
    r.ball({ x, y: y0 + p * (y1 - y0), r: 11 }, RACE[b.k].c);
  }
  const order = ranking(f.balls), n = order.length, sp = Math.min(112, 900 / n);
  order.forEach((b, i) => {
    const cx = W / 2 + (i - (n - 1) / 2) * sp, cy = 1548;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (b.alive) {
      r.ball({ x: cx, y: cy, r: 20 }, RACE[b.k].c);
      ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(String(i + 1), cx, cy - 40);
      if (r.labels[b.k].short) { ctx.font = `700 21px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(r.labels[b.k].short, cx, cy + 38); }
    } else {
      ctx.globalAlpha = 0.45; r.ball({ x: cx, y: cy, r: 20 }, '#777777'); ctx.globalAlpha = 1;
      ctx.font = `700 30px ${FONT}`; ctx.fillStyle = '#ff5a66';
      ctx.fillText('✖', cx, cy + 1);
    }
  });
};

HUD.multiplica = (r, f) => {
  const { ctx } = r, target = r.tl.geo.target, p = clamp01(f.count / target), w = 760, x0 = (W - w) / 2, y = 1462;
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.roundRect(x0, y, w, 18, 9); ctx.fill();
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, r.color(0.1)); g.addColorStop(1, r.color(0.9));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x0, y, Math.max(18, w * p), 18, 9); ctx.fill();
  r.text(`${f.count.toLocaleString('en-US')} / ${target.toLocaleString('en-US')}`, W / 2, 1540, 64, { weight: 700 });
};

HUD.guerra = (r, f) => {
  const { ctx } = r, T = r.tl.geo.T, total = f.counts.reduce((a, b) => a + b, 0), w = 900, x0 = (W - w) / 2, y = 1512, h = 46;
  let x = x0;
  ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y, w, h, 23); ctx.clip();
  for (let t = 0; t < T; t++) {
    const ww = (f.counts[t] / total) * w;
    ctx.fillStyle = r.labels[t].color; ctx.fillRect(x, y, ww + 0.5, h);
    if (ww > 90) {
      ctx.font = `700 28px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#120d24';
      ctx.fillText(`${Math.round((f.counts[t] / total) * 100)}%`, x + ww / 2, y + h / 2 + 1);
    }
    x += ww;
  }
  ctx.restore();
  r.text(`⏱ ${Math.ceil(f.left)}s`, W - 150, 488, 40, { weight: 600, stroke: false });
};

const RESULT = {
  labirinto: () => ['ESCAPED! 🎉', '#ffd54a'],
  zona: tl => (tl.result.outcome === 'ruim' ? ['RED ZONE! 💀', '#ff5a66'] : ['ESCAPED! 🎉', '#ffd54a']),
  corrida: tl => { const w = RACE.find(x => x.k === tl.result.outcome); return [`${w.n.toUpperCase()} WINS! 🏆`, w.c]; },
  pista: (tl, r) => { const w = r.labels[RACE.findIndex(x => x.k === tl.result.outcome)]; return [`${w.name.toUpperCase()} WINS! 🏆`, w.color]; },
  plinko: tl => {
    if (tl.result.answer == null) return [`✅ ${tl.result.good}  ·  💀 ${tl.result.bad}`, tl.result.outcome === 'ultima_ruim' ? '#ff5a66' : '#ffd54a'];
    const [t, e] = tl.geo.answers[tl.result.answer];
    return [`${e} ${t.toUpperCase()}!`, '#ffd54a'];
  },
  multiplica: tl => (tl.result.outcome === 'chegou'
    ? [`${tl.geo.target.toLocaleString('en-US')} BALLS! 🤯`, '#ffd54a']
    : [`ALL GONE! 💀 max ${tl.result.peak}`, '#ff5a66']),
  guerra: (tl, r) => { const w = r.labels[tl.result.counts.indexOf(Math.max(...tl.result.counts))]; return [`${w.name.toUpperCase()} WINS! 🏆`, w.color]; },
};
