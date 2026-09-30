import { fetchRetry } from './lib/net.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ORIGIN } from './lib/inventory.mjs';
import { COLLECTIONS, itemToFile, pageToFile, parseSeo, droppedTags } from './lib/convert.mjs';
import { guardMigration } from './lib/inventory.mjs';
guardMigration();

async function getJson(path) {
  const res = await fetchRetry(`${ORIGIN}${path}${path.includes('?') ? '&' : '?'}format=json`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}
async function getHtml(path) {
  const res = await fetchRetry(ORIGIN + path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.text();
}

const warnings = [];
let count = 0;
for (const collection of COLLECTIONS) {
  await mkdir(`src/${collection}`, { recursive: true });
  await mkdir(`baseline/raw/${collection}`, { recursive: true });
  await mkdir('baseline/raw/lists', { recursive: true });
  let next = `/${collection}`;
  let order = 0;
  while (next) {
    const d = await getJson(next);
    for (const item of d.items) {
      const itemHtml = await getHtml(item.fullUrl);
      const f = itemToFile(item, parseSeo(itemHtml), order++);
      if (order === 1) await writeFile(`baseline/raw/lists/_item_${collection}.html`, itemHtml);
      await writeFile(f.path, f.text);
      await writeFile(`baseline/raw/${collection}/${f.slug}.json`, JSON.stringify(item, null, 2));
      const dropped = droppedTags(item.body || '');
      if (dropped.length) warnings.push({ url: item.fullUrl, dropped });
      count++;
    }
    next = d.pagination?.nextPage ? d.pagination.nextPageUrl : null;
  }
}

const urls = JSON.parse(await readFile('baseline/urls.json', 'utf8'));
const isCollectionPath = p => COLLECTIONS.some(c => p === `/${c}` || p.startsWith(`/${c}/`));
const standalone = urls.filter(u => u.status === 200 && u.type === 'text/html' && u.path !== '/' && !isCollectionPath(u.path)).map(u => u.path.slice(1));
await mkdir('src/pages', { recursive: true });
await mkdir('baseline/raw/pages', { recursive: true });
for (const slug of standalone) {
  const html = await getHtml(`/${slug}`);
  const json = await getJson(`/${slug}`);
  const f = pageToFile(slug, json, parseSeo(html));
  await mkdir(dirname(f.path), { recursive: true });
  await writeFile(f.path, f.text);
  await mkdir(dirname(`baseline/raw/pages/${slug}.html`), { recursive: true });
  await writeFile(`baseline/raw/pages/${slug}.html`, html);
  await writeFile(`baseline/raw/pages/${slug}.json`, JSON.stringify({ updatedOn: json.collection?.updatedOn ?? null }));
  const dropped = droppedTags(json.mainContent || '');
  if (dropped.length) warnings.push({ url: `/${slug}`, dropped });
  count++;
}
await writeFile('baseline/scrape-warnings.json', JSON.stringify(warnings, null, 2) + '\n');
console.log(`${count} files written, ${warnings.length} with dropped tags`);
