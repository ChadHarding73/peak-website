import { readFile } from 'node:fs/promises';
import { checkEntry } from './lib/smoke.mjs';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base.startsWith('http')) { console.error('usage: node scripts/smoke.mjs <baseUrl>'); process.exit(2); }
const urls = JSON.parse(await readFile('baseline/urls.json', 'utf8')).filter(u => u.status === 200 || (u.status >= 300 && u.status < 400));
const failures = [];
for (const u of urls) {
  const r = await checkEntry(u, fetch, base);
  if (!r.ok) { failures.push(r); console.log(`FAIL ${r.path}  ${r.detail}`); }
}
console.log(`${urls.length - failures.length}/${urls.length} OK against ${base}`);
process.exit(failures.length ? 1 : 0);
