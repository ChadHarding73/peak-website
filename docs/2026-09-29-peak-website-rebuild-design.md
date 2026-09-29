# PEAK Website Rebuild: Design Spec

**Date:** 2026-09-29
**Owner:** Chad Harding
**Status:** Draft for review

## 1. Goal

Move peak-tech.com off Squarespace to a static site that Claude edits directly, so that monthly changes (tombstones, bios, Perspectives posts, copy) take one instruction instead of a session in the Squarespace editor.

**Success means:**
- Visitors see no difference at launch.
- No URL breaks.
- Firm email is unaffected.
- After launch, a routine edit takes about 2 minutes: Claude edits, shows a preview, Chad approves, and the change is live.

## 2. Decisions made

| Topic | Decision |
|---|---|
| Rebuild vs. stay | Rebuild now. Chad's call; the site changes monthly or more. |
| Design | Faithful replica. Redesign later, one page at a time, if wanted. |
| Build method | Eleventy static site generator, with content as plain-text files. |
| Host | Netlify (free tier), deploying from a private GitHub repo. |
| Contact form | Netlify Forms, sent to the **same recipients as today** (to be read from Squarespace settings). |
| Go-live gate | Every change goes to a private preview; it goes live only after Chad's OK. |
| Domain and DNS | **Stay at Squarespace.** Only the web records change. |
| Fonts | PEAK owns Aktiv Grotesk; it will be self-hosted. Poppins comes from Google Fonts. |

## 3. Current site (baseline)

- 231 sitemap URLs: 128 `/experience` (tombstones), 61 `/perspectives`, 32 `/team`, and about 10 standalone pages (home, people, contact, careers, two job postings, indemnification, arbitration, demo, error page).
- `/experience/category/...` filter pages are not in the sitemap but are linkable and must be preserved.
- Tombstones are PNG images on the Squarespace CDN.
- Integrations: Google Tag Manager/gtag, a Calendly embed on the contact page, a native Squarespace form, and a promotional pop-up that is configured but did not render when checked.
- Known defects: tombstone titles are `<h1>`, which pins H1 styling to 16px; the footer is hand-built code blocks with invalid tags; bio excerpt fields contain hidden placeholder text.

## 4. Architecture

```
~/peak-website/                  (MacBook, outside OneDrive)
  CLAUDE.md                      edit recipe for future sessions
  README.md                      plain-language stack guide for any developer
  netlify.toml                   build settings, redirects, form config
  content/
    experience/<slug>.md         128 tombstones
    perspectives/<slug>.md       61 posts
    team/<slug>.md               32 bios
    pages/<slug>.md              standalone pages
  templates/                     ~6 layouts + shared header/footer
  images/                        all assets, pulled from the Squarespace CDN
  fonts/                         Aktiv Grotesk (self-hosted)
  tests/                         URL-coverage and link checks
  docs/                          this spec, after the repo exists
```

- Each content file has front matter (title, date, slug, image, category, SEO fields) and a body.
- **Slugs are pinned** to current URLs. The build fails if any baseline URL has no page or redirect.
- Private GitHub repo. A push to a branch creates a Netlify deploy preview; a merge to `main` publishes.
- `~/peak-website` is added to `permissions.additionalDirectories` in the shared `.claude/settings.json`.

## 5. Migration

1. **Inventory:** sitemap plus a full crawl for unlisted URLs such as category pages.
2. **Scrape rendered pages** in a real browser, not raw HTML. Extract only visitor-visible content plus page title, meta description and social-share image. Hidden fields (such as placeholder excerpts) are dropped.
3. **Images** are downloaded at original resolution and renamed descriptively.
4. **Templates** are hand-built to reproduce the current look at desktop and mobile widths.
5. **Fixes that ship with the replica** (no visible change): proper heading levels on tombstones, and a clean footer.

## 6. Verification (before Chad's review)

For every URL, old vs. new:
- **Text:** visible text must match word for word.
- **Visual:** desktop and mobile screenshots compared; pages over a small difference threshold are flagged.
- **Links:** every internal link resolves.
- **Coverage:** 100% of baseline URLs are served.

Output: one report listing only the flagged pages. Chad reviews those plus a spot sample.

## 7. Cutover

**Launch gates (all required):**
1. URL coverage 100%.
2. Fidelity report clean or signed off by Chad.
3. A test submission of the contact form reaches today's recipients.
4. Finalis asked whether the site needs review before launch.

**Records that change (and only these):**

| Record | Today | After |
|---|---|---|
| `peak-tech.com` A ×4 | 198.185.159.144, .145; 198.49.23.144, .145 | Netlify load balancer IP (confirm at setup) |
| `www` CNAME | ext-sq.squarespace.com | `<site>.netlify.app` |

**Never touched:** MX (Google), SPF, DKIM (`google._domainkey`), DMARC, Google site-verification TXT, nameservers, registrar.

**Sequence:**
- **Timing:** a Monday to Thursday morning, never a Friday.
- **Day before:** Chad screenshots the full Squarespace DNS panel, and the TTL on the web records is lowered.
- **Cutover:** Chad edits the five records in the Squarespace DNS panel, with Claude watching in the Browser pane. Netlify provisions HTTPS.
- **Checks:** HTTPS, a URL sample, the form, analytics, and mail flow (a test email both ways plus a DKIM check).

**Rollback:** restore the five records from the screenshot. Squarespace stays live behind them.

**Decommission:** after about 30 days of stability, cancel the Squarespace **website plan only**, first confirming on the billing page that the domain and DNS are billed separately and remain.

## 8. Operations

- **Editing:** Chad asks in any session. Claude edits on a branch and shares a deploy preview with desktop and mobile screenshots. Chad approves, then Claude merges and verifies the live page.
- **Accounts:** GitHub and Netlify under a PEAK address, created by Chad.
- **Credentials:** deploy tokens live in `~/.credentials/`. Add them to the host-move checklist.
- **Content boundary:** public website content only. No deal material, and no tombstone until it's cleared to publish.
- **Audit trail:** every change is a dated commit.

## 9. Inputs needed from Chad

1. Aktiv Grotesk font files (WOFF2 or OTF/TTF), with confirmation that the license covers web use.
2. The PEAK logo as a vector file (SVG, AI or EPS).
3. A Squarespace login in the Browser pane so Claude can read the form recipients and DNS panel.
4. GitHub and Netlify accounts under a PEAK address.
5. The Finalis question, asked before launch.

## 10. Effort

- **Claude:** 2 to 4 sessions (scrape, build, verification tooling, report).
- **Chad:** about 6 to 10 hours over 2 to 3 weeks (inputs, reviewing flagged pages, form test, 30 to 60 minutes of cutover).

## 11. Out of scope

- Redesign or copy changes.
- Moving the domain or DNS off Squarespace.
- A content-management UI for non-Claude editors.
- A dedicated website skill (revisit only if requests become repetitive).
- Fixing the promotional pop-up (carry its config over only if it is found active).
