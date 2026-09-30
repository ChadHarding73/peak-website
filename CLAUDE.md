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
- **Images:** `src/images/<collection>/`. **Styles:** `src/assets/css/site.css`. **Scripts** (carousel, filter): `src/assets/js/site.js`.
- **Order:** `sqsOrder` in front matter, lower first. A new item gets one less than the current minimum so it appears first.

## Every change
1. `git switch -c edit/<topic>`, make the edit, then `npm run build && npm test`.
2. `git push -u origin edit/<topic>`. Netlify builds a branch preview at `https://edit-<topic>--thriving-moxie-406412.netlify.app`. Previews are private: open them in the in-app Browser pane, where Chad is signed in to Netlify (anonymous requests get a 401).
3. Screenshot the changed page at 1440 and 390 widths, and show Chad.
4. Only on Chad's OK: `git switch main && git merge --ff-only edit/<topic> && git push`.
5. Verify the live page, then delete the branch.

## Netlify credits (Free plan: 300 per month, hard limit)
- Every push to `main` is a production deploy and costs **15 credits**. Branch previews are free. At 0 credits Netlify **takes the site offline** ("Site not available") until the monthly reset on the 29th.
- So batch edits: preview as many times as needed on a branch, then merge once. Commits that don't change the site (docs, tests) must include `[skip ci]` in the message so Netlify doesn't build.
- Check the balance at app.netlify.com → PEAK team → Usage & billing before a busy editing day.

## Adding a tombstone
Chad supplies the PNG. Add `src/images/experience/<slug>.png` and `src/experience/<slug>.md` with front matter `title`, `date` (YYYY-MM-DD), `image`, `categories` (from `src/_data/filters.json`), `sqsOrder`, `seoTitle`, and the press-release body as HTML (`<div class="b b--html"><p>…</p></div>`). The home page's Recent Transactions updates on its own.

## Adding a team bio
Chad supplies the photo. Add `src/images/team/<slug>.jpg` and `src/team/<slug>.md` with `title` (the person's name), `date`, `image`, `categories` (their role, e.g. `Analyst`), `sqsOrder` (their place in the People grid; renumber others if needed), `seoTitle`, and the bio body. The People page shows every bio (`"latest": "all"`), so nobody drops off.

## Image names
Images are named `<page-slug>-<8-hex fingerprint of the original URL>.<ext>`. For a new image, any unique descriptive name works; never reuse an existing filename for a different picture.

## Rules
- Never change a URL. If a page must move, add a 301 to `src/_redirects` in the same commit. Netlify serves paths lowercased; links and canonical tags use the lowercase form.
- Public content only. No deal material, and no tombstone until Chad says it is cleared to publish.
- Existing copy is verbatim. New copy drafted for Chad uses no em dashes. The brand is "PEAK" or "Peak Technology Partners".
- **Never re-run the migration scripts** (`npm run inventory`, `scrape`, `pages`, `images`, `drift`, or `verify --refresh-old`) after launch. They rebuild content and baselines from Squarespace, and `www.peak-tech.com` is now this site, so they would overwrite every edit and corrupt the frozen old-site baseline the tests depend on. They refuse to run without `--squarespace-migration`; never pass it.
- **Item bodies are HTML inside `.md` files.** Keep each body's HTML free of blank lines: a blank line drops Markdown out of HTML mode and mangles what follows. Run `npm run build && npm test` after every body edit.
- DNS lives at Squarespace and carries the firm's email records. Never touch it from here.
