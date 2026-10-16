// Desenho dos formatos do sims2.js (registrado no Renderer por registerDraw).
import { WB } from './data/wb.js';
import { RPS_SETS, FLAGS, DOMINO } from './sims2.js';

const TAU = Math.PI * 2;
const EMOJI_FONT = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

// Emoji desenhado uma vez numa telinha (desenhar centenas por quadro fica rápido).
export function emojiSprite(e, size) {
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * 1.25);
  const x = c.getContext('2d');
  x.font = `${size}px ${EMOJI_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(e, c.width / 2, c.height / 2 + size * 0.06);
  return c;
}

function drawFlag(ctx, f, x, y, w, h) {
  const c = f.c;
  const hs = (cols, ratios = cols.map(() => 1)) => { const tot = ratios.reduce((a, b) => a + b, 0); let yy = y; cols.forEach((col, i) => { const hh = (h * ratios[i]) / tot; ctx.fillStyle = col; ctx.fillRect(x, yy, w, hh + 0.5); yy += hh; }); };
  const vs = cols => cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(x + (w * i) / cols.length, y, w / cols.length + 0.5, h); });
  if (f.k === 'v3') vs(c);
  else if (f.k === 'h3') hs(c);
  else if (f.k === 'h2') hs(c);
  else if (f.k === 'colombia') hs(c, [2, 1, 1]);
  else if (f.k === 'thai') hs([c[0], c[1], c[2], c[1], c[0]], [1, 1, 2, 1, 1]);
  else if (f.k === 'disc') {
    ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(x + w * (f.off ?? 0.5), y + h / 2, h * 0.3, 0, TAU); ctx.fill();
  } else if (f.k === 'swiss') {
    ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
    const u = w / 32; ctx.fillStyle = c[1];
    ctx.fillRect(x + 13 * u, y + 6 * u, 6 * u, 20 * u); ctx.fillRect(x + 6 * u, y + 13 * u, 20 * u, 6 * u);
  } else if (f.k === 'nordic') {
    ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, h);
    if (c[2]) { // cruz com borda (Noruega, Islândia): 6:1:2:1:12 × 6:1:2:1:6
      const ux = w / 22, uy = h / 16;
      ctx.fillStyle = c[1]; ctx.fillRect(x + 6 * ux, y, 4 * ux, h); ctx.fillRect(x, y + 6 * uy, w, 4 * uy);
      ctx.fillStyle = c[2]; ctx.fillRect(x + 7 * ux, y, 2 * ux, h); ctx.fillRect(x, y + 7 * uy, w, 2 * uy);
    } else { // 5:2:9 × 4:2:4
      const ux = w / 16, uy = h / 10;
      ctx.fillStyle = c[1]; ctx.fillRect(x + 5 * ux, y, 2 * ux, h); ctx.fillRect(x, y + 4 * uy, w, 2 * uy);
    }
  }
}

const fmtBig = (v, money) => {
  const a = Math.abs(v), p = money ? '$' : '';
  if (a >= 1e12) return `${p}${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${p}${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${p}${(v / 1e6).toFixed(1)}M`;
  return `${p}${Math.round(v).toLocaleString('en-US')}`;
};

export function registerDraw(K) {
  const { DRAW, HUD, RESULT, SETUP, OVERLAY, mix, rgba, clamp01, FONT, CX, THEMES, PLINKO } = K;

  // ---------- pedra, papel e tesoura ----------
  SETUP.rps = r => { r.sprites = RPS_SETS[r.tl.geo.set].items.map(([e]) => emojiSprite(e, 46)); };
  DRAW.rps = (r, f) => {
    const { ctx } = r;
    ctx.beginPath(); ctx.rect(60, 520, 960, 960); r.glowPath('#ffffff', 4, 0.6);
    const p = f.pts, n = p.length / 4;
    for (let i = 0; i < n; i++) {
      const sp = r.sprites[p[i * 4 + 2]], age = p[i * 4 + 3], k = age < 0.3 ? 1 + 0.6 * (1 - age / 0.3) : 1, s = sp.width * k;
      ctx.drawImage(sp, p[i * 4] - s / 2, p[i * 4 + 1] - s / 2, s, s);
    }
  };
  HUD.rps = (r, f) => {
    const items = RPS_SETS[r.tl.geo.set].items;
    r.text(items.map(([e], i) => `${e} ${f.counts[i]}`).join('     '), 540, 1540, 60, { weight: 700 });
  };
  RESULT.rps = tl => { const [e, n] = RPS_SETS[tl.geo.set].items[tl.result.winner]; return [`${e} ${n.toUpperCase()} WINS! 🏆`, '#ffd54a']; };

  // ---------- corrida de ordenação ----------
  DRAW.ordenacao = (r, f) => {
    const { ctx } = r, g = r.tl.geo, n = g.n, H0 = 300, W0 = 940, x0 = 70;
    f.lanes.forEach((L, li) => {
      const y0 = 525 + li * 315, by = y0 + 62, bh = 222, bw = W0 / n;
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(x0 - 16, y0, W0 + 32, H0, 18); ctx.fill();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `700 36px ${FONT}`; ctx.fillStyle = '#ffffff';
      ctx.fillText(g.lanes[li].name, x0, y0 + 32);
      ctx.textAlign = 'right'; ctx.font = `600 28px ${FONT}`; ctx.fillStyle = L.place ? '#5ff59a' : 'rgba(255,255,255,0.65)';
      ctx.fillText(L.place ? ['', '🥇 1st', '🥈 2nd', '🥉 3rd'][L.place] : `${L.ops.toLocaleString('en-US')} ops`, x0 + W0, y0 + 32);
      for (let i = 0; i < n; i++) {
        const v = L.arr[i], h = (v / n) * bh;
        let col = r.color(v / n);
        if (L.place && i < L.sweep) col = '#5ff59a';
        else if (i === L.hi[0] || i === L.hi[1]) col = L.kind === 'c' ? '#ffffff' : '#ff5a66';
        ctx.fillStyle = col; ctx.fillRect(x0 + i * bw + 0.5, by + bh - h, Math.max(1, bw - 1.5), h);
      }
    });
  };
  HUD.ordenacao = () => {};
  RESULT.ordenacao = tl => { const w = tl.geo.lanes.find(l => l.k === tl.result.outcome); return [`${w.name.toUpperCase()} WINS! 🏆`, '#ffd54a']; };

  // ---------- ache o diferente ----------
  SETUP.diferente = r => { r.oddSprites = r.tl.geo.levels.map(L => [emojiSprite(L.a, 96), emojiSprite(L.b, 96)]); };
  const oddPhase = (g, t) => {
    const per = g.T + g.R, tt = Math.max(0, t - g.start), lv = Math.min(g.levels.length - 1, Math.floor(tt / per));
    const tp = Math.floor(tt / per) > lv ? per : tt - lv * per;
    return { lv, tp, search: tp < g.T };
  };
  DRAW.diferente = (r, f) => {
    const { ctx } = r, g = r.tl.geo, { lv, tp, search } = oddPhase(g, f.t), L = g.levels[lv], [sa, sb] = r.oddSprites[lv];
    const cell = Math.min(940 / L.cols, 880 / L.rows), gw = cell * L.cols, gh = cell * L.rows, x0 = 540 - gw / 2, y0 = 1000 - gh / 2;
    const size = cell * 0.82;
    for (let j = 0; j < L.rows; j++) for (let i = 0; i < L.cols; i++) {
      const idx = j * L.cols + i, odd = idx === L.odd;
      ctx.globalAlpha = !search && !odd ? 0.22 : 1;
      ctx.drawImage(odd ? sb : sa, x0 + i * cell + (cell - size) / 2, y0 + j * cell + (cell - size) / 2, size, size);
    }
    ctx.globalAlpha = 1;
    if (!search) {
      const i = L.odd % L.cols, j = Math.floor(L.odd / L.cols), cx = x0 + (i + 0.5) * cell, cy = y0 + (j + 0.5) * cell;
      const k = clamp01((tp - g.T) / 0.3);
      ctx.beginPath(); ctx.arc(cx, cy, cell * (0.9 - 0.25 * k), 0, TAU); r.glowPath('#ffd54a', 7, k);
    }
  };
  HUD.diferente = (r, f) => {
    const g = r.tl.geo, { lv, tp, search } = oddPhase(g, f.t);
    r.text(search ? `LEVEL ${lv + 1}/${g.levels.length}  ·  ⏱ ${Math.max(1, Math.ceil(g.T - tp))}` : `LEVEL ${lv + 1}  ·  FOUND IT? ✅`, 540, 1540, 54, { weight: 700, color: search ? '#ffffff' : '#ffd54a' });
  };
  RESULT.diferente = tl => [`DID YOU FIND ALL ${tl.geo.levels.length}? 👀`, '#ffd54a'];

  // ---------- corrida de barras ----------
  SETUP.barras = r => {
    const D = WB[r.tl.geo.key];
    r.wb = D;
    const names = Object.keys(D.series);
    r.wbColor = Object.fromEntries(names.map((n, i) => [n, r.color(((i * 0.618) % 1))]));
    r.wbRank = idx => {
      const list = names.filter(n => D.series[n][idx] != null).sort((a, b) => D.series[b][idx] - D.series[a][idx]);
      return Object.fromEntries(list.map((n, i) => [n, i]));
    };
    r.wbRanks = D.years.map((_, i) => r.wbRank(i));
  };
  DRAW.barras = (r, f) => {
    const { ctx } = r, D = r.wb, last = D.years.length - 1, i = Math.min(last, Math.floor(f.yf)), fr = Math.min(1, f.yf - i), j = Math.min(last, i + 1);
    const e = fr < 0.5 ? 2 * fr * fr : 1 - Math.pow(-2 * fr + 2, 2) / 2, money = r.tl.geo.key === 'pib';
    const rows = [];
    for (const [name, arr] of Object.entries(D.series)) {
      const a = arr[i], b = arr[j] ?? a;
      if (a == null && b == null) continue;
      const v = (a ?? 0) + ((b ?? a ?? 0) - (a ?? 0)) * fr;
      const ra = r.wbRanks[i][name] ?? 20, rb = r.wbRanks[j][name] ?? 20, pos = ra + (rb - ra) * e;
      if (pos < 10.5) rows.push({ name, v, pos });
    }
    const max = Math.max(...rows.map(x => x.v), 1), x0 = 70, maxW = 720, top = 560, step = 84;
    for (const x of rows) {
      const y = top + x.pos * step, w = Math.max(6, (x.v / max) * maxW), a = clamp01(10.5 - x.pos);
      ctx.globalAlpha = a;
      ctx.fillStyle = r.wbColor[x.name]; ctx.beginPath(); ctx.roundRect(x0, y, w, 64, 12); ctx.fill();
      ctx.textBaseline = 'middle'; ctx.font = `700 30px ${FONT}`;
      const tw = ctx.measureText(x.name).width;
      if (tw + 30 < w) { ctx.textAlign = 'left'; ctx.fillStyle = '#120d24'; ctx.fillText(x.name, x0 + 16, y + 33); }
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = `600 28px ${FONT}`;
      ctx.fillText(tw + 30 < w ? fmtBig(x.v, money) : `${x.name} · ${fmtBig(x.v, money)}`, x0 + w + 14, y + 33);
    }
    ctx.globalAlpha = 1;
    r.text(String(D.years[Math.min(last, Math.round(f.yf))]), 900, 1390, 130, { weight: 700, alpha: 0.35, stroke: false });
    ctx.font = `500 24px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`${D.label} · Source: ${D.source}`, 540, 1475);
  };
  HUD.barras = () => {};
  RESULT.barras = tl => [`🥇 ${tl.result.leader.toUpperCase()} · ${tl.result.year}`, '#ffd54a'];

  // ---------- quiz de bandeiras ----------
  const flagPhase = (g, t) => {
    const per = g.T + g.R, tt = Math.max(0, t - g.start), q = Math.min(g.flags.length - 1, Math.floor(tt / per));
    const tp = Math.floor(tt / per) > q ? per : tt - q * per;
    return { q, tp, ask: tp < g.T };
  };
  DRAW.bandeiras = (r, f) => {
    const { ctx } = r, g = r.tl.geo, { q, tp, ask } = flagPhase(g, f.t), fl = g.flags[q];
    const w = fl.k === 'swiss' ? 560 : 840, h = 560, x = 540 - w / 2, y = 960 - h / 2, pop = clamp01((tp) / 0.25);
    ctx.save();
    ctx.translate(540, 960); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.translate(-540, -960);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fillStyle = '#000'; ctx.fill();
    ctx.shadowBlur = 0; ctx.clip();
    drawFlag(ctx, fl, x, y, w, h);
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
    // bolinhas de progresso
    g.flags.forEach((_, k) => { ctx.fillStyle = k < q || (k === q && !ask) ? '#5ff59a' : k === q ? '#ffffff' : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(540 + (k - (g.flags.length - 1) / 2) * 44, 560, 12, 0, TAU); ctx.fill(); });
    if (ask) {
      const left = g.T - tp, k = left - Math.floor(left);
      ctx.beginPath(); ctx.arc(540, 1350, 70, -Math.PI / 2, -Math.PI / 2 + TAU * (left / g.T)); r.glowPath('#ffd54a', 10);
      r.text(String(Math.ceil(left)), 540, 1352, 84, { scale: 1 + 0.15 * k });
    } else {
      const k = clamp01((tp - g.T) / 0.25);
      r.text(`✅ ${fl.n.toUpperCase()}`, 540, 1350, 84, { color: '#5ff59a', scale: 0.6 + 0.4 * k, alpha: k });
    }
  };
  HUD.bandeiras = (r, f) => { const g = r.tl.geo, { q } = flagPhase(g, f.t); r.text(`FLAG ${q + 1}/${g.flags.length}`, 540, 1540, 54, { weight: 700 }); };
  RESULT.bandeiras = tl => [`YOUR SCORE? ${tl.geo.flags.length} FLAGS 👇`, '#ffd54a'];

  // ---------- dominó ----------
  DRAW.domino = (r, f) => {
    const { ctx } = r, D = r.tl.geo.dom, n = D.length, { Hd, w, th } = DOMINO;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3; ctx.beginPath();
    D.forEach((d, i) => (i ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y))); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const d = D[i], a = f.th[i], big = i === n - 1 ? 1.7 : 1, len = (th + (Hd - th) * Math.sin(a)) * big, ww = w * big;
      const col = i === n - 1 ? '#ffd54a' : r.color(i / (n - 1));
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.dir);
      ctx.fillStyle = a > 0.05 ? mix(col, '#ffffff', 0.15 + 0.35 * Math.sin(a)) : col;
      ctx.beginPath(); ctx.roundRect(-th / 2, -ww / 2, len, ww, 3); ctx.fill();
      if (a > 1.2) { ctx.fillStyle = 'rgba(18,13,36,0.55)'; ctx.fillRect(-th / 2 + len / 2 - 1.5, -ww / 2 + 3, 3, ww - 6); }
      ctx.restore();
    }
  };
  HUD.domino = (r, f) => r.text(`Fallen: ${f.fallen} / ${r.tl.geo.dom.length}`, 540, 1540, 58, { weight: 700 });
  RESULT.domino = tl => (tl.result.outcome === 'completo'
    ? [`ALL ${tl.result.total} FELL! 🎉`, '#ffd54a']
    : [`STOPPED AT ${tl.result.fallen}/${tl.result.total} 😱`, '#ff5a66']);

  // ---------- pixel art ----------
  SETUP.pixel = r => {
    const G = 32, c = document.createElement('canvas'); c.width = c.height = G;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = `28px ${EMOJI_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(r.tl.geo.emoji, G / 2, G / 2 + 2);
    const d = x.getImageData(0, 0, G, G).data, groups = new Map();
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const o = (j * G + i) * 4;
      if (d[o + 3] < 110) continue;
      const a = d[o + 3] / 255, rr = Math.round(d[o] / a), gg = Math.round(d[o + 1] / a), bb = Math.round(d[o + 2] / a);
      const key = `${rr >> 5},${gg >> 5},${bb >> 5}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ i, j, col: `rgb(${Math.min(255, rr)},${Math.min(255, gg)},${Math.min(255, bb)})` });
    }
    // detalhes (grupos pequenos) primeiro: fica difícil adivinhar no começo
    r.px = { G, cells: [...groups.values()].sort((a, b) => a.length - b.length).flat() };
  };
  DRAW.pixel = (r, f) => {
    const { ctx } = r, { G, cells } = r.px, cs = 26, x0 = 540 - (G * cs) / 2, y0 = 1000 - (G * cs) / 2;
    const k = Math.floor(f.p * cells.length), recent = Math.max(1, Math.floor(cells.length * 0.04));
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (const c of cells) ctx.fillRect(x0 + c.i * cs + 1, y0 + c.j * cs + 1, cs - 2, cs - 2);
    for (let n = 0; n < k; n++) {
      const c = cells[n], pop = n > k - recent ? 1 + 0.35 * ((n - (k - recent)) / recent) : 1, s = cs * pop;
      ctx.fillStyle = c.col; ctx.fillRect(x0 + c.i * cs + (cs - s) / 2 + 0.5, y0 + c.j * cs + (cs - s) / 2 + 0.5, s - 1, s - 1);
    }
  };
  HUD.pixel = (r, f) => r.text(`${Math.round(f.p * 100)}% painted`, 540, 1540, 56, { weight: 700 });
  RESULT.pixel = tl => [`${tl.geo.emoji} ${tl.geo.name.toUpperCase()}!`, '#ffd54a'];

  // ---------- plinko "sorte dos signos": siglas nas bolinhas e tabela no fim ----------
  const drawPlinko = DRAW.plinko;
  DRAW.plinko = (r, f, i) => {
    drawPlinko(r, f, i);
    if (!r.tl.geo.signs) return;
    const P = PLINKO, S = THEMES.signos.short;
    for (const b of f.balls) {
      if (b.landed) {
        const x = CX + (b.slot - 6) * P.sp + (b.stack % 2 ? 15 : -15), y = P.floor - b.r - 2 - Math.floor(b.stack / 2) * (b.r * 2 + 1);
        r.code(S[b.k], x, y, b.r);
      } else r.code(S[b.k], b.x, b.y, b.r);
    }
  };
  const resPlinko = RESULT.plinko;
  RESULT.plinko = (tl, r) => (tl.geo.signs ? ['FIND YOUR SIGN 👆', '#ffd54a'] : resPlinko(tl, r));
  OVERLAY.plinko = (r, t) => {
    const { ctx, tl } = r, start = tl.climax + 0.6;
    if (!tl.geo.signs || tl.timeout || t < start) return;
    const a = clamp01((t - start) / 0.35), names = THEMES.signos.names, ans = tl.geo.answers, top = 560, rowH = 62;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(10,7,22,0.9)';
    ctx.beginPath(); ctx.roundRect(70, top, 940, 120 + 12 * rowH, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,213,74,0.5)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    r.text('TODAY’S LUCK', 540, top + 58, 46, { alpha: a, color: '#ffd54a' });
    tl.result.table.forEach((x, k) => {
      const ra = clamp01((t - start - 0.2 - k * 0.06) / 0.3);
      if (ra <= 0) return;
      const y = top + 120 + k * rowH + rowH / 2, [label, emo] = ans[x];
      ctx.save(); ctx.globalAlpha = ra; ctx.textBaseline = 'middle';
      r.ball({ x: 150, y, r: 17 }, r.color(k / 11));
      ctx.font = `700 31px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.fillText(names[k], 190, y);
      ctx.textAlign = 'right'; ctx.fillStyle = r.ansColor(x); ctx.fillText(`${emo} ${label}`, 960, y);
      ctx.restore();
    });
  };
}
