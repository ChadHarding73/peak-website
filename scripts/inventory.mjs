import { fetchRetry } from './lib/net.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { ORIGIN, parseSitemap, extractLinks, addUnique, pathKey } from './lib/inventory.mjs';
import { guardMigration } from './lib/inventory.mjs';
guardMigration();

const found = new Map();
const xml = await (await fetchRetry(`${ORIGIN}/sitemap.xml`)).text();
for (const p of parseSitemap(xml)) addUnique(found, p, 'sitemap');
addUnique(found, '/', 'root');

const queue = [...found.values()].map(v => v.path);
const crawled = new Set();
while (queue.length) {
  const p = queue.shift();
  const k = pathKey(p);
  if (crawled.has(k)) continue;
  crawled.add(k);
  const res = await fetchRetry(ORIGIN + p, { redirect: 'manual' });
  const entry = found.get(k);
  entry.status = res.status;
  entry.type = (res.headers.get('content-type') || '').split(';')[0];
  if (res.status >= 300 && res.status < 400) entry.location = res.headers.get('location');
  if (res.status !== 200 || entry.type !== 'text/html') continue;
  for (const link of extractLinks(await res.text(), ORIGIN + p)) {
    if (!found.has(pathKey(link))) { addUnique(found, link, `crawl:${p}`); queue.push(link); }
  }
}

const urls = [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
await mkdir('baseline', { recursive: true });
await writeFile('baseline/urls.json', JSON.stringify(urls, null, 2) + '\n');
const by = s => urls.filter(u => u.status === s).length;
console.log(`${urls.length} URLs: ${by(200)} x 200, ${urls.filter(u => u.status >= 300 && u.status < 400).length} x 3xx, ${by(404)} x 404`);
