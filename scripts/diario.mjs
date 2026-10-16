// Gera o vídeo do dia sem interface: sobe o servidor, abre o Quica num Chrome invisível,
// escolhe a simulação/música/cores pela data, exporta o MP4 e escreve a legenda.
//
// Uso:  node scripts/diario.mjs [--data AAAA-MM-DD] [--formato liga|multiplica|decisao|guerra|classico|<simulação>] [--saida out]
// A liga dos signos fica em liga.json (o workflow salva a tabela no repositório depois de cada corrida).
// Variáveis: CHROME_PATH (caminho do Chrome), FFMPEG (caminho do ffmpeg, só se o Chrome não codificar AAC)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SIMS, THEMES, DECISIONS, mulberry32, textsFor } from '../public/sims.js';
import { MELODIES } from '../public/audio.js';
import { PALETTES, BACKGROUNDS } from '../public/render.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, def) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : def; };
const today = new Date().toISOString().slice(0, 10);
const date = arg('data', today);
const outDir = path.resolve(ROOT, arg('saida', 'out'));
const PORT = 5190 + ((Math.random() * 9) | 0);

// ---------- o que entra no vídeo de hoje (mesma data = mesmas escolhas) ----------
// Domingo e quarta: Zodiac League. Nos outros 5 dias, os demais formatos em sequência (um por dia, sem repetir até dar a volta).
const OUTROS = ['rps', 'multiplica', 'decisao', 'sorte', 'guerra', 'ordenacao', 'diferente', 'bandeiras', 'domino', 'pixel', 'barras', 'classico'];
const SLOT = { 1: 0, 2: 1, 4: 2, 5: 3, 6: 4 }; // seg, ter, qui, sex, sáb
const day = Math.floor(Date.parse(date + 'T00:00:00Z') / 864e5);
const week = Math.floor((day + 4) / 7); // semanas começando no domingo
const rng = mulberry32(day * 7919);
const pick = arr => arr[(rng() * arr.length) | 0];
const wd = new Date(date + 'T00:00:00Z').getUTCDay();
const formato = arg('formato', arg('sim', wd === 0 || wd === 3 ? 'liga' : OUTROS[(week * 5 + SLOT[wd]) % OUTROS.length]));

const LIGA_FILE = path.join(ROOT, 'liga.json');
const ligas = fs.existsSync(LIGA_FILE) ? JSON.parse(fs.readFileSync(LIGA_FILE, 'utf8')) : {};
let liga = null;

function plan(f) {
  if (f === 'liga') {
    liga = (ligas.signos ||= { day: 0, pts: {} });
    return { sim: 'pista', opts: { tema: 'signos', bolas: 12, perigo: 0.6 }, dur: 'medio', league: { title: `${THEMES.signos.league} · RACE ${liga.day + 1}`, pts: liga.pts } };
  }
  if (f === 'multiplica') return { sim: 'multiplica', dur: 'medio' };
  if (f === 'decisao') { const ks = Object.keys(DECISIONS); return { sim: 'plinko', opts: { tema: ks[week % ks.length], bolas: 7 }, dur: 'curto' }; }
  if (f === 'guerra') return { sim: 'guerra', opts: week % 2 ? { tema: 'cores', times: 2 } : { tema: 'paises', times: 4 }, dur: 'medio' };
  if (f === 'sorte') return { sim: 'plinko', opts: { tema: 'sorte' }, dur: 'medio' };
  if (f === 'rps') return { sim: 'rps', opts: { tema: week % 2 ? 'elementos' : 'classico' }, dur: 'medio' };
  if (f === 'ordenacao') return { sim: 'ordenacao', opts: { disputa: ['rapidos', 'lentos', 'misto'][week % 3] }, dur: 'curto' };
  if (f === 'diferente' || f === 'bandeiras' || f === 'pixel') return { sim: f, dur: 'curto' };
  if (f === 'domino') return { sim: 'domino', outcome: rng() < 0.5 ? 'completo' : 'parou', dur: 'medio' };
  if (f === 'barras') return { sim: 'barras', opts: { dados: week % 2 ? 'pib' : 'populacao' }, dur: 'livre' };
  if (f === 'classico') {
    const sims = ['labirinto', 'zona', 'corrida', 'pista'];
    return plan(sims[week % sims.length]);
  }
  if (!SIMS[f]) throw new Error(`formato desconhecido: ${f}`);
  return { sim: f, outcome: f === 'pista' && rng() < 0.5 ? 'drama' : 'any', dur: f === 'labirinto' ? 'medio' : 'curto' };
}

const p = plan(formato);
const def = SIMS[p.sim], tx = textsFor(p.sim, p.opts || {});
const choice = {
  sim: p.sim,
  opts: p.opts || {},
  music: pick(Object.keys(MELODIES)),
  palette: pick(Object.keys(PALETTES)),
  bg: pick(Object.keys(BACKGROUNDS)),
  hook: p.league ? `Zodiac League · Race ${liga.day + 1} 🏁` : pick(tx.hooks),
  cta: pick(tx.ctas),
  handle: process.env.HANDLE || '',
  outcome: p.outcome || 'any',
  dur: p.dur || 'curto',
  league: p.league || null,
  forceWav: !!process.env.FORCE_WAV,
};
const sim = p.sim;
console.log(`[${date}] ${formato} → ${def.name} ${JSON.stringify(choice.opts)} · ${choice.music} · ${choice.palette} · ${choice.bg}`);
console.log(`gancho: ${choice.hook}`);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const c = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find(p => fs.existsSync(p));
  if (!c) throw new Error('Chrome não encontrado. Defina CHROME_PATH.');
  return c;
}

async function waitServer(url, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('o servidor local não respondeu');
}

const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
let browser;
try {
  await waitServer(`http://127.0.0.1:${PORT}/`);
  browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling'],
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('erro na página:', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.addScriptTag({ type: 'module', url: 'auto.js' });
  await page.waitForFunction('window.quica && window.quica.auto', { timeout: 30000 });
  const t0 = Date.now();
  const r = await page.evaluate(o => window.quica.auto(o), choice);
  console.log(`renderizado em ${((Date.now() - t0) / 1000).toFixed(0)}s · seed ${r.seed} · ${r.duration.toFixed(1)}s · ${JSON.stringify(r.result)}`);

  fs.mkdirSync(outDir, { recursive: true });
  const base = `${date}-${sim}-${r.seed}`;
  const mp4 = path.join(outDir, base + '.mp4');
  if (r.wav) {
    // O Chrome não codificou o áudio: junta o WAV com o ffmpeg.
    const tmpV = path.join(outDir, base + '.video.mp4'), tmpA = path.join(outDir, base + '.wav');
    fs.writeFileSync(tmpV, Buffer.from(r.mp4, 'base64'));
    fs.writeFileSync(tmpA, Buffer.from(r.wav, 'base64'));
    execFileSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmpV, '-i', tmpA,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
    fs.rmSync(tmpV); fs.rmSync(tmpA);
    console.log('áudio juntado com ffmpeg');
  } else {
    fs.writeFileSync(mp4, Buffer.from(r.mp4, 'base64'));
  }
  fs.writeFileSync(path.join(outDir, 'legenda.txt'), r.caption + '\n');
  if (liga && r.league) {
    for (const x of r.league) liga.pts[x.name] = (liga.pts[x.name] || 0) + x.add;
    liga.day++;
    fs.writeFileSync(LIGA_FILE, JSON.stringify(ligas, null, 2) + '\n');
    const top = Object.entries(liga.pts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} ${v}`).join(' · ');
    console.log(`liga atualizada (corrida ${liga.day}): ${top}`);
  }
  fs.writeFileSync(path.join(outDir, 'info.json'), JSON.stringify({ date, formato, file: path.basename(mp4), ...choice, seed: r.seed, duration: r.duration, result: r.result, league: r.league, caption: r.caption }, null, 2));
  console.log(`pronto: ${mp4} (${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB)`);
} finally {
  await browser?.close();
  server.kill();
}
