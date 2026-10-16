// Codifica os quadros (H.264) e a trilha (AAC) direto no navegador e monta o MP4.
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';
import { W, H, FPS } from './sims.js';

async function pickVideo() {
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028']) {
    const cfg = { codec, width: W, height: H, bitrate: 8_000_000, framerate: FPS };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch {}
  }
  throw new Error('Este navegador não codifica H.264. Use o Chrome atualizado.');
}

// MessageChannel em vez de setTimeout: o Chrome não desacelera isso quando a aba fica em segundo plano.
const chan = new MessageChannel(), waiting = [];
chan.port1.onmessage = () => waiting.shift()?.();
const tick = () => new Promise(r => { waiting.push(r); chan.port2.postMessage(0); });

export async function exportMp4(canvas, renderer, nFrames, audio, onProgress) {
  if (typeof VideoEncoder === 'undefined') throw new Error('Este navegador não tem WebCodecs. Use o Chrome atualizado.');
  const vcfg = await pickVideo();
  const acfg = { codec: 'mp4a.40.2', sampleRate: audio.sampleRate, numberOfChannels: 2, bitrate: 192_000 };
  let hasAudio = false;
  try { hasAudio = typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported(acfg)).supported; } catch {}

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: W, height: H, frameRate: FPS },
    audio: hasAudio ? { codec: 'aac', numberOfChannels: 2, sampleRate: audio.sampleRate } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let err = null;

  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => (err = e) });
  venc.configure({ ...vcfg, avc: { format: 'avc' } });
  for (let i = 0; i < nFrames; i++) {
    if (err) throw err;
    renderer.draw(i);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 });
    vf.close();
    while (venc.encodeQueueSize > 6) await tick();
    if (i % 10 === 0) { onProgress(i / nFrames); await tick(); }
  }
  await venc.flush(); venc.close();

  if (hasAudio) {
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => (err = e) });
    aenc.configure(acfg);
    const L = audio.getChannelData(0), R = audio.getChannelData(1);
    const total = Math.min(audio.length, Math.round((nFrames / FPS) * audio.sampleRate)), CH = 4096;
    for (let off = 0; off < total; off += CH) {
      const n = Math.min(CH, total - off), buf = new Float32Array(n * 2);
      buf.set(L.subarray(off, off + n), 0); buf.set(R.subarray(off, off + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: audio.sampleRate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off * 1e6) / audio.sampleRate), data: buf });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush(); aenc.close();
  }
  if (err) throw err;
  muxer.finalize();
  onProgress(1);
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), hasAudio };
}
