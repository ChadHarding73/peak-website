import { readFileSync } from 'node:fs';

// Squarespace keeps category pages live even when no item uses the category; the baseline lists them.
function baselineCategories(collection) {
  const urls = JSON.parse(readFileSync('baseline/urls.json', 'utf8'));
  const prefix = `/${collection}/category/`;
  return urls.filter(u => u.path.startsWith(prefix)).map(u => decodeURIComponent(u.path.slice(prefix.length)).replace(/\+/g, ' '));
}

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
      for (const cat of baselineCategories(c)) cats.add(cat);
      for (const category of [...cats].sort()) {
        if (category.includes('/')) throw new Error(`category contains "/": ${category}`);
        out.push({ collection: c, category });
      }
    }
    return out;
  });

  // Lowercase: Netlify redirects mixed-case paths to lowercase, so that is the URL actually served.
  eleventyConfig.addFilter('canonicalPath', u => (u === '/' ? '/' : decodeURIComponent(u).replace(/\/$/, '').toLowerCase()));
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
