import { SIMS, DURATIONS, FPS, W, H, runSim, findSeed, defaultsOf, fmtTime } from './sims.js';
import { Renderer, PALETTES, BACKGROUNDS } from './render.js';
import { MELODIES, Player, renderAudio } from './audio.js';
import { exportMp4 } from './exporter.js';

const $ = s => document.querySelector(s);
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DEFAULT_DUR = { labirinto: 'medio', zona: 'curto', plinko: 'curto', corrida: 'curto', pista: 'curto' };
const BASE_TAGS = '#satisfying #oddlysatisfying #asmr #relaxing #physics #simulation #fyp #viral';

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const randSeed = () => (Math.random() * 1e6) | 0;
const pick = (arr, not) => { const a = arr.filter(x => x !== not); return a[(Math.random() * a.length) | 0] ?? arr[0]; };

const today = new Date();
const state = {
  data: { days: {} },
  date: iso(today),
  week: mondayOf(today),
  cfg: null,
  tl: null,
  fundos: [],
  playing: false,
  frame: 0,
  muted: false,
  busy: false,
};
const renderer = new Renderer($('#preview'));
const player = new Player();

function newCfg(sim = 'labirinto') {
  const d = SIMS[sim];
  const cfg = {
    sim, opts: defaultsOf(d), outcome: 'any', dur: DEFAULT_DUR[sim], music: 'estrelinha', bg: 'noite',
    palette: 'neon', handle: state.cfg?.handle || '', hook: d.hooks[0], cta: d.ctas[0], caption: '', seed: randSeed(),
  };
  cfg.caption = suggestCaption(cfg);
  return cfg;
}

function suggestCaption(c) {
  const m = MELODIES[c.music];
  return `${c.hook}\n\n🎵 ${m.name}${m.gen ? '' : ' — ' + m.credit}\n\n${BASE_TAGS} ${SIMS[c.sim].tags}`;
}

const style = () => ({ bg: state.cfg.bg, palette: state.cfg.palette, hook: state.cfg.hook, cta: state.cfg.cta, handle: state.cfg.handle });

// ---------- semana ----------
function renderWeek() {
  const end = addDays(state.week, 6);
  $('#weekLabel').textContent = `${state.week.getDate()}/${state.week.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`;
  const box = $('#days'); box.innerHTML = '';
  for (let k = 0; k < 7; k++) {
    const d = addDays(state.week, k), key = iso(d), saved = state.data.days[key];
    const el = document.createElement('button');
    el.className = 'day' + (key === state.date ? ' sel' : '');
    el.innerHTML = `<div class="d"><span>${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</span>${key === iso(today) ? '<span class="today">hoje</span>' : ''}</div>
      <div class="t ${saved ? '' : 'empty'}"></div>${saved?.exported ? '<div class="done">✓ MP4 exportado</div>' : ''}`;
    el.querySelector('.t').textContent = saved ? `${SIMS[saved.sim].icon} ${saved.hook}` : 'Sem vídeo ainda';
    el.onclick = () => selectDay(key);
    box.appendChild(el);
  }
}

function selectDay(key) {
  stop();
  state.date = key;
  const saved = state.data.days[key];
  state.cfg = saved ? structuredClone(saved) : newCfg(state.cfg?.sim);
  renderWeek(); fillForm(); rebuild();
}

// ---------- formulário ----------
function options(sel, entries, value) {
  sel.innerHTML = entries.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  sel.value = value;
}

function fillForm() {
  const c = state.cfg, d = SIMS[c.sim];
  $('#simCards').innerHTML = Object.entries(SIMS).map(([k, s]) =>
    `<button class="card ${k === c.sim ? 'sel' : ''}" data-sim="${k}"><span class="i">${s.icon}</span><span class="n">${s.name}</span></button>`).join('');
  $('#simDesc').textContent = d.desc;
  const box = $('#simOpts'); box.innerHTML = '';
  for (const p of d.params) {
    const f = document.createElement('div'); f.className = 'field';
    const val = c.opts[p.k] ?? p.def;
    if (p.type === 'range') {
      f.innerHTML = `<label>${p.l} <span class="v">${val}</span></label><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">`;
      const inp = f.querySelector('input'), v = f.querySelector('.v');
      inp.oninput = () => { v.textContent = inp.value; c.opts[p.k] = Number(inp.value); rebuildSoon(); };
    } else {
      f.innerHTML = `<label>${p.l}</label><select></select>`;
      const sel = f.querySelector('select');
      options(sel, p.opts, val);
      sel.onchange = () => { c.opts[p.k] = sel.value; rebuildSoon(); };
    }
    box.appendChild(f);
  }
  options($('#outcome'), d.outcomes, c.outcome);
  options($('#dur'), Object.entries(DURATIONS).map(([k, v]) => [k, v.name]), c.dur);
  options($('#music'), Object.entries(MELODIES).map(([k, m]) => [k, m.gen ? m.name : `${m.name} · ${m.credit}`]), c.music);
  options($('#bg'), [...Object.entries(BACKGROUNDS).map(([k, b]) => [k, b.name]), ...state.fundos.map(f => ['img:' + f, '🖼 ' + f])], c.bg);
  options($('#palette'), Object.entries(PALETTES).map(([k, p]) => [k, p.name]), c.palette);
  $('#seed').value = c.seed;
  $('#hook').value = c.hook; $('#cta').value = c.cta; $('#caption').value = c.caption; $('#handle').value = c.handle;
}

function bindForm() {
  $('#simCards').onclick = e => {
    const b = e.target.closest('[data-sim]');
    if (!b || b.dataset.sim === state.cfg.sim) return;
    stop();
    const keep = { music: state.cfg.music, bg: state.cfg.bg, palette: state.cfg.palette };
    state.cfg = { ...newCfg(b.dataset.sim), ...keep };
    state.cfg.caption = suggestCaption(state.cfg);
    fillForm(); rebuild();
  };
  const bind = (id, key, live) => {
    const el = $(id);
    el.addEventListener(live ? 'input' : 'change', () => {
      state.cfg[key] = el.type === 'number' ? Number(el.value) : el.value;
      if (key === 'seed' || key === 'music' || key === 'bg' || key === 'palette') rebuildSoon();
      else drawStill();
    });
  };
  bind('#outcome', 'outcome'); bind('#dur', 'dur'); bind('#seed', 'seed');
  bind('#music', 'music'); bind('#bg', 'bg'); bind('#palette', 'palette');
  bind('#hook', 'hook', true); bind('#cta', 'cta', true); bind('#handle', 'handle', true); bind('#caption', 'caption', true);
  $('#music').addEventListener('change', () => { state.cfg.caption = suggestCaption(state.cfg); $('#caption').value = state.cfg.caption; });
  $('#rollHook').onclick = () => { state.cfg.hook = pick(SIMS[state.cfg.sim].hooks, state.cfg.hook); $('#hook').value = state.cfg.hook; drawStill(); };
  $('#rollCta').onclick = () => { state.cfg.cta = pick(SIMS[state.cfg.sim].ctas, state.cfg.cta); $('#cta').value = state.cfg.cta; drawStill(); };
  $('#suggestCaption').onclick = () => { state.cfg.caption = suggestCaption(state.cfg); $('#caption').value = state.cfg.caption; };
  $('#rollSeed').onclick = () => { state.cfg.seed = randSeed(); $('#seed').value = state.cfg.seed; rebuild(); };
  $('#findSeed').onclick = searchSeed;
  $('#save').onclick = () => save('Dia salvo.');
  $('#copyCaption').onclick = async () => { await navigator.clipboard.writeText(state.cfg.caption); status('Legenda copiada.'); };
  $('#export').onclick = doExport;
  $('#prevWeek').onclick = () => { state.week = addDays(state.week, -7); renderWeek(); };
  $('#nextWeek').onclick = () => { state.week = addDays(state.week, 7); renderWeek(); };
  $('#play').onclick = $('#bigPlay').onclick = () => (state.playing ? stop() : play());
  $('#mute').onclick = () => { state.muted = !state.muted; $('#mute').textContent = state.muted ? '🔇' : '🔊'; player.setMuted(state.muted); };
  $('#safeBtn').onclick = () => { $('#safe').hidden = !$('#safe').hidden; };
  $('#scrub').oninput = e => { const was = state.playing; stop(); state.frame = Number(e.target.value); drawStill(); if (was) play(); };
  document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); $('#play').click(); } });
}

// ---------- simulação e prévia ----------
let rebuildTimer = 0;
function rebuildSoon() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(rebuild, 180); }

async function rebuild() {
  stop();
  const c = state.cfg;
  state.tl = runSim(c.sim, c.opts, c.seed);
  await renderer.setup(state.tl, style());
  const n = state.tl.frames.length;
  $('#scrub').max = n - 1;
  state.frame = Math.min(Math.round(FPS * 1.2), n - 1);
  updateStats();
  drawStill();
}

function drawStill() {
  if (!state.tl) return;
  renderer.st = style();
  renderer.draw(state.frame);
  $('#scrub').value = state.frame;
  $('#clock').textContent = fmtTime(state.frame / FPS);
}

function outcomeLabel(tl) {
  const o = SIMS[tl.id].outcomes.find(([k]) => k === tl.result.outcome);
  if (tl.id === 'plinko') return `${tl.result.good} salvas · ${tl.result.bad} na vermelha${o ? ' · ' + o[1].toLowerCase() : ''}`;
  if (tl.id === 'labirinto') return 'escapou';
  if (tl.id === 'pista') return `${o ? o[1].toLowerCase() : tl.result.outcome} · ${tl.result.elim} de ${tl.result.n} eliminadas`;
  return o ? o[1].toLowerCase() : tl.result.outcome;
}

function updateStats() {
  const tl = state.tl, c = state.cfg, [lo, hi] = DURATIONS[c.dur].range;
  if (tl.timeout) { $('#stats').innerHTML = `<span class="warn">⚠ Não terminou em ${fmtTime(tl.duration)}. Use 🎯 Buscar final ou outra seed.</span>`; return; }
  const okDur = tl.duration >= lo && tl.duration <= hi;
  $('#stats').innerHTML = `Clímax em <b>${fmtTime(tl.climax)}</b> · vídeo com <b>${fmtTime(tl.duration)}</b> · desfecho: <b>${outcomeLabel(tl)}</b>` +
    (okDur ? '' : ` <span class="warn">(fora da duração escolhida)</span>`);
}

function play() {
  if (!state.tl || state.playing) return;
  if (state.frame >= state.tl.frames.length - 1) state.frame = 0;
  state.playing = true;
  $('#play').textContent = '❚❚'; $('#bigPlay').classList.add('hide');
  player.start(state.tl, state.cfg.music, state.frame / FPS, state.muted);
  const loop = () => {
    if (!state.playing) return;
    const f = Math.floor(player.now() * FPS);
    if (f >= state.tl.frames.length) { stop(); state.frame = state.tl.frames.length - 1; drawStill(); return; }
    state.frame = f; drawStill();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function stop() {
  if (!state.playing) return;
  state.playing = false;
  player.stop();
  $('#play').textContent = '▶'; $('#bigPlay').classList.remove('hide');
}

// ---------- ações ----------
function status(msg, html = false) { html ? ($('#status').innerHTML = msg) : ($('#status').textContent = msg); }
function setBusy(b) { state.busy = b; for (const id of ['#export', '#findSeed', '#rollSeed', '#save']) $(id).disabled = b; }

async function searchSeed() {
  stop(); setBusy(true);
  const c = state.cfg;
  const seed = await findSeed(c.sim, c.opts, c.outcome, DURATIONS[c.dur].range, n => status(`Testando seeds… ${n}`));
  setBusy(false);
  if (seed === null) { status('Não achei nenhuma seed com esse final e essa duração. Tente outra duração ou ajuste as opções.'); return; }
  c.seed = seed; $('#seed').value = seed;
  await rebuild();
  status(`Seed ${seed} encontrada.`);
}

async function save(msg) {
  state.data.days[state.date] = structuredClone(state.cfg);
  const r = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state.data) }).catch(() => null);
  renderWeek();
  if (msg) status(r?.ok ? msg : 'Não consegui salvar (o servidor está rodando?).');
}

async function doExport() {
  if (state.busy || !state.tl) return;
  stop(); setBusy(true);
  const bar = $('#bar'); $('#progress').hidden = false; bar.style.width = '0%';
  try {
    const tl = state.tl, c = state.cfg;
    status('Gerando a trilha…');
    const audio = await renderAudio(tl, c.music);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const r = new Renderer(cv); await r.setup(tl, style());
    const t0 = performance.now();
    const { blob, hasAudio } = await exportMp4(cv, r, tl.frames.length, audio, p => {
      bar.style.width = `${(p * 100).toFixed(0)}%`; status(`Renderizando quadros… ${(p * 100).toFixed(0)}%`);
    });
    const name = `${state.date}-${c.sim}-${c.seed}.mp4`;
    const url = URL.createObjectURL(blob);
    let where = '';
    const res = await fetch(`/api/export?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob }).catch(() => null);
    if (res?.ok) where = `Salvo em <b>${(await res.json()).path}</b><br>`;
    c.exported = name;
    await save();
    const secs = ((performance.now() - t0) / 1000).toFixed(0);
    status(`${where}<a href="${url}" download="${name}">Baixar ${name}</a> · ${(blob.size / 1e6).toFixed(1)} MB · ${secs}s` +
      (hasAudio ? '' : ' · <span style="color:var(--danger)">sem som: este navegador não codifica AAC</span>'), true);
  } catch (e) {
    console.error(e); status('Erro ao exportar: ' + e.message);
  } finally {
    setBusy(false); $('#progress').hidden = true;
  }
}

// ---------- início ----------
async function init() {
  const [data, fundos] = await Promise.all([
    fetch('/api/data').then(r => r.json()).catch(() => ({ days: {} })),
    fetch('/api/fundos').then(r => r.json()).catch(() => []),
  ]);
  state.data = data; state.fundos = fundos;
  state.cfg = state.data.days[state.date] ? structuredClone(state.data.days[state.date]) : newCfg();
  bindForm(); renderWeek(); fillForm();
  await rebuild();
}
init();
