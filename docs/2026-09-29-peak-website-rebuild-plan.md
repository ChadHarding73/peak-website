# PEAK Website Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Squarespace-hosted peak-tech.com with a visually identical Eleventy static site on Netlify that Claude edits directly, with no broken URLs and no change to the firm's email DNS.

**Architecture:** Content is extracted from Squarespace's JSON endpoint (`?format=json`) into Markdown files with front matter and cleaned HTML bodies. Hand-built Nunjucks templates reproduce the current look. A verification tool compares every old and new page (text, desktop and mobile screenshots, links) before any human review. Netlify builds from a private GitHub repo. Branch pushes produce preview URLs, and merging to `main` publishes. Cutover changes only the four A records and the `www` CNAME.

**Tech Stack:** Node >= 22, Eleventy 3.1.x, Nunjucks, sanitize-html 2.17.x, gray-matter 4.0.x, Playwright 1.63.x, pixelmatch 7.2.x, pngjs 7.0.x, `node:test`, Netlify (free tier) + Netlify Forms, GitHub (private repo, SSH push).

**Spec:** `~/peak/4 Claude Code Sandbox/PEAK Website Rebuild/2026-09-29-peak-website-rebuild-design.md` (copied into `~/peak-website/docs/` in Task 1).

**Deviation from spec §4 tree:** content lives in `src/<collection>/` and templates in `src/_includes/` (Eleventy's convention), not top-level `content/` and `templates/`. The responsibilities are unchanged.

**URL scheme:** directory-style output (`/team/chad-harding/index.html`). Canonical links keep the old no-slash form. Netlify may answer `/team/chad-harding` with a 301 to the slash form, which the smoke checker accepts. Task 4 Step 13 proves this on real Netlify before any templates are built.

## Global Constraints

- Repo lives at `~/peak-website` on the MacBook Pro. Never under OneDrive.
- Node >= 22 locally; Netlify builds pin `NODE_VERSION = "22"`.
- Canonical host is `https://www.peak-tech.com`; `peak-tech.com` 301s to `www` (today's behavior).
- Every baseline URL that returns 200 today must return 200 on the new site, either directly or after one trailing-slash redirect. The old site serves both `/x` and `/x/` with 200.
- Visible text of every page must match the old page word for word at launch.
- Migrated copy is preserved verbatim, including any em dashes already on the site. Any new copy drafted for Chad uses no em dashes, and the brand is "PEAK" or "Peak Technology Partners".
- Built output must contain no references to `squarespace-cdn.com`, `static1.squarespace.com` or `use.typekit.net`.
- Analytics load only when Netlify `CONTEXT` is `production`. Every non-production page carries `<meta name="robots" content="noindex">`.
- DNS: never modify MX, SPF, DKIM (`google._domainkey`), DMARC, Google site-verification TXT, nameservers or registrar. Only the four A records and the `www` CNAME change.
- Public website content only. No deal material, and no tombstone before it is cleared to publish.
- Every change after launch: branch, then preview, then Chad's OK, then merge.
- Claude never creates accounts, enters credentials, grants OAuth, submits a form, or edits DNS. Chad does these, or explicitly OKs each one.
- Cutover happens on a Monday to Thursday morning, never a Friday.

## Review Focus

1. **Encoded category URLs** such as `/experience/category/Merger+%26+Acquisition` must return 200 at the real Netlify host, not just locally. Pinned by the inventory test (Task 1), the resolver test (Task 4) and the smoke run against the preview (Task 8).
2. **Slash and no-slash variants** (`/team/chad-harding` and `/team/chad-harding/`) must both resolve. Pinned by the resolver test (Task 4) and the smoke checker test (Task 8).
3. **Curly quotes, ampersands and dashes** in titles (e.g. `The “SaaSpocalypse” Didn’t Slow Down M&A - It Accelerated It`) must survive the YAML front matter round trip and render identically. Pinned by the `itemToFile` round-trip test (Task 2).
4. **Two different uploads with the same filename** (e.g. two `image.png` files) must not overwrite each other. Pinned by the `assignNames` collision test (Task 3).
5. **The contact form must work without JavaScript,** and no submission may be lost in the cutover window. Pinned by the form markup test (Task 6) and the Squarespace form-storage check in the cutover runbook (Task 9).

---

## File Map

```
~/peak-website/
  package.json                    scripts + pinned deps
  eleventy.config.mjs             collections, filters, dirs
  netlify.toml                    build + Node pin
  .gitignore
  CLAUDE.md                       edit recipe for future sessions (Task 8)
  README.md                       plain-language stack guide (Task 8)
  docs/                           spec + this plan
  baseline/
    urls.json                     URL inventory (tracked)
    squarespace-settings.md       code injection, form, URL mappings (tracked)
    styles.json                   computed-style probe of live site (tracked)
    scrape-warnings.json          tags dropped during cleaning (tracked)
    images.json                   remote -> local image manifest (tracked)
    raw/                          raw JSON/HTML per page (ignored)
  scripts/
    lib/text.mjs                  decodeEntities, visibleText
    lib/inventory.mjs             toPath, pathKey, parseSitemap, extractLinks, addUnique
    lib/convert.mjs               cleanBody, droppedTags, parseSeo, itemToFile, pageToFile
    lib/images.mjs                originalUrl, localName, assignNames, rewriteRefs
    lib/resolve.mjs               resolveFile, parseRedirects, matchRedirect
    lib/compare.mjs               normalizeText, firstDifference, diffRatio, classify
    lib/smoke.mjs                 checkEntry
    inventory.mjs  scrape.mjs  images.mjs  probe-styles.mjs
    serve.mjs  verify.mjs  smoke.mjs
  src/
    _data/site.json  _data/env.js
    _includes/layouts/{base,tombstone,post,bio,list,page,home,people,contact}.njk
    _includes/partials/{header,footer,analytics,head-injection}.njk
    _redirects
    assets/css/site.css  assets/fonts/*
    images/<collection>/*
    experience/*.md + experience.11tydata.js
    perspectives/*.md + perspectives.11tydata.js
    team/*.md + team.11tydata.js
    pages/*.md + pages.11tydata.js
    experience.njk perspectives.njk category.njk contact-thanks.njk
  tests/
    fixtures/  inventory.test.mjs  convert.test.mjs  images.test.mjs
    resolve.test.mjs  coverage.test.mjs  build.test.mjs  compare.test.mjs  smoke.test.mjs
  reports/                        fidelity report output (ignored)
```

---

### Task 0: Inputs and Squarespace settings capture (human-gated, no code)

**Files:**
- Create (in Task 1's repo, recorded here first): `baseline/squarespace-settings.md`

**Interfaces:**
- Produces: `baseline/squarespace-settings.md` with sections `## Code Injection`, `## Contact Form`, `## URL Mappings`, `## Promotional Pop-Up`, `## Analytics`, `## DNS Presets`. Tasks 4, 6 and 9 read it.

- [ ] **Step 1: Ask Chad for the inputs.** Request:
  1. Aktiv Grotesk font files (WOFF2 preferred; OTF/TTF acceptable), plus confirmation that the license covers **web** embedding.
  2. The PEAK logo as SVG, AI or EPS.
  3. A Squarespace login **in the in-app Browser pane**, done by Chad himself.

  4. A Netlify account under a PEAK address, created by Chad, before Task 4 Step 13 (the routing probe).
  5. GitHub setup before Task 8. This Mac's SSH key authenticates as Chad's personal account `ChadHarding73`, and a key can belong to only one GitHub account. So Chad creates a free GitHub **organization** owned by a PEAK address, adds `ChadHarding73` as an owner, and the repo lives in the org. The existing key then pushes with no new credential.

  Tell Chad: edits made in Squarespace during the build are fine and will not be lost. Task 9's drift check lists every item changed after the scrape, and each one is re-applied in the repo before cutover.

- [ ] **Step 2: With Chad logged in, read (do not change) these panels** at `https://apple-drum-7nk8.squarespace.com/config/`:
  - **Settings → Advanced → Code Injection:** copy the Header and Footer injection verbatim.
  - **Settings → Advanced → URL Mappings:** copy every line verbatim.
  - **Contact form recipients:** the Storage settings sit inside the visual page editor, which Claude cannot drive. Chad opens the contact page's form block, goes to **Storage**, and reads out or screenshots the recipient email address(es) and any Google Sheets or Mailchimp connection. Chad also reads out the post-submit message.
  - **Contact form fields:** Claude reads them from the public page DOM at `https://www.peak-tech.com/contact`: each field's label, input type, `required` flag and order, plus the submit button text.
  - **Pages panel → Marketing Tools → Promotional Pop-Up:** enabled or disabled; if enabled, its copy and trigger.
  - **Settings → Analytics / External API keys:** whether GA `G-3K4D2PRNEL` is set natively and whether a GTM container ID exists.
  - **Domains → peak-tech.com → DNS:** which records belong to the "Squarespace Defaults" preset versus the Google Workspace preset versus custom records, and each record's TTL. Screenshot it.

- [ ] **Step 3: Write `baseline/squarespace-settings.md`** with those six sections, verbatim values, and a closing line `Captured 2026-MM-DD from Squarespace admin, read-only.` Hold the file in the sandbox until Task 1 creates the repo, then move it in.

- [ ] **Step 4: Confirm with Chad** that nothing was saved in Squarespace, and that the captured form recipients are correct.

---

### Task 1: Repo scaffold and URL inventory

**Files:**
- Create: `package.json`, `.gitignore`, `netlify.toml`, `scripts/lib/text.mjs`, `scripts/lib/inventory.mjs`, `scripts/inventory.mjs`, `tests/inventory.test.mjs`
- Create: `docs/2026-09-29-peak-website-rebuild-design.md`, `docs/2026-09-29-peak-website-rebuild-plan.md` (copies)
- Output: `baseline/urls.json`

**Interfaces:**
- Produces:
  - `decodeEntities(s: string): string`
  - `visibleText(html: string): string`
  - `ORIGIN = 'https://www.peak-tech.com'`
  - `toPath(href: string, base?: string): string | null`
  - `pathKey(path: string): string`
  - `parseSitemap(xml: string): string[]`
  - `extractLinks(html: string, base?: string): string[]`
  - `addUnique(map: Map, path: string, source: string): Map`
  - `baseline/urls.json`: `Array<{ path: string, source: string, status: number, type: string, location?: string }>`

- [ ] **Step 1: Create the repo**

```bash
mkdir -p ~/peak-website && cd ~/peak-website && git init -b main
mkdir -p scripts/lib tests/fixtures baseline docs src
cp "$HOME/peak/4 Claude Code Sandbox/PEAK Website Rebuild/2026-09-29-peak-website-rebuild-"*.md docs/
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "peak-website",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "eleventy",
    "test": "node --test --test-concurrency=1 tests/",
    "inventory": "node scripts/inventory.mjs",
    "scrape": "node scripts/scrape.mjs",
    "images": "node scripts/images.mjs",
    "probe": "node scripts/probe-styles.mjs",
    "serve": "node scripts/serve.mjs",
    "verify": "node scripts/verify.mjs",
    "smoke": "node scripts/smoke.mjs",
    "drift": "node scripts/drift.mjs"
  }
}
```

Then install:

```bash
npm install @11ty/eleventy@~3.1.6
npm install -D sanitize-html@~2.17.0 gray-matter@~4.0.3 playwright@~1.63.0 pixelmatch@~7.2.0 pngjs@~7.0.0
npx playwright install chromium
```

- [ ] **Step 3: Write `.gitignore` and `netlify.toml`**

`.gitignore`:
```
node_modules/
_site/
baseline/raw/
baseline/shots/
reports/
.DS_Store
```

`netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "_site"

[build.environment]
  NODE_VERSION = "22"
```

- [ ] **Step 4: Write the failing tests** in `tests/inventory.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, visibleText } from '../scripts/lib/text.mjs';
import { toPath, pathKey, parseSitemap, extractLinks, addUnique } from '../scripts/lib/inventory.mjs';

test('decodeEntities handles named and numeric entities', () => {
  assert.equal(decodeEntities('M&amp;A &#8220;x&#8221; &rsquo; &#x2014;'), 'M&A “x” ’ —');
});

test('visibleText drops script/style/noscript and collapses whitespace', () => {
  assert.equal(visibleText('<p>Hi <b>there</b></p><script>x()</script><noscript><img></noscript>\n<p>A&amp;B</p>'), 'Hi there A&B');
});

test('toPath keeps internal paths, strips query/hash/trailing slash', () => {
  assert.equal(toPath('https://www.peak-tech.com/team/chad-harding/?x=1#top'), '/team/chad-harding');
  assert.equal(toPath('https://peak-tech.com/people'), '/people');
  assert.equal(toPath('/experience?offset=1690387721108'), '/experience');
  assert.equal(toPath('/'), '/');
});

test('toPath rejects external, mailto, tel and Squarespace system paths', () => {
  assert.equal(toPath('https://www.linkedin.com/company/x'), null);
  assert.equal(toPath('mailto:chad@peak-tech.com'), null);
  assert.equal(toPath('tel:+14155551212'), null);
  assert.equal(toPath('/config/pages'), null);
  assert.equal(toPath('/cart'), null);
});

test('toPath preserves percent-encoding exactly as linked (Review Focus 1)', () => {
  assert.equal(toPath('/experience/category/Merger+%26+Acquisition'), '/experience/category/Merger+%26+Acquisition');
  assert.equal(toPath('/experience/category/Merger+&amp;+Acquisition'), '/experience/category/Merger+&+Acquisition');
});

test('pathKey dedupes encoded and decoded forms; + stays literal', () => {
  assert.equal(pathKey('/experience/category/Merger+%26+Acquisition'), '/experience/category/Merger+&+Acquisition');
  assert.equal(pathKey('/experience/category/Merger+&+Acquisition'), '/experience/category/Merger+&+Acquisition');
});

test('parseSitemap returns paths', () => {
  const xml = '<urlset><url><loc>https://www.peak-tech.com/people</loc></url><url><loc> https://www.peak-tech.com/team/chad-harding </loc></url></urlset>';
  assert.deepEqual(parseSitemap(xml), ['/people', '/team/chad-harding']);
});

test('extractLinks decodes &amp; in hrefs and resolves relative links', () => {
  const html = '<a href="/experience/category/SaaS">x</a><a href="https://x.com">y</a><a href="/a?b=1&amp;c=2">z</a>';
  assert.deepEqual(extractLinks(html), ['/experience/category/SaaS', '/a']);
});

test('addUnique keeps first source for duplicate keys', () => {
  const m = new Map();
  addUnique(m, '/experience/category/Merger+%26+Acquisition', 'sitemap');
  addUnique(m, '/experience/category/Merger+&+Acquisition', 'crawl:/experience');
  assert.equal(m.size, 1);
  assert.equal([...m.values()][0].source, 'sitemap');
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/lib/text.mjs'`.

- [ ] **Step 6: Implement `scripts/lib/text.mjs`**

```js
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

export function visibleText(html) {
  const stripped = html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(stripped).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
```

- [ ] **Step 7: Implement `scripts/lib/inventory.mjs`**

```js
import { decodeEntities } from './text.mjs';

export const ORIGIN = 'https://www.peak-tech.com';
const HOSTS = new Set(['www.peak-tech.com', 'peak-tech.com']);
const SKIP = [/^\/config(\/|$)/, /^\/cart(\/|$)/, /^\/api\//, /^\/static\//, /^\/universal\//, /^\/commerce\//, /^\/account(\/|$)/];

export function toPath(href, base = ORIGIN) {
  let u;
  try { u = new URL(decodeEntities(href.trim()), base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !HOSTS.has(u.hostname)) return null;
  let p = u.pathname;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (SKIP.some(r => r.test(p))) return null;
  return p;
}

export function pathKey(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => toPath(m[1])).filter(Boolean);
}

export function extractLinks(html, base = ORIGIN) {
  const out = [];
  for (const m of html.matchAll(/\bhref\s*=\s*"([^"]+)"/g)) {
    const p = toPath(m[1], base);
    if (p) out.push(p);
  }
  return out;
}

export function addUnique(map, p, source) {
  const k = pathKey(p);
  if (!map.has(k)) map.set(k, { path: p, source });
  return map;
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 9 tests.

- [ ] **Step 9: Implement the CLI `scripts/inventory.mjs`**

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { ORIGIN, parseSitemap, extractLinks, addUnique, pathKey } from './lib/inventory.mjs';

const found = new Map();
const xml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
for (const p of parseSitemap(xml)) addUnique(found, p, 'sitemap');
addUnique(found, '/', 'root');

const queue = [...found.values()].map(v => v.path);
const crawled = new Set();
while (queue.length) {
  const p = queue.shift();
  const k = pathKey(p);
  if (crawled.has(k)) continue;
  crawled.add(k);
  const res = await fetch(ORIGIN + p, { redirect: 'manual' });
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
```

- [ ] **Step 10: Run it and sanity-check the output**

Run: `npm run inventory`
Expected: at least 231 URLs (the sitemap count on 2026-09-29), plus crawl-only entries.

```bash
node -e "const u=require('./baseline/urls.json');console.log(u.filter(x=>x.path.includes('/category/')).map(x=>x.path).join('\n'))"
```

Expected: includes `/experience/category/Merger+%26+Acquisition`. List every 404 entry for Chad; these are broken links on the current site, reported but not migrated.

- [ ] **Step 11: Move `baseline/squarespace-settings.md` in from Task 0, then commit**

```bash
git add -A && git commit -m "chore: scaffold repo and baseline URL inventory"
```

---

### Task 2: Content extraction

**Files:**
- Create: `scripts/lib/convert.mjs`, `scripts/scrape.mjs`, `tests/convert.test.mjs`, `tests/fixtures/experience-item.json`, `tests/fixtures/perspectives-item.json`
- Output: `src/{experience,perspectives,team,pages}/*.md`, `baseline/raw/**`, `baseline/scrape-warnings.json`

**Interfaces:**
- Consumes: `ORIGIN`, `toPath`, `pathKey`, `visibleText`, `decodeEntities`, `baseline/urls.json`
- Produces:
  - `COLLECTIONS = ['experience','perspectives','team']`
  - `splitFullUrl(fullUrl): { collection, slug }`
  - `isoDate(ms: number): 'YYYY-MM-DD'`
  - `cleanBody(html): string`
  - `droppedTags(html): string[]`
  - `parseSeo(html): { title, description, ogImage }`
  - `itemToFile(item, seo, order): { path, slug, text }`
  - `pageToFile(slug, json, seo): { path, text }`
  - Front matter fields every later task relies on: `title`, `date`, `image`, `categories`, `sqsTags`, `excerpt`, `seoTitle`, `seoDescription`, `ogImage`, `sqsId`, `sqsOrder`

- [ ] **Step 1: Capture real fixtures**

```bash
cd ~/peak-website
curl -s 'https://www.peak-tech.com/experience/mobohubb-acquired-by-guardhouse?format=json' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);if(!d.item)throw new Error('no item key: '+Object.keys(d));require('fs').writeFileSync('tests/fixtures/experience-item.json',JSON.stringify(d.item,null,2))})"
curl -s 'https://www.peak-tech.com/perspectives/the-saaspocalypse-accelerated-mergers-and-acquisitions?format=json' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);require('fs').writeFileSync('tests/fixtures/perspectives-item.json',JSON.stringify(d.item,null,2))})"
```

Expected: both files exist, and each has `title`, `body`, `fullUrl`, `publishOn`, `assetUrl`. If the endpoint shape differs (no `item` key), stop and inspect before writing tests.

- [ ] **Step 2: Write the failing tests** in `tests/convert.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { visibleText } from '../scripts/lib/text.mjs';
import { splitFullUrl, isoDate, cleanBody, droppedTags, parseSeo, itemToFile } from '../scripts/lib/convert.mjs';

const exp = JSON.parse(readFileSync('tests/fixtures/experience-item.json', 'utf8'));
const per = JSON.parse(readFileSync('tests/fixtures/perspectives-item.json', 'utf8'));

test('splitFullUrl parses collection and slug, rejects unknown collections', () => {
  assert.deepEqual(splitFullUrl('/team/chad-harding'), { collection: 'team', slug: 'chad-harding' });
  assert.throws(() => splitFullUrl('/blog/x'), /unexpected fullUrl/);
});

test('isoDate converts epoch ms to UTC date', () => {
  assert.equal(isoDate(1787592365954), '2026-08-24');
});

test('cleanBody removes wrappers, classes, scripts and noscript duplicates', () => {
  const html = '<div class="sqs-block"><div class="sqs-block-content"><p class="x" style="a">Hello <strong>World</strong></p><img data-src="https://images.squarespace-cdn.com/a/b.png?format=1500w" src="data:x"><noscript><img src="https://images.squarespace-cdn.com/a/b.png"></noscript><script>bad()</script></div></div>';
  const out = cleanBody(html);
  assert.equal(out, '<p>Hello <strong>World</strong></p><img src="https://images.squarespace-cdn.com/a/b.png" alt="" />');
});

test('cleanBody preserves visible text of real fixtures', () => {
  for (const item of [exp, per]) assert.equal(visibleText(cleanBody(item.body)), visibleText(item.body));
});

test('droppedTags reports non-allowlisted, non-wrapper tags', () => {
  assert.deepEqual(droppedTags('<div><iframe src="x"></iframe><p>a</p><video></video></div>'), ['iframe', 'video']);
});

test('parseSeo reads title, description and og:image', () => {
  const html = '<head><title>Chad Harding &mdash; Peak Technology Partners</title><meta name="description" content=" Chad is a Managing Partner"><meta property="og:image" content="http://static1.squarespace.com/x.jpg?format=1500w"></head>';
  assert.deepEqual(parseSeo(html), { title: 'Chad Harding — Peak Technology Partners', description: 'Chad is a Managing Partner', ogImage: 'http://static1.squarespace.com/x.jpg?format=1500w' });
});

test('itemToFile round-trips curly quotes and ampersands exactly (Review Focus 3)', () => {
  const f = itemToFile(per, {}, 0);
  assert.equal(f.path, 'src/perspectives/the-saaspocalypse-accelerated-mergers-and-acquisitions.md');
  const parsed = matter(f.text);
  assert.equal(parsed.data.title, per.title);
  assert.match(parsed.data.title, /“SaaSpocalypse” Didn’t Slow Down M&A/);
});

test('itemToFile maps fields and keeps order', () => {
  const f = itemToFile(exp, { title: 'T', description: 'D', ogImage: 'O' }, 7);
  const { data, content } = matter(f.text);
  assert.equal(data.date, '2026-08-24');
  assert.deepEqual(data.categories, exp.categories);
  assert.equal(data.image, exp.assetUrl);
  assert.equal(data.sqsOrder, 7);
  assert.equal(data.sqsId, exp.id);
  assert.equal(data.seoTitle, 'T');
  assert.equal(visibleText(content), visibleText(exp.body));
});

test('itemToFile drops lorem-ipsum placeholder excerpts, keeps real ones', () => {
  const lorem = { ...exp, fullUrl: '/team/x', excerpt: '<p>Lorem ipsum dolor sit amet</p>' };
  assert.equal(matter(itemToFile(lorem, {}, 0).text).data.excerpt, '');
  const real = { ...exp, excerpt: '<p>Real summary</p>' };
  assert.equal(matter(itemToFile(real, {}, 0).text).data.excerpt, '<p>Real summary</p>');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/lib/convert.mjs'`.

- [ ] **Step 4: Implement `scripts/lib/convert.mjs`**

```js
import sanitizeHtml from 'sanitize-html';
import matter from 'gray-matter';
import { decodeEntities, visibleText } from './text.mjs';

export const COLLECTIONS = ['experience', 'perspectives', 'team'];

const ALLOWED = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'br', 'blockquote', 'img', 'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub'];
const WRAPPERS = new Set(['div', 'span', 'section', 'article', 'header', 'footer', 'noscript', 'script', 'style', 'picture', 'source', 'svg', 'path', 'g', 'button', 'nav', 'main']);

export function splitFullUrl(fullUrl) {
  const m = fullUrl.match(/^\/([^/]+)\/([^/?#]+)/);
  if (!m || !COLLECTIONS.includes(m[1])) throw new Error(`unexpected fullUrl ${fullUrl}`);
  return { collection: m[1], slug: m[2] };
}

export function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function cleanBody(html) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED,
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
    transformTags: {
      img: (tagName, attribs) => ({
        tagName: 'img',
        attribs: { src: (attribs['data-src'] || attribs.src || '').replace(/^data:.*$/, '').split('?')[0], alt: attribs.alt || '' },
      }),
    },
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
    selfClosing: ['img', 'br', 'hr'],
  }).replace(/\n{3,}/g, '\n\n').trim();
}

export function droppedTags(html) {
  const seen = new Set();
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b/gi)) {
    const t = m[1].toLowerCase();
    if (!ALLOWED.includes(t) && !WRAPPERS.has(t)) seen.add(t);
  }
  return [...seen].sort();
}

export function parseSeo(html) {
  const get = re => decodeEntities((html.match(re) || [])[1] || '').trim();
  return {
    title: get(/<title>([^<]*)<\/title>/i),
    description: get(/<meta\s+name="description"\s+content="([^"]*)"/i),
    ogImage: get(/<meta\s+property="og:image"\s+content="([^"]*)"/i),
  };
}

export function itemToFile(item, seo = {}, order = 0) {
  const { collection, slug } = splitFullUrl(item.fullUrl);
  const excerpt = /lorem ipsum/i.test(visibleText(item.excerpt || '')) ? '' : cleanBody(item.excerpt || '');
  const data = {
    title: item.title,
    date: isoDate(item.publishOn ?? item.addedOn),
    image: item.assetUrl || '',
    categories: item.categories || [],
    sqsTags: item.tags || [],
    excerpt,
    seoTitle: seo.title || '',
    seoDescription: seo.description || '',
    ogImage: seo.ogImage || '',
    sqsId: item.id,
    sqsOrder: order,
  };
  return { path: `src/${collection}/${slug}.md`, slug, text: matter.stringify(cleanBody(item.body || '') + '\n', data) };
}

export function pageToFile(slug, json, seo = {}) {
  const data = {
    title: json.collection?.title || slug,
    seoTitle: seo.title || '',
    seoDescription: seo.description || '',
    ogImage: seo.ogImage || '',
    sqsId: json.collection?.id || '',
  };
  return { path: `src/pages/${slug}.md`, text: matter.stringify(cleanBody(json.mainContent || '') + '\n', data) };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If `cleanBody preserves visible text of real fixtures` fails, the diff shows which Squarespace construct loses text. Extend `ALLOWED` or `WRAPPERS`; never weaken the test.

- [ ] **Step 6: Implement the CLI `scripts/scrape.mjs`**

```js
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ORIGIN } from './lib/inventory.mjs';
import { COLLECTIONS, itemToFile, pageToFile, parseSeo, droppedTags } from './lib/convert.mjs';

async function getJson(path) {
  const res = await fetch(`${ORIGIN}${path}${path.includes('?') ? '&' : '?'}format=json`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}
async function getHtml(path) {
  const res = await fetch(ORIGIN + path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.text();
}

const warnings = [];
let count = 0;
for (const collection of COLLECTIONS) {
  await mkdir(`src/${collection}`, { recursive: true });
  await mkdir(`baseline/raw/${collection}`, { recursive: true });
  let next = `/${collection}`;
  let order = 0;
  while (next) {
    const d = await getJson(next);
    for (const item of d.items) {
      const f = itemToFile(item, parseSeo(await getHtml(item.fullUrl)), order++);
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
```

- [ ] **Step 7: Run it and check the counts**

Run: `npm run scrape`

Then:

```bash
ls src/experience | wc -l; ls src/perspectives | wc -l; ls src/team | wc -l; ls src/pages
```

Expected: counts match the inventory (about 127 to 128, 61 and 32; list pages are not items), and `src/pages` contains `home.md`, `people.md`, `contact.md`, `careers.md` and the other standalone pages. Read `baseline/scrape-warnings.json`: each dropped tag (e.g. `iframe` for an embedded video) becomes an explicit template or allowlist decision in Task 5. None are silently lost.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: extract Squarespace content into Markdown with front matter"
```

---

### Task 3: Images and files

**Files:**
- Create: `scripts/lib/images.mjs`, `scripts/images.mjs`, `tests/images.test.mjs`
- Modify: every `src/**/*.md` (image refs rewritten by the script)
- Output: `src/images/<collection>/*`, `src/s/*` (mirrored non-HTML inventory files), `baseline/images.json`

**Interfaces:**
- Consumes: front matter `image`, `ogImage`, body `<img src>`; `baseline/urls.json` non-HTML 200 entries
- Produces:
  - `originalUrl(u): string`
  - `localName(u, stem): string`
  - `assignNames(refs: Array<{url, stem}>): Map<url, name>`
  - `rewriteRefs(text, map: Map<url, localPath>): string`
  - All image refs in `src/` are site-relative `/images/...`

- [ ] **Step 1: Write the failing tests** in `tests/images.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originalUrl, localName, assignNames, rewriteRefs } from '../scripts/lib/images.mjs';

test('originalUrl forces https and strips format query', () => {
  assert.equal(originalUrl('http://static1.squarespace.com/static/a/b/c.png?format=1500w'), 'https://static1.squarespace.com/static/a/b/c.png');
});

test('localName uses stem and normalized extension', () => {
  assert.equal(localName('https://images.squarespace-cdn.com/x/bleehbleh.png', 'mobohubb-acquired-by-guardhouse'), 'mobohubb-acquired-by-guardhouse.png');
  assert.equal(localName('https://images.squarespace-cdn.com/x/photo.JPEG', 'chad-harding'), 'chad-harding.jpg');
});

test('assignNames: same URL twice -> one name; different URLs, same stem -> suffixed (Review Focus 4)', () => {
  const m = assignNames([
    { url: 'https://images.squarespace-cdn.com/1/image.png', stem: 'acme' },
    { url: 'https://images.squarespace-cdn.com/1/image.png', stem: 'acme' },
    { url: 'https://images.squarespace-cdn.com/2/image.png', stem: 'acme' },
  ]);
  assert.equal(m.size, 2);
  assert.equal(m.get('https://images.squarespace-cdn.com/1/image.png'), 'acme.png');
  assert.equal(m.get('https://images.squarespace-cdn.com/2/image.png'), 'acme-2.png');
});

test('rewriteRefs replaces http, https and ?format variants', () => {
  const map = new Map([['https://images.squarespace-cdn.com/1/a.png', '/images/experience/acme.png']]);
  const text = 'image: https://images.squarespace-cdn.com/1/a.png\n<img src="http://images.squarespace-cdn.com/1/a.png?format=1000w">';
  assert.equal(rewriteRefs(text, map), 'image: /images/experience/acme.png\n<img src="/images/experience/acme.png">');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/lib/images.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/images.mjs`**

```js
export const IMAGE_HOSTS = /https?:\/\/(?:images\.squarespace-cdn\.com|static1\.squarespace\.com)\/[^\s"'<>)?]+(?:\?[^\s"'<>)]*)?/g;

export function originalUrl(u) {
  const url = new URL(u.replace(/^http:/, 'https:'));
  url.search = '';
  return url.toString();
}

export function localName(u, stem) {
  const ext = (new URL(u).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || 'bin').toLowerCase();
  return `${stem}.${ext === 'jpeg' ? 'jpg' : ext}`;
}

export function assignNames(refs) {
  const byUrl = new Map();
  const used = new Set();
  for (const { url, stem } of refs) {
    const key = originalUrl(url);
    if (byUrl.has(key)) continue;
    let name = localName(key, stem);
    for (let n = 2; used.has(name); n++) name = localName(key, `${stem}-${n}`);
    used.add(name);
    byUrl.set(key, name);
  }
  return byUrl;
}

export function rewriteRefs(text, map) {
  return text.replace(IMAGE_HOSTS, m => map.get(originalUrl(m)) ?? m);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement the CLI `scripts/images.mjs`**

```js
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ORIGIN } from './lib/inventory.mjs';
import { IMAGE_HOSTS, originalUrl, assignNames, rewriteRefs } from './lib/images.mjs';

const DIRS = ['experience', 'perspectives', 'team', 'pages'];
const files = [];
for (const d of DIRS) for (const f of await readdir(`src/${d}`)) if (f.endsWith('.md')) files.push({ dir: d, path: `src/${d}/${f}`, slug: f.replace(/\.md$/, '') });

const refs = [];
for (const f of files) {
  const text = await readFile(f.path, 'utf8');
  [...text.matchAll(IMAGE_HOSTS)].forEach((m, i) => refs.push({ url: m[0], stem: i === 0 ? f.slug : `${f.slug}-${i + 1}`, dir: f.dir }));
}
const names = assignNames(refs);
const dirOf = new Map(refs.map(r => [originalUrl(r.url), r.dir]));
const localPath = new Map([...names].map(([url, name]) => [url, `/images/${dirOf.get(url)}/${name}`]));

async function download(url, dest, tries = 3) {
  try { await access(dest); return 'cached'; } catch {}
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url);
    if (res.ok) {
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return res.headers.get('content-type');
    }
    if (i === tries) throw new Error(`${res.status} ${url}`);
  }
}

const manifest = {};
for (const [url, path] of localPath) manifest[url] = { local: path, type: await download(url, `src${path}`) };
for (const f of files) await writeFile(f.path, rewriteRefs(await readFile(f.path, 'utf8'), localPath));

const urls = JSON.parse(await readFile('baseline/urls.json', 'utf8'));
for (const u of urls.filter(u => u.status === 200 && u.type !== 'text/html')) {
  manifest[ORIGIN + u.path] = { local: u.path, type: await download(ORIGIN + u.path, `src${decodeURIComponent(u.path)}`) };
}
await writeFile('baseline/images.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`${Object.keys(manifest).length} assets`);
```

- [ ] **Step 6: Run it and check for leftovers**

Run: `npm run images`, then `grep -rlE 'squarespace-cdn|static1\.squarespace' src/ || echo CLEAN`
Expected: `CLEAN`. Every manifest `type` is `image/*` or the file's real type. None is `text/html`, which would mean an error page was saved as an image.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: mirror images and files locally with descriptive names"
```

---

### Task 4: Eleventy config, URL routing and coverage

**Files:**
- Also do first: implement Task 8 Steps 1 to 5 (`scripts/lib/smoke.mjs`, `scripts/smoke.mjs`, `tests/smoke.test.mjs`) at the start of this task, because Step 13 needs the smoke checker. Task 8 then skips those steps.
- Create: `eleventy.config.mjs`, `src/{experience,perspectives,team,pages}/*.11tydata.js`, `src/category.njk`, `src/_redirects`, `scripts/lib/resolve.mjs`, `scripts/serve.mjs`, `tests/resolve.test.mjs`, `tests/coverage.test.mjs`
- Create (minimal, replaced in Task 5): `src/_includes/layouts/base.njk` containing `<!doctype html><title>{{ title }}</title>{{ content | safe }}`, and `tombstone.njk`, `post.njk`, `bio.njk`, `list.njk`, `page.njk`, `home.njk`, each containing `---\nlayout: layouts/base.njk\n---\n{{ content | safe }}`

**Interfaces:**
- Consumes: front matter from Task 2
- Produces:
  - collections `experience`, `perspectives`, `team` (sorted by `sqsOrder`) and `categoryPages: Array<{ collection, category }>`
  - filters `canonicalPath(url)` (strips the trailing slash, matching the old site's URL form), `isoDay(date)`, `monthDay(date)`, `inCategory(items, cat)`, `categoryPath(cat)`, `categoryHref(cat)`
  - `resolveFile(root, urlPath): string | null`
  - `parseRedirects(text): Array<{ from, to, status }>`
  - `matchRedirect(rules, urlPath): rule | null`
  - `node scripts/serve.mjs [port=8080]` serves `_site` with Netlify-like resolution

- [ ] **Step 1: Write the failing tests** in `tests/resolve.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFile, parseRedirects, matchRedirect } from '../scripts/lib/resolve.mjs';

const root = mkdtempSync(join(tmpdir(), 'site-'));
mkdirSync(join(root, 'team/chad-harding'), { recursive: true });
mkdirSync(join(root, 'experience/category/Merger+&+Acquisition'), { recursive: true });
writeFileSync(join(root, 'index.html'), 'home');
writeFileSync(join(root, 'team/chad-harding/index.html'), 'bio');
writeFileSync(join(root, 'experience/category/Merger+&+Acquisition/index.html'), 'cat');

test('resolves /, extensionless and trailing-slash forms (Review Focus 2)', () => {
  assert.equal(resolveFile(root, '/'), join(root, 'index.html'));
  assert.equal(resolveFile(root, '/team/chad-harding'), join(root, 'team/chad-harding/index.html'));
  assert.equal(resolveFile(root, '/team/chad-harding/'), join(root, 'team/chad-harding/index.html'));
});

test('resolves percent-encoded category paths (Review Focus 1)', () => {
  assert.equal(resolveFile(root, '/experience/category/Merger+%26+Acquisition'), join(root, 'experience/category/Merger+&+Acquisition/index.html'));
});

test('returns null for missing pages and path traversal', () => {
  assert.equal(resolveFile(root, '/nope'), null);
  assert.equal(resolveFile(root, '/../etc/passwd'), null);
});

test('parseRedirects and matchRedirect', () => {
  const rules = parseRedirects('# comment\n/home   /   301\n/old-page /new-page 301\n');
  assert.deepEqual(matchRedirect(rules, '/home'), { from: '/home', to: '/', status: 301 });
  assert.deepEqual(matchRedirect(rules, '/home/'), { from: '/home', to: '/', status: 301 });
  assert.equal(matchRedirect(rules, '/x'), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/lib/resolve.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/resolve.mjs`**

```js
import { existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

export function resolveFile(root, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  const base = resolve(root);
  const trimmed = p.length > 1 ? p.replace(/\/+$/, '') : p;
  const candidates = trimmed === '/' ? ['index.html'] : [trimmed, `${trimmed}.html`, `${trimmed}/index.html`];
  for (const c of candidates) {
    const full = resolve(join(base, c));
    if (!full.startsWith(base + sep)) return null;
    if (isFile(full)) return full;
  }
  return null;
}

export function parseRedirects(text) {
  return text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
    const [from, to, status = '301'] = l.split(/\s+/);
    return { from, to, status: Number(status) };
  });
}

export function matchRedirect(rules, urlPath) {
  const p = urlPath.length > 1 ? urlPath.replace(/\/+$/, '') : urlPath;
  return rules.find(r => r.from === p || r.from === decodeURIComponent(p)) || null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write `eleventy.config.mjs`**

```js
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/images': 'images', 'src/assets': 'assets', 'src/s': 's', 'src/_redirects': '_redirects' });

  for (const c of ['experience', 'perspectives', 'team']) {
    eleventyConfig.addCollection(c, api => api.getFilteredByGlob(`src/${c}/*.md`).sort((a, b) => a.data.sqsOrder - b.data.sqsOrder));
  }
  eleventyConfig.addCollection('categoryPages', api => {
    const out = [];
    for (const c of ['experience', 'perspectives', 'team']) {
      const cats = new Set();
      for (const p of api.getFilteredByGlob(`src/${c}/*.md`)) for (const cat of p.data.categories || []) cats.add(cat);
      for (const category of [...cats].sort()) {
        if (category.includes('/')) throw new Error(`category contains "/": ${category}`);
        out.push({ collection: c, category });
      }
    }
    return out;
  });

  eleventyConfig.addFilter('canonicalPath', u => (u === '/' ? '/' : u.replace(/\/$/, '')));
  eleventyConfig.addFilter('isoDay', d => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter('monthDay', d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
  eleventyConfig.addFilter('inCategory', (items, cat) => items.filter(i => (i.data.categories || []).includes(cat)));
  eleventyConfig.addFilter('categoryPath', cat => cat.replace(/ /g, '+'));
  eleventyConfig.addFilter('categoryHref', cat => encodeURIComponent(cat).replace(/%20/g, '+'));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: false,
    htmlTemplateEngine: 'njk',
  };
}
```

- [ ] **Step 6: Write the directory data files.** Each file is one `export default`. Slugs come from filenames, so the file name IS the URL.

`src/experience/experience.11tydata.js`:
```js
export default { layout: 'layouts/tombstone.njk', permalink: data => `/experience/${data.page.fileSlug}/` };
```

`src/perspectives/perspectives.11tydata.js`:
```js
export default { layout: 'layouts/post.njk', permalink: data => `/perspectives/${data.page.fileSlug}/` };
```

`src/team/team.11tydata.js`:
```js
export default { layout: 'layouts/bio.njk', permalink: data => `/team/${data.page.fileSlug}/` };
```

`src/pages/pages.11tydata.js`:
```js
export default {
  layout: 'layouts/page.njk',
  permalink: data => (data.page.fileSlug === 'home' ? '/' : `${data.page.filePathStem.replace(/^\/pages/, '')}/`),
};
```

- [ ] **Step 7: Write the list and category templates**

`src/experience.njk`:
```njk
---
layout: layouts/list.njk
permalink: /experience/
listCollection: experience
title: Transactions
---
```

`src/perspectives.njk`:
```njk
---
layout: layouts/list.njk
permalink: /perspectives/
listCollection: perspectives
title: Perspectives
---
```

`src/category.njk`:
```njk
---
pagination:
  data: collections.categoryPages
  size: 1
  alias: entry
permalink: "/{{ entry.collection }}/category/{{ entry.category | categoryPath }}/"
layout: layouts/list.njk
eleventyComputed:
  title: "{{ entry.category }}"
  listCollection: "{{ entry.collection }}"
  listCategory: "{{ entry.category }}"
---
```

Set the `title` of each list page to the old page's `<title>` prefix, read from `baseline/raw` or the live site.

- [ ] **Step 8: Write `src/_redirects`**

```
# Netlify redirects. Format: from  to  status. Status 200 = rewrite (serve target, keep URL).
# /home returns 200 on the old site, so it is a rewrite, not a redirect.
/home  /index.html  200
```

Append every Squarespace URL Mapping from `baseline/squarespace-settings.md`, converting `/old -> /new 301` to `/old  /new  301`.

- [ ] **Step 9: Write the failing coverage test** `tests/coverage.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolveFile, parseRedirects, matchRedirect } from '../scripts/lib/resolve.mjs';

test('every baseline 200/3xx URL is served by _site or _redirects', () => {
  assert.ok(existsSync('_site/index.html'), 'run `npm run build` first');
  const urls = JSON.parse(readFileSync('baseline/urls.json', 'utf8'));
  const rules = parseRedirects(readFileSync('src/_redirects', 'utf8'));
  const missing = urls
    .filter(u => u.status === 200 || (u.status >= 300 && u.status < 400))
    .filter(u => !resolveFile('_site', u.path) && !matchRedirect(rules, u.path))
    .map(u => u.path);
  assert.deepEqual(missing, []);
});
```

- [ ] **Step 10: Build and run the coverage test**

Run: `npm run build && npm test`
Expected: first run FAILS, listing the missing paths. For each one, add the page, a category, or a redirect. Never delete from `baseline/urls.json`. Re-run until it PASSES with `missing = []`.

- [ ] **Step 11: Implement `scripts/serve.mjs`**, the local Netlify-like server used by `verify`

```js
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { resolveFile, parseRedirects, matchRedirect } from './lib/resolve.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.webp': 'image/webp', '.gif': 'image/gif' };
const rules = existsSync('_site/_redirects') ? parseRedirects(readFileSync('_site/_redirects', 'utf8')) : [];

export function start(port = 8080) {
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const r = matchRedirect(rules, path);
    if (r && r.status !== 200) { res.writeHead(r.status, { location: r.to }); return res.end(); }
    const file = resolveFile('_site', r ? r.to : path);
    if (!file) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 8080);
  await start(port);
  console.log(`http://localhost:${port}`);
}
```

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "feat: Eleventy routing with pinned slugs and URL coverage test"
```

- [ ] **Step 13: Prove the routing on real Netlify (throwaway deploy).** Local coverage passes by construction, because `resolveFile` tries every form. Netlify's own resolution is what matters, so test it now with the placeholder layouts, before building any templates. Chad opens `https://app.netlify.com/drop` in the Browser pane, logged into the PEAK Netlify account, and drags in `~/peak-website/_site`. Then run:

```bash
node scripts/smoke.mjs https://<drop-site>.netlify.app
```

Expected: `N/N OK`. The cases that matter are `/experience`, `/perspectives` and `/people` (each a page with a same-named directory), both slash forms of `/team/chad-harding`, and `/experience/category/Merger+%26+Acquisition`. If the encoded category paths fail, add the per-category `200` rewrites to `src/_redirects` (format in Task 8 Step 8), rebuild and re-drop until the run passes. Chad deletes the throwaway site afterwards. Record the result in the commit message of the next task.

---

### Task 5: Templates, styles and fonts (the visual replica)

**Files:**
- Create: `scripts/probe-styles.mjs`, `baseline/styles.json`, `src/_data/site.json`, `src/assets/css/site.css`, `src/assets/fonts/*`, `src/images/brand/*`
- Replace: `src/_includes/layouts/{base,tombstone,post,bio,list,page,home,people,contact}.njk`, `src/_includes/partials/{header,footer}.njk`
- Test: `tests/build.test.mjs`

**Interfaces:**
- Consumes: collections, filters, front matter fields, `baseline/raw/pages/*.html`
- Produces:
  - `site.json` with `{ url, name, nav: [{label, href}], footer: { locations, phone, email }, social: [{label, href}] }`
  - Every page carries: `<header class="site-header">`, `<main>` with exactly one `<h1>`, `<footer class="site-footer">`, `<title>` equal to `seoTitle` when set, and `<meta name="description">` equal to `seoDescription` when set.

- [ ] **Step 1: Write `scripts/probe-styles.mjs`**, which records the live site's computed styles as the CSS reference

```js
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const PAGES = ['/', '/experience', '/experience/mobohubb-acquired-by-guardhouse', '/perspectives', '/people', '/team/chad-harding', '/contact', '/careers'];
const SELECTORS = ['body', 'header', 'header nav a', '.header-title-logo img', 'h1', 'h2', 'h3', 'h4', 'p', 'a', '.sqs-block-button-element', 'footer', 'footer p', '.blog-item-content', '.summary-item', '.blog-basic-grid'];
const PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'color', 'background-color', 'padding', 'margin', 'max-width', 'width', 'height', 'border', 'gap', 'display', 'grid-template-columns'];

const browser = await chromium.launch();
const out = {};
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  for (const p of PAGES) {
    await page.goto(`https://www.peak-tech.com${p}`, { waitUntil: 'networkidle' });
    out[`${width}${p}`] = await page.evaluate(({ SELECTORS, PROPS }) => Object.fromEntries(SELECTORS.map(s => {
      const el = document.querySelector(s);
      if (!el) return [s, null];
      const cs = getComputedStyle(el);
      return [s, Object.fromEntries(PROPS.map(k => [k, cs.getPropertyValue(k)]))];
    })), { SELECTORS, PROPS });
    await page.screenshot({ path: `baseline/raw/ref-${width}${p.replace(/\//g, '_') || '_home'}.png`, fullPage: true });
  }
}
await browser.close();
await writeFile('baseline/styles.json', JSON.stringify(out, null, 2) + '\n');
```

Run: `npm run probe`
Expected: `baseline/styles.json` is written, and the reference screenshots land in `baseline/raw/`.

- [ ] **Step 2: Install fonts and brand assets.** Copy Chad's Aktiv Grotesk files into `src/assets/fonts/` and convert to WOFF2 if needed (`npx ttf2woff2 < in.ttf > out.woff2`). Copy the vector logo into `src/images/brand/peak-logo.svg`. If fonts have not arrived, continue with `font-family: "aktiv-grotesk", "Helvetica Neue", Arial, sans-serif`; visual sign-off in Task 7 is blocked until they arrive.

- [ ] **Step 3: Write the failing build test** `tests/build.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

function htmlFiles(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}
const pages = htmlFiles('_site');
const read = p => readFileSync(p, 'utf8');

test('every page has header, main, footer and exactly one h1', () => {
  for (const p of pages) {
    const h = read(p);
    assert.match(h, /<header class="site-header"/, p);
    assert.match(h, /<main\b/, p);
    assert.match(h, /<footer class="site-footer"/, p);
    assert.equal((h.match(/<h1\b/g) || []).length, 1, `${p} h1 count`);
  }
});

test('no Squarespace or Typekit references survive in output', () => {
  for (const p of pages) assert.doesNotMatch(read(p), /squarespace-cdn\.com|static1\.squarespace\.com|use\.typekit\.net/, p);
});

test('SEO title and description carry over for a sample of each type', () => {
  for (const [src, out] of [['src/team/chad-harding.md', '_site/team/chad-harding/index.html'], ['src/experience/mobohubb-acquired-by-guardhouse.md', '_site/experience/mobohubb-acquired-by-guardhouse/index.html']]) {
    const { data } = matter(read(src));
    const h = read(out);
    if (data.seoTitle) assert.ok(h.includes(`<title>${data.seoTitle.replace(/&/g, '&amp;')}</title>`), `${out} title`);
    if (data.seoDescription) assert.ok(h.includes(`content="${data.seoDescription.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`), `${out} description`);
  }
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm run build && npm test`
Expected: FAIL on `site-header` (the placeholder layouts have none).

- [ ] **Step 5: Write `src/_data/site.json`** from the live header and footer. The nav labels and order come from the home page header. Locations, phone and email are transcribed verbatim from the footer. Social hrefs come from the footer icons.

```json
{
  "url": "https://www.peak-tech.com",
  "name": "Peak Technology Partners",
  "nav": [
    { "label": "TRANSACTIONS", "href": "/experience" }
  ],
  "footer": { "locations": [], "phone": "", "email": "" },
  "social": []
}
```

Fill every array and field from the live site. The build test in Step 9 compares visible text, so an empty field fails verification.

- [ ] **Step 6: Write `src/_includes/layouts/base.njk`**

```njk
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ seoTitle or (title ~ " — " ~ site.name) }}</title>
  {% if seoDescription %}<meta name="description" content="{{ seoDescription }}">{% endif %}
  <link rel="canonical" href="{{ site.url }}{{ page.url | canonicalPath }}">
  <meta property="og:title" content="{{ seoTitle or title }}">
  {% if ogImage or image %}<meta property="og:image" content="{{ site.url }}{{ ogImage or image }}">{% endif %}
  <link rel="preload" href="/assets/fonts/aktiv-grotesk-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/site.css">
  {% include "partials/head-injection.njk" ignore missing %}
</head>
<body class="{{ bodyClass or '' }}">
  {% include "partials/header.njk" %}
  <main>{{ content | safe }}</main>
  {% include "partials/footer.njk" %}
</body>
</html>
```

The `" — "` separator in the fallback title reproduces Squarespace's existing title format verbatim. It is migrated behavior, not new copy.

- [ ] **Step 7: Write the partials and page layouts**

`src/_includes/partials/header.njk`:
```njk
<header class="site-header">
  <a class="site-logo" href="/"><img src="/images/brand/peak-logo.svg" alt="{{ site.name }}"></a>
  <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menu">
  <label for="nav-toggle" class="nav-burger"><span></span></label>
  <nav class="site-nav">
    {% for item in site.nav %}<a href="{{ item.href }}"{% if page.url.startsWith(item.href) %} aria-current="page"{% endif %}>{{ item.label }}</a>{% endfor %}
  </nav>
</header>
```

`src/_includes/partials/footer.njk`:
```njk
<footer class="site-footer">
  <div class="footer-col"><h4>LOCATIONS</h4>{% for l in site.footer.locations %}<p>{{ l }}</p>{% endfor %}</div>
  <div class="footer-col"><h4>PHONE</h4><p><a href="tel:{{ site.footer.phone | replace(' ', '') }}">{{ site.footer.phone }}</a></p></div>
  <div class="footer-col"><h4>EMAIL</h4><p><a href="mailto:{{ site.footer.email }}">{{ site.footer.email }}</a></p></div>
  <div class="footer-social">{% for s in site.social %}<a href="{{ s.href }}" aria-label="{{ s.label }}">{{ s.label }}</a>{% endfor %}</div>
</footer>
```

Adjust the footer headings and structure to the live footer's exact text and order. Verify with the Task 7 text diff.

`src/_includes/layouts/tombstone.njk`:
```njk
---
layout: layouts/base.njk
bodyClass: item tombstone
---
<article class="item">
  <p class="item-meta"><time datetime="{{ date | isoDay }}">{{ date | monthDay }}</time></p>
  <h1 class="item-title">{{ title }}</h1>
  {% if image %}<img class="item-image" src="{{ image }}" alt="{{ title }}">{% endif %}
  <div class="item-body">{{ content | safe }}</div>
  {% if categories.length %}<p class="item-categories">{% for c in categories %}<a href="/experience/category/{{ c | categoryHref }}">{{ c }}</a>{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}
</article>
```

`src/_includes/layouts/post.njk`:
```njk
---
layout: layouts/base.njk
bodyClass: item post
---
<article class="item">
  <p class="item-meta"><time datetime="{{ date | isoDay }}">{{ date | monthDay }}</time></p>
  <h1 class="item-title">{{ title }}</h1>
  {% if image %}<img class="item-image" src="{{ image }}" alt="{{ title }}">{% endif %}
  <div class="item-body">{{ content | safe }}</div>
  {% if categories.length %}<p class="item-categories">{% for c in categories %}<a href="/perspectives/category/{{ c | categoryHref }}">{{ c }}</a>{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}
</article>
```

`src/_includes/layouts/bio.njk`:
```njk
---
layout: layouts/base.njk
bodyClass: item bio
---
<article class="item">
  <p class="item-meta"><time datetime="{{ date | isoDay }}">{{ date | monthDay }}</time></p>
  <h1 class="item-title">{{ title }}</h1>
  {% if image %}<img class="item-image" src="{{ image }}" alt="{{ title }}">{% endif %}
  <div class="item-body">{{ content | safe }}</div>
  {% if categories.length %}<p class="item-categories">{% for c in categories %}<a href="/team/category/{{ c | categoryHref }}">{{ c }}</a>{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}
</article>
```

The three item layouts start identical on purpose. Each is then adjusted to its live page type's markup order (for example, bios may show no date). The Task 7 diff decides.

`src/_includes/layouts/list.njk`:
```njk
---
layout: layouts/base.njk
bodyClass: list
---
{% set items = collections[listCollection] %}
{% if listCategory %}{% set items = items | inCategory(listCategory) %}{% endif %}
<h1 class="list-title">{{ title }}</h1>
<div class="list-grid">
  {% for item in items %}
  <a class="list-card" href="{{ item.url | canonicalPath }}">
    {% if item.data.image %}<img src="{{ item.data.image }}" alt="{{ item.data.title }}" loading="lazy">{% endif %}
    <h2 class="list-card-title">{{ item.data.title }}</h2>
    {% if item.data.excerpt %}<div class="list-card-excerpt">{{ item.data.excerpt | safe }}</div>{% endif %}
  </a>
  {% endfor %}
</div>
```

`src/_includes/layouts/page.njk`:
```njk
---
layout: layouts/base.njk
bodyClass: page
---
{{ content | safe }}
```

Standalone pages whose body has no `<h1>` get the title rendered as `<h1 class="page-title">` only if the live page shows one. Check against the reference screenshot. If the live page has no visible h1, the build test's one-h1 rule is met with a visually hidden `<h1 class="sr-only">{{ title }}</h1>`.

- [ ] **Step 8: Hand-build the three composed pages.** Their copy goes in front matter so edits stay simple. Transcribe from `baseline/raw/pages/{home,people,contact}.html` and the reference screenshots.
  - `home.njk` (set `layout: layouts/home.njk` in `src/pages/home.md`): hero (`heroTitle`, `heroText`, `heroImage`), the three pillars (`pillars: [{title, text}]` with Entrepreneurial, Dedicated, Aligned), "Our Approach" (`approachTitle`, `approachText`, `approachCta`), then the latest Perspectives, rendered from `collections.perspectives` with the same count as live.
  - `people.njk` (`src/pages/people.md`): a team grid from `collections.team` in `sqsOrder`, with the same card fields as live (photo, name, title category). No excerpt, matching the live Summary block.
  - `contact.njk` (`src/pages/contact.md`): the copy only. The form and Calendly embed are added in Task 6.

  Move the transcribed copy out of the Markdown body into front matter for these three pages. The body stays empty.

- [ ] **Step 9: Write `src/assets/css/site.css`** from `baseline/styles.json`
  - `@font-face` for each Aktiv Grotesk weight present on the live site. Poppins is self-hosted too: download its WOFF2 files from Google Fonts into `src/assets/fonts/` so no third-party font call remains.
  - `:root` tokens for every distinct color, font size and spacing value in `styles.json` (orange accent, grays, text colors).
  - Global `h1` sized to the live site's large heading size. `.item-title` carries the 16px tombstone title style, so the global H1 is no longer pinned to 16px.
  - Mobile rules at the live breakpoint, with the checkbox-driven burger menu (no JavaScript).
  - Reproduce spacing by matching `styles.json` values; Task 7's pixel diff is the judge.

- [ ] **Step 10: Run the build test**

Run: `npm run build && npm test`
Expected: PASS for all tests, including coverage from Task 4. If a page fails the one-h1 rule because its migrated body contains its own `<h1>`, change that `<h1>` to `<h2 class="body-h1">` in that one file and style `.body-h1` like the live h1, so the visible result is unchanged.

- [ ] **Step 11: Eyeball three page types locally.** Run `npm run serve`, then open `http://localhost:8080/`, `/experience/mobohubb-acquired-by-guardhouse` and `/team/chad-harding` in the Browser pane at desktop and mobile widths, next to the live pages. Fix gross layout errors now; fine alignment waits for Task 7.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "feat: templates, styles and self-hosted fonts reproducing the live design"
```

---

### Task 6: Integrations (analytics, head injection, form, Calendly, noindex)

**Files:**
- Create: `src/_data/env.js`, `src/_includes/partials/analytics.njk`, `src/_includes/partials/head-injection.njk`, `src/contact-thanks.njk`
- Modify: `src/_includes/layouts/base.njk`, `src/_includes/layouts/contact.njk`, `src/_data/site.json` (add `gaId`, `gtmId`, `calendlyUrl`)
- Test: `tests/build.test.mjs` (append)

**Interfaces:**
- Consumes: `baseline/squarespace-settings.md` (code injection, form fields, recipients, GA/GTM IDs)
- Produces:
  - `env.context: 'production' | 'deploy-preview' | 'branch-deploy' | 'dev'`
  - A Netlify form named `contact`, posting to `/contact-thanks`

- [ ] **Step 1: Append the failing tests** to `tests/build.test.mjs`

```js
import { execSync } from 'node:child_process';

test('contact form posts without JavaScript and is Netlify-detectable (Review Focus 5)', () => {
  const h = read('_site/contact/index.html');
  const form = h.match(/<form\b[^>]*>/)[0];
  assert.match(form, /name="contact"/);
  assert.match(form, /method="POST"/i);
  assert.match(form, /action="\/contact-thanks"/);
  assert.match(form, /data-netlify="true"/);
  assert.match(form, /netlify-honeypot="bot-field"/);
  assert.match(h, /<input[^>]+name="form-name"[^>]+value="contact"/);
  const body = h.slice(h.indexOf(form), h.indexOf('</form>'));
  for (const m of body.matchAll(/<(input|textarea|select)\b[^>]*>/g)) {
    if (/type="(submit|hidden)"/.test(m[0]) || /name="bot-field"/.test(m[0])) continue;
    assert.match(m[0], /\bname="[^"]+"/, `field without name: ${m[0]}`);
  }
});

test('non-production builds are noindex and load no analytics; production is the reverse', () => {
  execSync('npx @11ty/eleventy --quiet', { env: { ...process.env, CONTEXT: 'branch-deploy' } });
  let h = read('_site/index.html');
  assert.match(h, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(h, /googletagmanager\.com/);
  execSync('npx @11ty/eleventy --quiet', { env: { ...process.env, CONTEXT: 'production' } });
  h = read('_site/index.html');
  assert.doesNotMatch(h, /noindex/);
  assert.match(h, /googletagmanager\.com\/gtag\/js\?id=G-3K4D2PRNEL/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run build && npm test`
Expected: FAIL (`_site/contact/index.html` has no form yet).

- [ ] **Step 3: Write `src/_data/env.js`**

```js
export default { context: process.env.CONTEXT || 'dev' };
```

- [ ] **Step 4: Write `src/_includes/partials/analytics.njk`**

```njk
{% if env.context == 'production' %}
<script async src="https://www.googletagmanager.com/gtag/js?id={{ site.gaId }}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','{{ site.gaId }}');</script>
{% if site.gtmId %}<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','{{ site.gtmId }}');</script>{% endif %}
{% else %}
<meta name="robots" content="noindex">
{% endif %}
```

Add `"gaId": "G-3K4D2PRNEL"` and `"gtmId"` (the captured ID, or `""`) to `site.json`. Include the partial in `base.njk`'s `<head>`, just before `head-injection`.

- [ ] **Step 5: Write `src/_includes/partials/head-injection.njk`.** Paste the Squarespace Header Code Injection verbatim, minus anything that is Squarespace-only or duplicates `analytics.njk` (such as a second gtag). Record each removal in a comment at the top of the file. If the injection was empty, the file holds only that comment. Handle any Footer injection the same way in a `partials/footer-injection.njk` included before `</body>`.

- [ ] **Step 6: Write the contact layout's form**, using the exact labels, types, required flags and button text from `baseline/squarespace-settings.md`. Example with Name, Email and Message; replace these with the captured fields:

```njk
<form name="contact" method="POST" action="/contact-thanks" data-netlify="true" netlify-honeypot="bot-field" class="contact-form">
  <input type="hidden" name="form-name" value="contact">
  <p class="hp"><label>Leave blank <input name="bot-field"></label></p>
  <label>Name <span>(required)</span><input type="text" name="name" required></label>
  <label>Email <span>(required)</span><input type="email" name="email" required></label>
  <label>Message <span>(required)</span><textarea name="message" required></textarea></label>
  <button type="submit">Submit</button>
</form>
```

Add `.hp { position:absolute; left:-9999px; }` to `site.css`. Add the Calendly embed exactly as it appears in `baseline/raw/pages/contact.html` (inline widget `div` plus `https://assets.calendly.com/assets/external/widget.js`), with `site.calendlyUrl` as its URL.

- [ ] **Step 7: Write `src/contact-thanks.njk`** with the Squarespace post-submit message verbatim

```njk
---
layout: layouts/page.njk
permalink: /contact-thanks/
title: Thank you
---
<h1 class="page-title">Thank you</h1>
<p>REPLACE_WITH_CAPTURED_POST_SUBMIT_MESSAGE</p>
```

Replace the paragraph with the captured message before committing. `grep -r REPLACE_WITH src/` must return nothing.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm run build && npm test && grep -r REPLACE_WITH src/ ; echo "exit $?"`
Expected: all tests PASS. The grep prints nothing and `exit 1`.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: analytics, code injection, Netlify contact form, Calendly, noindex off-production"
```

---

### Task 7: Fidelity verification and the review report

**Files:**
- Create: `scripts/lib/compare.mjs`, `scripts/verify.mjs`, `tests/compare.test.mjs`
- Output: `reports/fidelity.html`, `reports/fidelity.json`, `baseline/shots/**`

**Interfaces:**
- Consumes: `baseline/urls.json`, `start()` from `scripts/serve.mjs`
- Produces:
  - `normalizeText(s): string`
  - `firstDifference(a, b): null | { index, old, new }`
  - `diffRatio(pngA, pngB): { ratio, heightDelta }`
  - `classify(result, opts?): { status: 'match' | 'flag', reasons: string[] }`
  - CLI: `node scripts/verify.mjs [newBase=http://localhost:8080] [--only=/path,...] [--refresh-old]`. The old site is captured once into `baseline/shots/*-old.{png,txt}` and reused, so the baseline stays fixed and repeat runs take half the time. Pass `--refresh-old` only after the drift check (Task 9) re-scrapes changed items.

- [ ] **Step 1: Write the failing tests** in `tests/compare.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { normalizeText, firstDifference, diffRatio, classify } from '../scripts/lib/compare.mjs';

function solid(w, h, rgb) {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) p.data.set([...rgb, 255], i * 4);
  return p;
}

test('normalizeText collapses whitespace and nbsp but keeps punctuation exact', () => {
  assert.equal(normalizeText('  A  “quote”\n\n—  B '), 'A “quote” — B');
});

test('firstDifference returns null for equal and context for unequal', () => {
  assert.equal(firstDifference('abc', 'abc'), null);
  const d = firstDifference('hello world', 'hello there');
  assert.equal(d.index, 6);
  assert.match(d.old, /world/);
  assert.match(d.new, /there/);
});

test('diffRatio is 0 for identical, ~1 for opposite, pads different heights', () => {
  assert.equal(diffRatio(solid(10, 10, [0, 0, 0]), solid(10, 10, [0, 0, 0])).ratio, 0);
  assert.ok(diffRatio(solid(10, 10, [0, 0, 0]), solid(10, 10, [255, 255, 255])).ratio > 0.99);
  const r = diffRatio(solid(10, 10, [0, 0, 0]), solid(10, 20, [0, 0, 0]));
  assert.equal(r.heightDelta, 0.5);
});

test('classify flags text differences, high pixel ratio and height drift', () => {
  assert.equal(classify({ text: null, desktop: { ratio: 0.001, heightDelta: 0 }, mobile: { ratio: 0.001, heightDelta: 0 } }).status, 'match');
  const c = classify({ text: { index: 1, old: 'a', new: 'b' }, desktop: { ratio: 0.05, heightDelta: 0.1 }, mobile: { ratio: 0, heightDelta: 0 } });
  assert.equal(c.status, 'flag');
  assert.deepEqual(c.reasons, ['text differs', 'desktop pixels 5.0%', 'desktop height 10.0%']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/lib/compare.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/compare.mjs`**

```js
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export function normalizeText(s) {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function firstDifference(a, b) {
  if (a === b) return null;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { index: i, old: a.slice(Math.max(0, i - 40), i + 60), new: b.slice(Math.max(0, i - 40), i + 60) };
}

function pad(png, w, h) {
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

export function diffRatio(a, b) {
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const diff = pixelmatch(pad(a, w, h).data, pad(b, w, h).data, null, w, h, { threshold: 0.1 });
  return { ratio: diff / (w * h), heightDelta: Math.abs(a.height - b.height) / h };
}

export function classify(r, { maxRatio = 0.02, maxHeightDelta = 0.05 } = {}) {
  const reasons = [];
  if (r.text) reasons.push('text differs');
  for (const k of ['desktop', 'mobile']) {
    if (r[k].ratio > maxRatio) reasons.push(`${k} pixels ${(r[k].ratio * 100).toFixed(1)}%`);
    if (r[k].heightDelta > maxHeightDelta) reasons.push(`${k} height ${(r[k].heightDelta * 100).toFixed(1)}%`);
  }
  return { status: reasons.length ? 'flag' : 'match', reasons };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement `scripts/verify.mjs`**

```js
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { ORIGIN } from './lib/inventory.mjs';
import { normalizeText, firstDifference, diffRatio, classify } from './lib/compare.mjs';
import { start } from './serve.mjs';

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
let newBase = args.find(a => a.startsWith('http'));
let server;
if (!newBase) { server = await start(8080); newBase = 'http://localhost:8080'; }

const urls = JSON.parse(await readFile('baseline/urls.json', 'utf8'))
  .filter(u => u.status === 200 && u.type === 'text/html')
  .filter(u => !only.length || only.includes(u.path));

const browser = await chromium.launch();
const refreshOld = args.includes('--refresh-old');
async function captureOld(path, width, tag, k) {
  const png = `baseline/shots/${tag}-${k}-old.png`, txt = `baseline/shots/${tag}-${k}-old.txt`;
  if (!refreshOld) {
    try { return { png: PNG.sync.read(await readFile(png)), text: await readFile(txt, 'utf8'), cached: true }; } catch {}
  }
  const o = await capture(ORIGIN, path, width);
  await writeFile(png, PNG.sync.write(o.png));
  await writeFile(txt, o.text);
  return o;
}
async function capture(base, path, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } window.scrollTo(0, 0); });
  await page.waitForLoadState('networkidle');
  const text = normalizeText(await page.evaluate(() => document.body.innerText));
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  await page.close();
  return { text, png };
}

const results = [];
await mkdir('baseline/shots', { recursive: true });
await mkdir('reports', { recursive: true });
for (const u of urls) {
  const r = { path: u.path };
  const tag = u.path.replace(/[^a-z0-9]+/gi, '_') || '_home';
  for (const [k, width] of [['desktop', 1440], ['mobile', 390]]) {
    const o = await captureOld(u.path, width, tag, k);
    const n = await capture(newBase, u.path, width);
    if (k === 'desktop') r.text = firstDifference(o.text, n.text);
    r[k] = diffRatio(o.png, n.png);
    await writeFile(`baseline/shots/${tag}-${k}-new.png`, PNG.sync.write(n.png));
    r[`${k}Shots`] = [`../baseline/shots/${tag}-${k}-old.png`, `../baseline/shots/${tag}-${k}-new.png`];
  }
  Object.assign(r, classify(r));
  results.push(r);
  console.log(`${r.status.padEnd(5)} ${u.path} ${r.reasons.join('; ')}`);
}
await browser.close();
server?.close();

const flagged = results.filter(r => r.status === 'flag');
await writeFile('reports/fidelity.json', JSON.stringify(results, null, 2));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
await writeFile('reports/fidelity.html', `<!doctype html><meta charset="utf-8"><title>Fidelity report</title>
<style>body{font:14px system-ui;margin:24px}img{width:48%;border:1px solid #ccc}section{margin:32px 0;border-top:2px solid #eee}code{background:#f4f4f4}</style>
<h1>Fidelity: ${results.length - flagged.length} match, ${flagged.length} flagged</h1>
${flagged.map(r => `<section><h2><code>${esc(r.path)}</code></h2><p>${esc(r.reasons.join('; '))}</p>
${r.text ? `<p><b>Old:</b> ${esc(r.text.old)}<br><b>New:</b> ${esc(r.text.new)}</p>` : ''}
<p>Desktop</p><img src="${r.desktopShots[0]}"><img src="${r.desktopShots[1]}">
<p>Mobile</p><img src="${r.mobileShots[0]}"><img src="${r.mobileShots[1]}"></section>`).join('\n')}`);
console.log(`${flagged.length} flagged of ${results.length}. Report: reports/fidelity.html`);
```

- [ ] **Step 6: Run it on a sample first**

Run: `npm run build && node scripts/verify.mjs --only=/,/experience,/experience/mobohubb-acquired-by-guardhouse,/team/chad-harding,/contact`
Expected: runs clean. Some flags are expected at this stage. Open `reports/fidelity.html` in the Browser pane to confirm the report renders.

- [ ] **Step 7: Iterate on templates and CSS until the full run is clean or explained**

Run: `npm run build && npm run verify`

Fix causes in order: text differences first (they are content bugs), then height drift, then pixel ratio. After each fix, re-run with `--only=` on the affected paths. Stop when every remaining flag has a one-line explanation in `reports/explanations.md` (e.g. "Calendly widget renders live availability; differs by time of day"). Never raise the thresholds to make flags disappear.

- [ ] **Step 8: Human gate: Chad's review.** Send `reports/fidelity.html` (SendUserFile) together with 10 randomly chosen matching pages as side-by-side screenshots. Chad reviews the flagged pages plus the sample. Record his sign-off (date and any requested changes) in `reports/explanations.md`. Requested changes loop back to Step 7.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: fidelity verification tool; replica passes review"
```

---

### Task 8: Deploy pipeline, smoke test and editing docs

**Files:**
- Create: `scripts/lib/smoke.mjs`, `scripts/smoke.mjs`, `tests/smoke.test.mjs`, `CLAUDE.md`, `README.md`
- Modify: `~/peak/4 Claude Code Sandbox/.claude/settings.json` (`permissions.additionalDirectories`)

**Interfaces:**
- Consumes: `baseline/urls.json`
- Produces:
  - `checkEntry(entry, fetchFn, base): Promise<{ path, ok, detail }>`
  - CLI: `node scripts/smoke.mjs <baseUrl>` exits 1 on any failure

Steps 1 to 5 were already done at the start of Task 4. Skip to Step 6.

- [ ] **Step 1: Write the failing tests** in `tests/smoke.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEntry } from '../scripts/lib/smoke.mjs';

function fakeFetch(table) {
  return async url => {
    const path = new URL(url).pathname;
    const r = table[path] || { status: 404 };
    return { status: r.status, headers: { get: k => (k === 'location' ? r.location : null) } };
  };
}
const base = 'https://preview.example';

test('200 on both slash forms passes (Review Focus 2)', async () => {
  const f = fakeFetch({ '/team/chad-harding': { status: 200 }, '/team/chad-harding/': { status: 200 } });
  assert.equal((await checkEntry({ path: '/team/chad-harding', status: 200 }, f, base)).ok, true);
});

test('one slash redirect to a 200 passes', async () => {
  const f = fakeFetch({ '/team/chad-harding': { status: 200 }, '/team/chad-harding/': { status: 301, location: '/team/chad-harding' } });
  assert.equal((await checkEntry({ path: '/team/chad-harding', status: 200 }, f, base)).ok, true);
});

test('404 fails with detail', async () => {
  const r = await checkEntry({ path: '/experience/category/Merger+%26+Acquisition', status: 200 }, fakeFetch({}), base);
  assert.equal(r.ok, false);
  assert.match(r.detail, /404/);
});

test('redirect to a different page fails for a 200 entry', async () => {
  const f = fakeFetch({ '/people': { status: 301, location: '/' }, '/people/': { status: 200 } });
  assert.equal((await checkEntry({ path: '/people', status: 200 }, f, base)).ok, false);
});

test('baseline 3xx entries must redirect to the same target', async () => {
  const f = fakeFetch({ '/home': { status: 301, location: '/' }, '/home/': { status: 301, location: '/' } });
  assert.equal((await checkEntry({ path: '/home', status: 301, location: 'https://www.peak-tech.com/' }, f, base)).ok, true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/lib/smoke.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/smoke.mjs`**

```js
const strip = p => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const pathOf = (loc, base) => strip(decodeURIComponent(new URL(loc, base).pathname));

async function resolveOnce(url, fetchFn, base) {
  const r = await fetchFn(url, { redirect: 'manual' });
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get('location');
    const r2 = await fetchFn(new URL(loc, base).toString(), { redirect: 'manual' });
    return { first: r.status, final: r2.status, to: pathOf(loc, base) };
  }
  return { first: r.status, final: r.status, to: null };
}

export async function checkEntry(entry, fetchFn = fetch, base) {
  const variants = entry.path === '/' ? ['/'] : [entry.path, `${entry.path}/`];
  const self = strip(decodeURIComponent(entry.path));
  for (const v of variants) {
    const r = await resolveOnce(base + v, fetchFn, base);
    if (entry.status >= 300 && entry.status < 400) {
      const want = pathOf(entry.location, base);
      if (r.first < 300 || r.first >= 400 || r.to !== want) return { path: v, ok: false, detail: `expected redirect to ${want}, got ${r.first} -> ${r.to}` };
      continue;
    }
    if (r.final !== 200) return { path: v, ok: false, detail: `status ${r.first}${r.to ? ` -> ${r.to} ${r.final}` : ''}` };
    if (r.to !== null && r.to !== self) return { path: v, ok: false, detail: `redirected away to ${r.to}` };
  }
  return { path: entry.path, ok: true, detail: '' };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement the CLI `scripts/smoke.mjs`**

```js
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
```

- [ ] **Step 6: Human gate: accounts (Chad).** Chad, using a PEAK address:
  1. In the PEAK GitHub organization from Task 0 (owned by a PEAK address, with `ChadHarding73` as an owner), creates a **private** repo named `peak-website` with no README, and gives Claude the SSH URL. Before pushing, confirm the key's account with `ssh -T git@github.com`; expected `Hi ChadHarding73!`.
  2. In the PEAK Netlify account (created in Task 0), goes to **Add new site → Import from Git → GitHub**, grants Netlify access to the `peak-website` repo only (OAuth, Chad clicks), and accepts the build settings from `netlify.toml`.
  3. In Netlify **Site configuration → Build & deploy → Branches and deploy contexts**, sets Branch deploys to **All**.
  4. In Netlify **Forms**, enables form detection.

  Claude does not perform any of these clicks.

- [ ] **Step 7: Push and deploy a preview branch**

```bash
cd ~/peak-website
git remote add origin <SSH URL from Chad>
git push -u origin main
git switch -c preview/full-site && git push -u origin preview/full-site
```

Expected: Netlify builds both. The branch URL is `https://preview-full-site--<site>.netlify.app`.

- [ ] **Step 8: Smoke and verify against the real Netlify host**

Run: `node scripts/smoke.mjs https://preview-full-site--<site>.netlify.app`
Expected: `N/N OK`. If encoded category paths fail here but pass locally (Review Focus 1), add explicit rewrites to `src/_redirects`, one line per category, for example:

```
/experience/category/Merger+%26+Acquisition  /experience/category/Merger+&+Acquisition/index.html  200
```

Rebuild and re-run until it passes.

Then run `node scripts/verify.mjs https://preview-full-site--<site>.netlify.app` and confirm the flag set matches the one Chad signed off in Task 7.

- [ ] **Step 9: Form test on the preview (needs Chad's OK to submit).** Ask Chad: "OK to submit one test entry (Name: 'Website test', Email: chad@peak-tech.com, Message: 'Netlify form test, please ignore') on the preview?" On a yes, submit it once. Then, in Netlify **Forms → contact → Notifications**, Chad adds an email notification to each recipient captured in Task 0. Confirm that the submission appears in Netlify and that the notification email arrives.

- [ ] **Step 10: Write `CLAUDE.md`**

```markdown
# peak-tech.com — Claude editing guide

Static Eleventy site deployed by Netlify from GitHub. `main` = live site.

## Where things live
- Tombstones: `src/experience/<slug>.md`. The filename IS the URL. Never rename a file.
- Perspectives posts: `src/perspectives/<slug>.md`. Team bios: `src/team/<slug>.md`.
- Standalone pages: `src/pages/<slug>.md`. Home, People and Contact copy is in front matter.
- Header nav, footer, phone, email: `src/_data/site.json`.
- Images: `src/images/<collection>/`. Styles: `src/assets/css/site.css`.
- List order: `sqsOrder` in front matter (lower = earlier). A new item gets `sqsOrder: -1`, or one less than the current minimum, to appear first.

## Every change
1. `git switch -c edit/<topic>`, make the edit, then `npm run build && npm test`.
2. `git push -u origin edit/<topic>`. The preview is at `https://edit-<topic>--<site>.netlify.app`.
3. Screenshot the changed page at 1440 and 390 widths, and show Chad.
4. Only on Chad's OK: `git switch main && git merge --ff-only edit/<topic> && git push`.
5. Verify the live page, then delete the branch.

## Rules
- Never change a URL. If a page must move, add a 301 to `src/_redirects` in the same commit.
- Public content only. No deal material; no tombstone until Chad says it is cleared to publish.
- Existing copy is verbatim. New copy drafted for Chad uses no em dashes. The brand is "PEAK" or "Peak Technology Partners".
- A new tombstone: Chad supplies the PNG. Add `src/images/experience/<slug>.png` and `src/experience/<slug>.md` with title, date, image, categories and sqsOrder.
- DNS lives at Squarespace and carries the firm's email records. Never touch it from here.
```

- [ ] **Step 11: Write `README.md`**

```markdown
# peak-website

The public website for Peak Technology Partners (www.peak-tech.com).

- **Stack:** Eleventy 3 static site generator, Nunjucks templates, content as Markdown files with front matter.
- **Hosting:** Netlify, building from this GitHub repo. `main` publishes to production; other branches get preview URLs.
- **Build locally:** `npm install && npm run build && npm run serve`, then open http://localhost:8080.
- **Tests:** `npm test` (URL coverage, build structure, form markup, helpers).
- **Checks:** `npm run smoke -- <url>` checks every historical URL; `npm run verify -- <url>` compares pages with the pre-migration baseline.
- **DNS:** the domain and DNS are managed in Squarespace Domains. Only the A and `www` records point at Netlify; the mail records must not change.
- **Forms:** Netlify Forms; notifications are configured in the Netlify dashboard.
```

- [ ] **Step 12: Grant sessions access to the repo.** Read `~/peak/4 Claude Code Sandbox/.claude/settings.json` first. Add `"~/peak-website"` to `permissions.additionalDirectories`, preserving every existing entry, and validate the JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME+'/peak/4 Claude Code Sandbox/.claude/settings.json','utf8'));console.log('valid')"
```

This file is tracked by `claude-config`. Commit it with `ccfg`:

```bash
ccfg add "4 Claude Code Sandbox/.claude/settings.json" && ccfg commit -m "Allow sessions to reach ~/peak-website"
```

- [ ] **Step 13: Commit, merge the preview branch, and confirm production still is not live on the domain**

```bash
git add -A && git commit -m "feat: smoke checker, editing guide, README"
git push
git switch main && git merge --ff-only preview/full-site && git push
```

Expected: the Netlify production deploy succeeds at `https://<site>.netlify.app`, and `www.peak-tech.com` still serves Squarespace (`curl -sI https://www.peak-tech.com | grep -i server` shows `Squarespace`).

---

### Task 9: Cutover (human-gated runbook)

**Files:**
- Create: `baseline/dns-before.txt`, `baseline/dns-after.txt`, `docs/cutover-log.md`

**Interfaces:**
- Consumes: `baseline/squarespace-settings.md` (DNS presets), `scripts/smoke.mjs`, `scripts/verify.mjs`

- [ ] **Step 1: Pre-flight checklist.** All must be true before scheduling:
  - Task 7 sign-off recorded.
  - Task 8 smoke passes on production `<site>.netlify.app`.
  - The form test email was received.
  - Finalis has **answered** whether the site needs review. If review is required, their approval is received. Both are recorded in `docs/cutover-log.md`. Asking is not enough.
  - The drift check (Step 1a) is clean.
  - The cutover is scheduled for a Monday to Thursday morning.

- [ ] **Step 1a: Drift check, the day before cutover.** Create `scripts/drift.mjs`:

```js
import { readFile, readdir } from 'node:fs/promises';
import { ORIGIN } from './lib/inventory.mjs';
import { COLLECTIONS, splitFullUrl } from './lib/convert.mjs';

const json = async p => (await fetch(`${ORIGIN}${p}${p.includes('?') ? '&' : '?'}format=json`)).json();
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
```

Run: `npm run drift`
Expected: `NO DRIFT`. Otherwise, apply each listed change in the repo on a branch: re-scrape that one item with `itemToFile`, run `npm run images` for any new image, and use preview then Chad's OK. Refresh its baseline with `node scripts/verify.mjs --only=<path> --refresh-old`, and re-run until the check is clean. Also re-run `npm run inventory` and `git diff baseline/urls.json`. Any new URL gets a page, or Chad decides it is dropped.

- [ ] **Step 2: Add the custom domain in Netlify (Chad).** In **Domain management**, add `www.peak-tech.com` as primary and `peak-tech.com` as an alias, choosing external DNS. Record the apex A value Netlify displays (the documented default is `75.2.60.5`; use what the panel says) and the `www` target in `docs/cutover-log.md`.

- [ ] **Step 3: Snapshot DNS (the day before)**

```bash
cd ~/peak-website
{ for t in A MX TXT CAA; do echo "== $t"; dig +noall +answer $t peak-tech.com @dns1.p07.nsone.net; done
  echo "== www"; dig +noall +answer www.peak-tech.com @dns1.p07.nsone.net
  echo "== dmarc"; dig +noall +answer TXT _dmarc.peak-tech.com @dns1.p07.nsone.net
  echo "== dkim"; dig +noall +answer TXT google._domainkey.peak-tech.com @dns1.p07.nsone.net; } > baseline/dns-before.txt
cat baseline/dns-before.txt
```

Chad also screenshots the Squarespace DNS panel. The TTL column in `dns-before.txt` shows the maximum propagation delay. If the Squarespace panel allows lowering the TTL on the A and `www` records, Chad lowers it to the minimum now.

- [ ] **Step 4: Cutover (Chad edits, Claude watches in the Browser pane).** In Squarespace **Domains → peak-tech.com → DNS**:
  1. Confirm which records the **Squarespace Defaults** preset contains. It must be only the four A records and the `www` CNAME. If it contains anything else, stop and re-plan.
  2. Remove the Squarespace Defaults preset, or edit those five records if the panel allows.
  3. Add a custom `A` record (host `@`) with Netlify's value, and a custom `CNAME` (host `www`) with `<site>.netlify.app`.
  4. Touch nothing in the Google Workspace preset or any other custom record.

  Log the time in `docs/cutover-log.md`.

- [ ] **Step 5: Verify DNS and mail records**

```bash
dig +short A peak-tech.com @dns1.p07.nsone.net
dig +short CNAME www.peak-tech.com @dns1.p07.nsone.net
{ for t in A MX TXT CAA; do echo "== $t"; dig +noall +answer $t peak-tech.com @dns1.p07.nsone.net; done
  echo "== www"; dig +noall +answer www.peak-tech.com @dns1.p07.nsone.net
  echo "== dmarc"; dig +noall +answer TXT _dmarc.peak-tech.com @dns1.p07.nsone.net
  echo "== dkim"; dig +noall +answer TXT google._domainkey.peak-tech.com @dns1.p07.nsone.net; } > baseline/dns-after.txt
diff <(grep -vE '^== (A|www)|IN\s+(A|CNAME)\s' baseline/dns-before.txt | sed -E 's/\s[0-9]+\s+IN/ IN/') <(grep -vE '^== (A|www)|IN\s+(A|CNAME)\s' baseline/dns-after.txt | sed -E 's/\s[0-9]+\s+IN/ IN/') && echo "MAIL RECORDS UNCHANGED"
```

Expected: the A record is Netlify's value, `www` points to `<site>.netlify.app`, and the output ends `MAIL RECORDS UNCHANGED`. Anything else triggers Step 9 (rollback).

- [ ] **Step 6: Verify the site.** Wait for Netlify to show the HTTPS certificate as provisioned (usually minutes after DNS resolves), then:

```bash
curl -sI https://www.peak-tech.com | grep -iE '^(HTTP|server)'
curl -sI https://peak-tech.com | grep -iE '^(HTTP|location)'
node scripts/smoke.mjs https://www.peak-tech.com
```

Expected: `HTTP/2 200` with `server: Netlify`; the apex returns `301` to `https://www.peak-tech.com/`; smoke reports `N/N OK`. Also check that Google Analytics Realtime shows a visit (Chad opens GA).

- [ ] **Step 7: Verify mail flow (Chad).** Chad sends an email from chad@peak-tech.com to an external address and replies to it, then checks the received message's headers ("Show original" in Gmail) for `dkim=pass`, `spf=pass` and `dmarc=pass`. Record the result in `docs/cutover-log.md`.

- [ ] **Step 8: Close the form gap.** With Chad logged in, open the Squarespace form storage (or the recipient inbox) and check for any submission received between the snapshot and now. Forward anything found to the right person. Then ask Chad's OK before submitting one test on the live Netlify form, as in Task 8 Step 9.

- [ ] **Step 9: Rollback (only if Step 5, 6 or 7 fails).** Chad restores the A and `www` records to the values in `baseline/dns-before.txt` (re-adding the Squarespace Defaults preset restores them exactly). Re-run the Step 5 commands until the A records show the four Squarespace IPs, then confirm `curl -sI https://www.peak-tech.com` shows `server: Squarespace`. Log the cause.

- [ ] **Step 10: Commit the log**

```bash
git add -A && git commit -m "chore: cutover to Netlify; DNS snapshots and log" && git push
```

---

### Task 10: Decommission and records (after 30 stable days)

**Files:**
- Modify: `~/peak/4 Claude Code Sandbox/Claude Memory/peak-website-squarespace.md`, `squarespace-editing-workflow.md`, `peak-website-rebuild-decision.md`, `MEMORY.md`

- [ ] **Step 1: With Chad's OK, create a Todoist task** "Cancel Squarespace WEBSITE plan only (keep domain + DNS)", due 30 days after cutover, moved to the nearest Monday to Thursday. Its description links `~/peak-website/docs/cutover-log.md` and says: "Before clicking, confirm on the billing page that Domains/DNS are billed separately."

- [ ] **Step 2: Update memory.** Mark `squarespace-editing-workflow.md` SUPERSEDED (the site is no longer edited in Squarespace). Update `peak-website-squarespace.md` to say only the domain and DNS remain at Squarespace. Point `peak-website-rebuild-decision.md` at `~/peak-website/CLAUDE.md` as the editing entry point. Update the three `MEMORY.md` index lines to match.

- [ ] **Step 3: On the cancellation day (Chad clicks).** Watch in the Browser pane as Chad cancels the website plan. Afterward, confirm the domain and DNS still resolve:

```bash
dig +short MX peak-tech.com
dig +short A peak-tech.com
curl -sI https://www.peak-tech.com | grep -i server
```

Expected: Google MX unchanged, Netlify A unchanged, `server: Netlify`.
