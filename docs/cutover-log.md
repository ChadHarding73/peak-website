# Cutover log: peak-tech.com, Squarespace to Netlify

## Pre-flight (2026-09-30)
- Fidelity review: approved by Chad, partners, and Finalis (Chad, 2026-09-30: "Yes, I approved, and everyone else has approved as well (my partners, Finalis, etc...)").
- Drift check: NO DRIFT (after Julia's Squarespace cleanup finished).
- URL check on the Netlify build (`thriving-moxie-406412.netlify.app`): 233/233 old URLs pass, anonymously and in both slash forms, plus the `/transactions` redirect, `/sitemap.xml` and `/robots.txt`.
- Contact form: test submission at 10:48 AM PT; email received at contact@peak-tech.com (confirmed by Chad).
- Netlify visibility: production public, previews private (team login).
- DNS authority proof: test TXT `_cutover-check` = `peak-2026-09-30`, added in the Squarespace panel, seen on dns1/dns2.p07.nsone.net and ns01/ns03.squarespacedns.com, then deleted.

## Records changed (Chad, Squarespace → Domains → DNS)
| Record | Before | After |
|---|---|---|
| A @ | 198.185.159.144, 198.185.159.145, 198.49.23.144, 198.49.23.145 (Squarespace Defaults preset, TTL 4 hrs) | 75.2.60.5 (Netlify load balancer) |
| CNAME www | ext-sq.squarespace.com (TTL 1 hr) | thriving-moxie-406412.netlify.app |

Full before/after snapshots: `baseline/dns-before.txt`, `baseline/dns-after.txt`. A diff with TTLs ignored shows only those five records changed. MX (Google Workspace), SPF, DKIM (google, Brevo, Squarespace), DMARC, Google verification TXT and Domain Connect are unchanged.

## Netlify
- Custom domains added: peak-tech.com and www.peak-tech.com. Both are DNS-verified.
- Let's Encrypt certificate: issued 2026-09-30 17:35 UTC (10:35 AM PT) for peak-tech.com and www.peak-tech.com, valid to 2026-12-29 and auto-renewed. It went live about 30 minutes after the DNS change.
- Primary domain: www.peak-tech.com (switched once the certificate existed; before that Netlify refused with "you cannot change custom domains until that process completes"). HTTPS is forced.

## Post-cutover checks (2026-09-30, about 11:35 AM PT)
- Redirects: https://peak-tech.com → 301 https://www.peak-tech.com/; http → 301 https; /transactions → 301 /experience.
- All 233 baseline URLs, both slash forms (465 requests), return 200 on https://www.peak-tech.com. One transient connection error on /investment-banking-analyst passed on 6 retries.
- Google Analytics G-3K4D2PRNEL present on live pages; no noindex; canonical https://www.peak-tech.com/; robots.txt points to the sitemap.
- Mail: inbound delivery to chad@peak-tech.com confirmed by Chad (12 s, through Google MX). Mail DNS records unchanged per the before/after diff.
- Contact form: Netlify Forms → contact@peak-tech.com (tested before cutover). Visitors still on cached old DNS reach the Squarespace form, which also emails contact@peak-tech.com, so no submission is lost in the transition.

## Rollback (if ever needed)
Delete the two new records in Squarespace DNS and re-add the "Squarespace Defaults" preset (Add Preset). The Squarespace site is still live behind it until the website plan is cancelled (not before about 2026-10-30).
