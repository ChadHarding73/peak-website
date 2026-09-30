import { fetchRetry } from './lib/net.mjs';
import { readFile, readdir } from 'node:fs/promises';
import { ORIGIN } from './lib/inventory.mjs';
import { COLLECTIONS, splitFullUrl } from './lib/convert.mjs';
import { guardMigration } from './lib/inventory.mjs';
guardMigration();

const json = async p => (await fetchRetry(`${ORIGIN}${p}${p.includes('?') ? '&' : '?'}format=json`)).json();
const changes = [];
for (const c of COLLECTIONS) {
  const seen = new Set();
  let next = `/${c}`;
  while (next) {
    const d = await json(next);
    for (const item of d.items) {
      const { slug } = splitFullUrl(item.fullUrl);
      seen.add(slug);
      let raw = null;
      try { raw = JSON.parse(await readFile(`baseline/raw/${c}/${slug}.json`, 'utf8')); } catch {}
      if (!raw) changes.push(`NEW      ${item.fullUrl}`);
      else if (raw.updatedOn !== item.updatedOn) changes.push(`EDITED   ${item.fullUrl}`);
    }
    next = d.pagination?.nextPage ? d.pagination.nextPageUrl : null;
  }
  for (const f of await readdir(`baseline/raw/${c}`)) {
    const slug = f.replace(/\.json$/, '');
    if (!seen.has(slug)) changes.push(`REMOVED  /${c}/${slug}`);
  }
}
for (const f of (await readdir('baseline/raw/pages')).filter(f => f.endsWith('.json'))) {
  const slug = f.replace(/\.json$/, '');
  const was = JSON.parse(await readFile(`baseline/raw/pages/${f}`, 'utf8')).updatedOn;
  const now = (await json(`/${slug}`)).collection?.updatedOn ?? null;
  if (was !== now) changes.push(`EDITED   /${slug}`);
}
console.log(changes.length ? changes.join('\n') : 'NO DRIFT');
process.exit(changes.length ? 1 : 0);
