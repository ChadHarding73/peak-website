// Fidelity check: every baseline HTML URL, old (live Squarespace) vs new, at 1440 and 390 wide.
// Compares visible text, full-page screenshots (pixel ratio + height) and writes reports/fidelity.{json,html}.
// Old captures are cached in baseline/shots/*-old.{png,txt}; pass --refresh-old to recapture them.
// Usage: node scripts/verify.mjs [newBase] [--only=/a,/b] [--refresh-old] [--concurrency=4]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { ORIGIN } from './lib/inventory.mjs';
import { normalizeText, firstDifference, diffRatio, classify } from './lib/compare.mjs';
import { settle } from './probe-styles.mjs';
import { start } from './serve.mjs';

const args = process.argv.slice(2);
const opt = name => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const only = opt('only').split(',').filter(Boolean);
const refreshOld = args.includes('--refresh-old');
const concurrency = Number(opt('concurrency') || 4);
let newBase = args.find(a => a.startsWith('http'));
let server;
if (!newBase) { server = await start(8080); newBase = 'http://localhost:8080'; }

const urls = JSON.parse(await readFile('baseline/urls.json', 'utf8'))
  .filter(u => u.status === 200 && u.type === 'text/html')
  .filter(u => !only.length || only.includes(u.path));

const browser = await chromium.launch();
async function capture(base, path, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  try {
    await page.goto(base + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await settle(page);
    const text = normalizeText(await page.evaluate(() => document.body.innerText));
    const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
    return { text, png };
  } finally { await page.close(); }
}
async function captureOld(path, width, tag, k) {
  const png = `baseline/shots/${tag}-${k}-old.png`, txt = `baseline/shots/${tag}-${k}-old.txt`;
  if (!refreshOld) {
    try { return { png: PNG.sync.read(await readFile(png)), text: await readFile(txt, 'utf8') }; } catch {}
  }
  const o = await capture(ORIGIN, path, width);
  await writeFile(png, PNG.sync.write(o.png));
  await writeFile(txt, o.text);
  return o;
}

await mkdir('baseline/shots', { recursive: true });
await mkdir('reports', { recursive: true });
const results = [];
let next = 0;
async function worker() {
  while (next < urls.length) {
    const u = urls[next++];
    const r = { path: u.path };
    const tag = u.path.replace(/[^a-z0-9]+/gi, '_') || '_home';
    try {
      for (const [k, width] of [['desktop', 1440], ['mobile', 390]]) {
        const o = await captureOld(u.path, width, tag, k);
        const n = await capture(newBase, u.path, width);
        if (k === 'desktop') r.text = firstDifference(o.text, n.text);
        r[k] = diffRatio(o.png, n.png);
        await writeFile(`baseline/shots/${tag}-${k}-new.png`, PNG.sync.write(n.png));
        r[`${k}Shots`] = [`../baseline/shots/${tag}-${k}-old.png`, `../baseline/shots/${tag}-${k}-new.png`];
      }
      Object.assign(r, classify(r));
    } catch (e) {
      Object.assign(r, { status: 'flag', reasons: [`error: ${e.message.split('\n')[0]}`] });
    }
    results.push(r);
    console.log(`${r.status.padEnd(5)} ${u.path} ${r.reasons.join('; ')}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
await browser.close();
server?.close();

results.sort((a, b) => a.path.localeCompare(b.path));
const flagged = results.filter(r => r.status === 'flag');
await writeFile('reports/fidelity.json', JSON.stringify(results, null, 2));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
await writeFile('reports/fidelity.html', `<!doctype html><meta charset="utf-8"><title>Fidelity report</title>
<style>body{font:14px system-ui;margin:24px}img{width:48%;border:1px solid #ccc;vertical-align:top}section{margin:32px 0;border-top:2px solid #eee}code{background:#f4f4f4}</style>
<h1>Fidelity: ${results.length - flagged.length} match, ${flagged.length} flagged (of ${results.length})</h1>
<p>Left: live Squarespace site. Right: new site.</p>
${flagged.map(r => `<section><h2><code>${esc(r.path)}</code></h2><p>${esc(r.reasons.join('; '))}</p>
${r.text ? `<p><b>Old:</b> ${esc(r.text.old)}<br><b>New:</b> ${esc(r.text.new)}</p>` : ''}
${r.desktopShots ? `<p>Desktop</p><img src="${r.desktopShots[0]}"><img src="${r.desktopShots[1]}">` : ''}
${r.mobileShots ? `<p>Mobile</p><img src="${r.mobileShots[0]}"><img src="${r.mobileShots[1]}">` : ''}</section>`).join('\n')}`);
console.log(`${flagged.length} flagged of ${results.length}. Report: reports/fidelity.html`);
