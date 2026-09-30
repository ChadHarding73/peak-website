import { readFileSync } from 'node:fs';
import { renderSummary } from './scripts/lib/cards.mjs';

// Squarespace keeps category pages live even when no item uses the category; the baseline lists them.
function baselineCategories(collection) {
  const urls = JSON.parse(readFileSync('baseline/urls.json', 'utf8'));
  const prefix = `/${collection}/category/`;
  return urls.filter(u => u.path.startsWith(prefix)).map(u => decodeURIComponent(u.path.slice(prefix.length)).replace(/\+/g, ' '));
}

// Netlify serves /x/index.html at /x/ (lowercased); /x and mixed case redirect there.
function servedPath(u) {
  if (u === '/' || /\.[a-z0-9]+$/i.test(u)) return u;
  let p = u;
  try { p = decodeURIComponent(u); } catch {}
  return p.toLowerCase().replace(/\/*$/, '/');
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/images': 'images', 'src/assets': 'assets', 'src/s': 's', 'src/_redirects': '_redirects', 'src/robots.txt': 'robots.txt' });

  for (const c of ['experience', 'perspectives', 'team']) {
    eleventyConfig.addCollection(c, api => api.getFilteredByGlob(`src/${c}/*.md`).sort((a, b) => a.data.sqsOrder - b.data.sqsOrder));
  }
  eleventyConfig.addCollection('categoryPages', api => {
    const out = [];
    for (const c of ['experience', 'perspectives', 'team']) {
      const cats = new Set();
      for (const p of api.getFilteredByGlob(`src/${c}/*.md`)) for (const cat of p.data.categories || []) cats.add(cat);
      for (const cat of baselineCategories(c)) cats.add(cat);
      for (const category of [...cats].sort()) {
        if (category.includes('/')) throw new Error(`category contains "/": ${category}`);
        out.push({ collection: c, category });
      }
    }
    return out;
  });

  // Lowercase: Netlify redirects mixed-case paths to lowercase, so that is the URL actually served.
  eleventyConfig.addFilter('canonicalPath', servedPath);
  // Migrated Squarespace content links to /people, /home, /experience/category/SaaS etc. Point every
  // internal page link at the URL Netlify actually serves, so no click or crawler hits a redirect.
  eleventyConfig.addTransform('internal-links', function (html) {
    if (!(this.page.outputPath || '').endsWith('.html')) return html;
    return html.replace(/href="(\/[^"#?]*)([#?][^"]*)?"/g, (m, path, rest = '') => {
      if (path.startsWith('/images/') || path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(path)) return m;
      return `href="${path === '/home' || path === '/home/' ? '/' : servedPath(path)}${rest}"`;
    });
  });
  eleventyConfig.addFilter('isoDay', d => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter('monthDay', d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
  eleventyConfig.addFilter('inCategory', (items, cat) => items.filter(i => (i.data.categories || []).includes(cat)));
  eleventyConfig.addFilter('categoryPath', cat => cat.replace(/ /g, '+'));
  eleventyConfig.addFilter('categoryHref', cat => encodeURIComponent(cat).replace(/%20/g, '+'));

  eleventyConfig.addNunjucksShortcode('summary', renderSummary);
  eleventyConfig.addFilter('longDate', d => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }));
  eleventyConfig.addFilter('pageBySlug', (all, slug) => all.find(p => p.page.fileSlug === slug && p.page.inputPath.includes('/pages/')));
  eleventyConfig.addFilter('neighbor', (items, url, step) => { const i = items.findIndex(x => x.url === url); return i < 0 ? null : items[i + step] || null; });
  eleventyConfig.addFilter('attrList', xs => (xs || []).join('|'));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: false,
    htmlTemplateEngine: 'njk',
  };
}
