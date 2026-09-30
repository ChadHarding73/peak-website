import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

// Squarespace hides sections until they scroll into view (preFade/preSlide/etc.). Force them visible
// and walk the page so lazy images load, or full-page screenshots come out blank.
export const REVEAL_CSS = '.preFade,.preScale,.preSlide,.preClip,.preFlex,[data-animation-role]{opacity:1!important;transform:none!important;clip-path:none!important;transition:none!important;animation:none!important}';
export async function settle(page) {
  await page.addStyleTag({ content: REVEAL_CSS });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  // Embeds like Calendly keep polling, so network idle is best-effort.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}

const PAGES = ['/', '/experience', '/experience/mobohubb-acquired-by-guardhouse', '/perspectives', '/people', '/team/chad-harding', '/contact', '/careers'];
const SELECTORS = ['body', 'header', 'header nav a', '.header-title-logo img', 'h1', 'h2', 'h3', 'h4', 'p', 'a', '.sqs-block-button-element', 'footer', 'footer p', '.blog-item-content', '.summary-item', '.blog-basic-grid'];
const PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'color', 'background-color', 'padding', 'margin', 'max-width', 'width', 'height', 'border', 'gap', 'display', 'grid-template-columns'];

if (import.meta.url !== `file://${process.argv[1]}`) { /* imported for REVEAL_CSS/settle */ } else {
const browser = await chromium.launch();
const out = {};
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  for (const p of PAGES) {
    await page.goto(`https://www.peak-tech.com${p}`, { waitUntil: 'networkidle' });
    await settle(page);
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
}
