# peak-website

The public website for Peak Technology Partners (www.peak-tech.com), migrated from Squarespace in 2026.

- **Stack:** Eleventy 3 static site generator and Nunjucks templates. Content is Markdown files with front matter and HTML bodies. There are no runtime dependencies; the site is plain HTML, CSS and a little JavaScript.
- **Hosting:** Netlify, building from this GitHub repo (`npm run build`, publishing `_site`). `main` publishes to production; other branches get preview URLs.
- **Build locally:** `npm install && npm run build && npm run serve`, then open http://localhost:8080.
- **Tests:** `npm test` covers URL coverage against the pre-migration inventory, build structure, form markup, and the migration and helper libraries.
- **Checks:** `npm run smoke -- <url>` requests every historical URL. `npm run verify -- <url>` compares pages with the old site; it needs the live Squarespace site, so it's migration-only.
- **Migration scripts (historical, do not re-run):** `inventory`, `scrape`, `pages` and `images` built the content from Squarespace in September 2026.
- **DNS:** the domain and DNS are managed in Squarespace Domains. Only the A and `www` records point at Netlify; the mail records (Google Workspace MX, SPF, DKIM, DMARC, Brevo) must not change.
- **Forms:** Netlify Forms; notification recipients are configured in the Netlify dashboard.
- **Editing conventions:** see `CLAUDE.md`.
