import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ORIGIN } from './lib/inventory.mjs';
import { IMAGE_HOSTS, originalUrl, assignNames, rewriteRefs, ORIGINAL_ACCEPT, typeMatchesName, nameForType, acceptFor } from './lib/images.mjs';
import { guardMigration } from './lib/inventory.mjs';
guardMigration();

const DIRS = ['experience', 'perspectives', 'team', 'pages'];
const files = [];
for (const d of DIRS) for (const f of await readdir(`src/${d}`)) if (f.endsWith('.md')) files.push({ dir: d, path: `src/${d}/${f}`, slug: f.replace(/\.md$/, '') });
for (const f of await readdir('src/_includes/partials')) if (f.endsWith('.njk')) files.push({ dir: 'site', path: `src/_includes/partials/${f}`, slug: f.replace(/\.njk$/, '') });

const refs = [];
for (const f of files) {
  const text = await readFile(f.path, 'utf8');
  for (const m of text.matchAll(IMAGE_HOSTS)) refs.push({ url: m[0], stem: f.slug, dir: f.dir });
}
const names = assignNames(refs);
const dirOf = new Map(refs.map(r => [originalUrl(r.url), r.dir]));
const localPath = new Map([...names].map(([url, name]) => [url, `/images/${dirOf.get(url)}/${name}`]));

async function download(url, dest, tries = 3) {
  try { await access(dest); return { type: 'cached', dest }; } catch {}
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url, { headers: { accept: acceptFor(url) } });
    if (res.ok) {
      const type = res.headers.get('content-type');
      dest = nameForType(dest, type);
      if (!typeMatchesName(dest, type)) throw new Error(`type ${type} does not match ${dest} (${url})`);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return { type, dest };
    }
    if (i === tries) throw new Error(`${res.status} ${url}`);
  }
}

let manifest = {};
try { manifest = JSON.parse(await readFile('baseline/images.json', 'utf8')); } catch {}
for (const [url, path] of localPath) {
  const { type, dest } = await download(url, `src${path}`);
  localPath.set(url, dest.slice(3));
  manifest[url] = { local: dest.slice(3), type };
}
for (const f of files) await writeFile(f.path, rewriteRefs(await readFile(f.path, 'utf8'), localPath));

const urls = JSON.parse(await readFile('baseline/urls.json', 'utf8'));
for (const u of urls.filter(u => u.status === 200 && u.type !== 'text/html')) {
  manifest[ORIGIN + u.path] = { local: u.path, type: (await download(ORIGIN + u.path, `src${decodeURIComponent(u.path)}`)).type };
}
await writeFile('baseline/images.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`${Object.keys(manifest).length} assets`);
