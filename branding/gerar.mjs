// Gera branding/perfil.png (1080×1080) e branding/capa-youtube.png (2560×1440).
// Uso: node branding/gerar.mjs ["NOME" "frase"]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const [name, tag] = process.argv.slice(2);
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(p => fs.existsSync(p));

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
try {
  const page = await browser.newPage();
  const url = pathToFileURL(path.join(DIR, 'branding.html'));
  if (name) url.searchParams.set('name', name);
  if (tag) url.searchParams.set('tag', tag);
  await page.goto(url.href, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 30000 });
  for (const [id, file] of [['avatar', 'perfil.png'], ['banner', 'capa-youtube.png']]) {
    const data = await page.evaluate(i => document.getElementById(i).toDataURL('image/png'), id);
    fs.writeFileSync(path.join(DIR, file), Buffer.from(data.split(',')[1], 'base64'));
    console.log('gerado', file);
  }
} finally {
  await browser.close();
}
