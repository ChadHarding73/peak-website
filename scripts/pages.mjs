// Rebuild page bodies, list-page bands, item bodies and the site footer from saved Squarespace HTML/JSON.
// Needs baseline/raw/{pages,lists,<collection>} from `npm run scrape`; run `npm run images` afterwards.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import matter from 'gray-matter';
import { convertPage, convertLayout } from './lib/sections.mjs';

const COLLECTIONS = ['experience', 'perspectives', 'team'];
const order = {};
for (const c of COLLECTIONS) {
  const items = [];
  for (const f of await readdir(`src/${c}`)) if (f.endsWith('.md')) items.push([matter(await readFile(`src/${c}/${f}`, 'utf8')).data.sqsOrder, f.replace(/\.md$/, '')]);
  order[c] = items.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
const customCss = await readFile('baseline/squarespace-custom.css', 'utf8');
const keepIds = new Set([...customCss.matchAll(/#block-([A-Za-z0-9_]+)/g)].map(m => m[1]));
const slice = (h, open, close) => h.slice(h.indexOf(open), h.indexOf(close) + close.length);
const headerTheme = h => (slice(h, '<header', '</header>').match(/data-section-theme="([^"]*)"/) || [])[1] || 'light';

const warnings = {};
const note = (k, w) => { if (w.length) warnings[k] = w; };
let footer = null;

for (const f of (await readdir('baseline/raw/pages')).filter(f => f.endsWith('.html'))) {
  const slug = f.replace(/\.html$/, '');
  const raw = await readFile(`baseline/raw/pages/${f}`, 'utf8');
  const { html, warnings: w } = convertPage(slice(raw, '<main', '</main>'), order, { keepIds });
  const md = matter(await readFile(`src/pages/${slug}.md`, 'utf8'));
  await writeFile(`src/pages/${slug}.md`, matter.stringify(html, { ...md.data, headerTheme: headerTheme(raw) }));
  note(slug, w);
  footer ??= convertPage(slice(raw, '<footer', '</footer>'), order, { keepIds });
}

await mkdir('src/_includes/lists', { recursive: true });
const listThemes = {};
for (const c of COLLECTIONS) {
  const raw = await readFile(`baseline/raw/lists/${c}.html`, 'utf8');
  const { html, warnings: w } = convertPage(slice(raw, '<main', '</main>'), order, { keepIds });
  await writeFile(`src/_includes/lists/${c}.njk`, html);
  listThemes[c] = headerTheme(raw);
  note(`list:${c}`, w);
}
await mkdir('src/_data', { recursive: true });
await writeFile('src/_data/listThemes.json', JSON.stringify(listThemes, null, 2) + '\n');

for (const c of COLLECTIONS) {
  for (const slug of order[c]) {
    const item = JSON.parse(await readFile(`baseline/raw/${c}/${slug}.json`, 'utf8'));
    const { html, warnings: w } = convertLayout(item.body || '', { order, keepIds });
    const md = matter(await readFile(`src/${c}/${slug}.md`, 'utf8'));
    await writeFile(`src/${c}/${slug}.md`, matter.stringify(html, md.data));
    note(`${c}/${slug}`, w);
  }
}

await mkdir('src/_includes/partials', { recursive: true });
await writeFile('src/_includes/partials/footer-sections.njk', footer.html);
note('footer', footer.warnings);
await writeFile('baseline/page-warnings.json', JSON.stringify(warnings, null, 2) + '\n');
const unknown = Object.entries(warnings).flatMap(([k, ws]) => ws.filter(w => !w.startsWith('code block')).map(w => `${k}: ${w}`));
console.log(`${Object.keys(warnings).length} files with warnings; non-code warnings:\n${unknown.join('\n') || '(none)'}`);
