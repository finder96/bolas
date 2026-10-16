// Servidor local do Quica: serve a interface, guarda a semana em data.json e salva os MP4 em exports/.
// Uso: node server.js  →  http://localhost:5178
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const EXPORTS = path.join(ROOT, 'exports');
const FUNDOS = path.join(ROOT, 'fundos');
const DATA = path.join(ROOT, 'data.json');
const PORT = Number(process.env.PORT) || 5178;
for (const d of [EXPORTS, FUNDOS]) fs.mkdirSync(d, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
};
const IMG = /\.(png|jpe?g|webp)$/i;

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 1024 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('arquivo grande demais')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) && file !== base) return send(res, 403, { error: 'proibido' });
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, { error: 'não encontrado' });
    send(res, 200, buf, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = decodeURIComponent(url.pathname);

    if (p === '/api/data' && req.method === 'GET') {
      return fs.readFile(DATA, 'utf8', (err, txt) => send(res, 200, err ? '{"days":{}}' : txt));
    }
    if (p === '/api/data' && req.method === 'POST') {
      const data = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString('utf8'));
      if (!data || typeof data.days !== 'object') return send(res, 400, { error: 'formato inválido' });
      fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
      return send(res, 200, { ok: true });
    }
    if (p === '/api/fundos') {
      return send(res, 200, fs.readdirSync(FUNDOS).filter(f => IMG.test(f)).sort());
    }
    if (p === '/api/export' && req.method === 'POST') {
      const name = url.searchParams.get('name') || '';
      if (!/^[\w\-. ]+\.mp4$/.test(name)) return send(res, 400, { error: 'nome inválido' });
      const file = path.join(EXPORTS, name);
      fs.writeFileSync(file, await readBody(req));
      return send(res, 200, { path: file });
    }
    if (p.startsWith('/fundos/')) return serveFile(res, FUNDOS, p.slice('/fundos/'.length));
    if (p.startsWith('/exports/')) return serveFile(res, EXPORTS, p.slice('/exports/'.length));
    return serveFile(res, PUB, p === '/' ? 'index.html' : p.slice(1));
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Quica rodando em http://localhost:${PORT}`));
