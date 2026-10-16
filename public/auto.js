// Modo automático: gera um vídeo completo sem interface (usado pelo scripts/diario.mjs).
// Expõe window.quica.auto(opções) → { mp4, wav, seed, duration, result, caption, league } (arquivos em base64).
import { SIMS, DURATIONS, W, H, runSim, findSeed, defaultsOf, leagueResult } from './sims.js';
import { Renderer } from './render.js';
import { renderAudio } from './audio.js';
import { exportMp4 } from './exporter.js';
import { suggestCaption } from './caption.js';

// WAV 16 bits: usado quando o navegador não codifica AAC (Chrome no Linux); o ffmpeg junta depois.
function wavBlob(buf) {
  const ch = buf.numberOfChannels, n = buf.length, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVEfmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = [...Array(ch).keys()].map(c => buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const v = Math.max(-1, Math.min(1, chans[c][i]));
    data.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true); off += 2;
  }
  return new Blob([data], { type: 'audio/wav' });
}

const base64 = blob => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result.split(',')[1]);
  fr.onerror = rej;
  fr.readAsDataURL(blob);
});

export async function auto(o) {
  const def = SIMS[o.sim];
  // na liga o vídeo ganha alguns segundos no fim para a tabela de pontos
  const opts = { ...defaultsOf(def), ...(o.opts || {}), ...(o.league ? { _outro: 7.5 } : {}) };
  let seed = await findSeed(o.sim, opts, o.outcome || 'any', DURATIONS[o.dur || 'curto'].range, null, 800);
  if (seed === null) seed = await findSeed(o.sim, opts, 'any', DURATIONS.livre.range, null, 800);
  if (seed === null) throw new Error('nenhuma seed terminou a tempo');
  const tl = runSim(o.sim, opts, seed);
  const st = { bg: o.bg, bgUrl: null, palette: o.palette, hook: o.hook, cta: o.cta, handle: o.handle || '', league: o.league || null };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const r = new Renderer(cv);
  await r.setup(tl, st);
  const audio = await renderAudio(tl, o.music);
  const { blob, hasAudio } = await exportMp4(cv, r, tl.frames.length, audio, () => {});
  const needWav = !hasAudio || o.forceWav;
  return {
    mp4: await base64(blob),
    wav: needWav ? await base64(wavBlob(audio)) : null,
    hasAudio, seed, duration: tl.duration, result: tl.result,
    league: o.league ? leagueResult(tl).map(({ name, add }) => ({ name, add })) : null,
    caption: suggestCaption({ hook: o.hook, music: o.music, sim: o.sim, opts }),
  };
}

window.quica = { auto };
