# Fidelity report: why the remaining flags are expected

The verification tool (`npm run verify`) compares all 233 pages of the live Squarespace site with the new site, at 1440px and 390px wide. It flags a page when the visible text differs, when more than 2% of pixels differ, or when page height differs by more than 5%. The thresholds were not raised. Each remaining flag falls into one of these explained groups.

## 1. Font change (pixel flags on nearly every page)
Chad chose Helvetica sitewide (2026-09-29) instead of Aktiv Grotesk. The live site's Aktiv Grotesk was licensed only through Squarespace's Adobe Fonts arrangement, and the files on hand are Dalton Maag trial versions. Every line of text therefore shifts by a few pixels, which trips the 2% pixel check on almost every page. Text content and layout are what matter here, and both are checked separately.

## 2. Small height drift (3 to 10%, mostly on mobile)
Helvetica sets narrower than Aktiv Grotesk (and than Poppins, which the old footer disclosure used), so paragraphs wrap to fewer lines. On desktop most pages are within 1 to 4%; mobile runs 3 to 10% because narrow columns amplify line-count differences. The layout (sections, columns, spacing, images) matches.

## 3. `/perspectives` (about 50% height, "Older Posts" text)
The live site shows 20 posts per page with an "Older Posts" link to `?offset=` URLs, which a static site cannot reproduce. The new page shows all 56 posts on one page. Category pages with more than 20 items behave the same way.

## 4. `/experience/category/EdTech` and `/experience/category/B2C+Software` (about 80% height)
The live filter plugin's option list omits EdTech and B2C Software, so on those two URLs it displays every transaction. The new site correctly shows only the items in those categories (1 and 4). This is a fix of a live-site bug.

## 5. Kept on purpose
- **The heading structure** (0 or several h1 per page) is kept as it is on the live site. Heading cleanup is a post-launch SEO task.
- **The white square logo on light-gray headers** (People, bios, lists) matches the live site's per-page settings, though it is hard to see. It's an easy post-launch fix if wanted.
- **The contact thank-you page** shows Squarespace's default "Thank you!" until Chad supplies the post-submit message.

## Text
Visible text matches word for word on every page except those explained above: `/perspectives` ("Older Posts"). Content was re-copied after Julia's Squarespace cleanup on 2026-09-29, and the drift check reported no differences.
