# peak-tech.com — Claude editing guide

Static Eleventy site, deployed by Netlify (project `thriving-moxie-406412`, PEAK team) from github.com/ChadHarding73/peak-website. `main` is the live site at https://www.peak-tech.com; production is public, previews are private to the PEAK Netlify team.

## Where things live
- **Tombstones:** `src/experience/<slug>.md`. **Perspectives posts:** `src/perspectives/<slug>.md`. **Team bios:** `src/team/<slug>.md`. The filename IS the URL (`/experience/<slug>`). Never rename a file.
- **Standalone pages** (home, people, contact, careers, legal pages): `src/pages/<slug>.md`. Their bodies are HTML converted from Squarespace:
  - `<section class="band band--THEME ...">` is one page section. Themes are `light`, `white`, `light-bold`, `black` and `bright` (orange).
  - `<div class="row">` / `<div class="col" style="--span: N; --of: P">` is the 12-column grid. A nested column's span counts within its parent's span.
  - `<div class="b b--TYPE">` is one block (html, spacer, horizontalrule, button, image, quote, gallery, code). Edit the text inside; keep the wrappers.
  - `{% summary collections, '{...}' %}` renders a live list, such as Recent Transactions or the People grid. `"latest": N` shows the newest N; `"slugs": [...]` shows exactly those items.
- **List pages** (`/experience`, `/perspectives`, `/team`): the bands around each list are in `src/_includes/lists/<collection>.njk`. The list itself is `src/_includes/partials/collection-list.njk`.
- **Header nav, social links, analytics ID:** `src/_data/site.json`. **Transaction filters:** `src/_data/filters.json`.
- **Footer**, including the Finalis broker-dealer disclosure: `src/_includes/partials/footer-sections.njk`. The disclosure is compliance text; change it only on Chad's explicit instruction.
- **Images:** `src/images/<collection>/`. Each JPG/PNG has a `.webp` copy beside it (max 1600px, made by `npm run webp`); a build transform points every `<img>` and CSS background at the copy, while `og:image` keeps the original because LinkedIn previews handle WebP unreliably. **Styles:** `src/assets/css/site.css`. **Scripts** (carousel, filter): `src/assets/js/site.js`.
- **Order:** `sqsOrder` in front matter, lower first. A new item gets one less than the current minimum so it appears first.

## Every change
1. `git switch -c edit/<topic>`, make the edit, then `npm run build && npm test`.
2. `git push -u origin edit/<topic>`. Netlify builds a branch preview at `https://edit-<topic>--thriving-moxie-406412.netlify.app`. Previews are private: open them in the in-app Browser pane, where Chad is signed in to Netlify (anonymous requests get a 401). The branch address can show "Site not found" for a few minutes after the deploy reports Completed; meanwhile use the deploy's permalink (`https://<deploy-id>--thriving-moxie-406412.netlify.app`, linked from the Deploys page).
3. Screenshot the changed page at 1440 and 390 widths, and show Chad.
4. Only on Chad's OK: `git switch main && git merge --ff-only edit/<topic> && git push`.
5. Verify the live page, then delete the branch.

## Netlify credits (Personal plan since 2026-10-06: 1,000 per month, $9)
- The Free plan (300) ran out on 2026-10-06, a week into the cycle. **Visitor traffic, not deploys, is the main cost:** bandwidth is 20 credits per GB and web requests 2 per 10K. The first week ran about 4.9 GB and 65K requests, roughly 14 credits a day, or about 400 a month with zero deploys. Heavy PNG images and crawler traffic drive it.
- Every push to `main` is a production deploy and costs **15 credits**. Branch previews are free. Commits that don't change the site (docs, tests) must include `[skip ci]` in the message; on cutover day, docs commits without it each cost a full production deploy.
- Batch edits: preview on a branch as often as needed, then merge once.
- At 0 credits Netlify pauses production deploys and adds a small operational buffer. When that runs out, it **takes the site offline** until the monthly reset. On Personal, extra credits cost $5 per 500. Check the balance at app.netlify.com → PEAK team → Usage & billing before a busy editing day.

## Adding a tombstone
Chad supplies the PNG. Add `src/images/experience/<slug>.png` and `src/experience/<slug>.md` with front matter `title`, `date` (YYYY-MM-DD), `image`, `categories` (from `src/_data/filters.json`), `sqsOrder`, `seoTitle`, and the press-release body as HTML (`<div class="b b--html"><p>…</p></div>`). The home page's Recent Transactions updates on its own. Then run `npm run webp` to make the image's WebP copy (the test suite fails until you do).

## Adding a team bio
Chad supplies the photo. Add `src/images/team/<slug>.jpg` and `src/team/<slug>.md` with `title` (the person's name), `date`, `image`, `categories` (their role, e.g. `Analyst`), `sqsOrder` (their place in the People grid; renumber others if needed), `seoTitle`, and the bio body. The People page shows every bio (`"latest": "all"`), so nobody drops off. Run `npm run webp` for the photo.

## Image names
Images are named `<page-slug>-<8-hex fingerprint of the original URL>.<ext>`. For a new image, any unique descriptive name works; never reuse an existing filename for a different picture.

## Rules
- Never change a URL. If a page must move, add a 301 to `src/_redirects` in the same commit. Netlify serves paths lowercased; links and canonical tags use the lowercase form.
- Public content only. No deal material, and no tombstone until Chad says it is cleared to publish.
- Existing copy is verbatim. New copy drafted for Chad uses no em dashes. The brand is "PEAK" or "Peak Technology Partners".
- **Never re-run the migration scripts** (`npm run inventory`, `scrape`, `pages`, `images`, `drift`, or `verify --refresh-old`) after launch. They rebuild content and baselines from Squarespace, and `www.peak-tech.com` is now this site, so they would overwrite every edit and corrupt the frozen old-site baseline the tests depend on. They refuse to run without `--squarespace-migration`; never pass it.
- **Item bodies are HTML inside `.md` files.** Keep each body's HTML free of blank lines: a blank line drops Markdown out of HTML mode and mangles what follows. Run `npm run build && npm test` after every body edit.
- DNS lives at Squarespace and carries the firm's email records. Never touch it from here.
