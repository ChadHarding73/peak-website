# Squarespace settings (read-only capture)

## Code Injection
- Header: empty.
- Footer: empty.
- Lock page, order confirmation, order status: empty (not applicable).

## Contact Form
Fields (from the public page DOM at /contact, in order):

| Label | Type | Required |
|---|---|---|
| First Name | text | yes |
| Last Name | text | yes |
| Company | text | yes |
| Email | email | yes |
| What are you exploring? | select: "Select an option" (placeholder), "Sale", "Capital Raise", "Just gathering information" | yes |
| Anything you'd like us to know? | textarea | no |

- Squarespace adds a hidden honeypot text input (positioned at -5000px); replaced by Netlify's `netlify-honeypot`.
- Submit button text: "Submit".
- Recipients (Storage panel): contact@peak-tech.com (confirmed by Chad 2026-09-29 with a test submission; Squarespace sends "Form Submission - CONTACT Form 2" from 'Squarespace' via Contact).
- Post-submit message: "Thank you!" (confirmed by Chad's screenshot 2026-09-29).

Calendly inline embed on /contact: `https://calendly.com/peakchad/founder-intro-call` (embed_type=Inline).

## URL Mappings
```
/transactions -> /experience 301
```

## Promotional Pop-Up
Configured (show on timer, 5s, all pages) but not rendered on the live site after 8 seconds: disabled. Not migrated.

## Analytics
- Google Analytics set natively in Settings → Developer Tools → External API Keys: `G-3K4D2PRNEL`.
- No Google Tag Manager container ID. The `googletagmanager.com` requests on the live site are gtag.js for that GA ID.

## Email Campaigns (not website, but lives in Squarespace)
- Squarespace Email Campaigns plan is expired. Two newsletters sent (Jan and Mar 2025), subscriber list in Squarespace Contacts.
- Before the website plan is cancelled (Task 10), confirm with Chad whether that subscriber list should be exported.

## DNS Presets
Registry nameservers: dns1-4.p07.nsone.net plus ns01-04.squarespacedns.com. Squarespace's panel says "You're using custom nameservers", but both sets serve an identical zone (same SOA, and panel-only records such as `brevo1._domainkey` resolve on both), so the panel is authoritative in practice. Task 9 pre-flight proves this with a test TXT record before any web record changes.

| Preset | Records |
|---|---|
| Squarespace Defaults | A @ 198.185.159.144, 198.185.159.145, 198.49.23.144, 198.49.23.145 (TTL 4 hrs); CNAME www → ext-sq.squarespace.com (4 hrs). Exactly the five web records. |
| Squarespace Domain Connect | CNAME _domainconnect → _domainconnect.domains.squarespace.com (1 hr) |
| Google Workspace | MX @ aspmx.l.google.com (1), alt1/alt2 (5), alt3/alt4 (10), 4 hrs |
| Google Workspace Verification | TXT @ google-site-verification=9YdpHzTb-uVOBWt_tG_wCGYDO9iR5QGpX3ED2pWIAXw |
| Custom records | CNAME brevo1._domainkey → b1.peak-tech-com.dkim.brevo.com; CNAME brevo2._domainkey → b2.peak-tech-com.dkim.brevo.com; CNAME squarespace._domainkey → squarespace-domainkey.squarespace-mail.com (30 min); TXT @ asv=f261f951f54c56ecf95a581ce26ce0c7; TXT @ google-site-verification=kU0oq-Gdaj6IXtpijSriDX6n_9mJQKcOSOtbdcuuz6o; TXT @ v=spf1 include:_spf.google.com ~all; TXT _dmarc (p=quarantine; pct=25; rua=postmark), 30 min; TXT google._domainkey (DKIM), 5 min; TXT peak-tech.com google-site-verification=kU0o... |

Only the Squarespace Defaults preset changes at cutover. Everything else, including the Brevo and Squarespace mail keys, stays untouched.

Captured 2026-09-29 from Squarespace admin, read-only. Nothing was saved.
