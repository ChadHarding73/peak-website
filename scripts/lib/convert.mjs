import sanitizeHtml from 'sanitize-html';
import matter from 'gray-matter';
import { decodeEntities, visibleText } from './text.mjs';

export const COLLECTIONS = ['experience', 'perspectives', 'team'];

const ALLOWED = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'br', 'blockquote', 'img', 'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub'];
const WRAPPERS = new Set(['div', 'span', 'section', 'article', 'header', 'footer', 'noscript', 'script', 'style', 'picture', 'source', 'svg', 'path', 'g', 'button', 'nav', 'main']);

export function splitFullUrl(fullUrl) {
  const m = fullUrl.match(/^\/([^/]+)\/([^/?#]+)/);
  if (!m || !COLLECTIONS.includes(m[1])) throw new Error(`unexpected fullUrl ${fullUrl}`);
  return { collection: m[1], slug: m[2] };
}

export function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function cleanBody(html) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED,
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
    transformTags: {
      img: (tagName, attribs) => ({
        tagName: 'img',
        attribs: { src: (attribs['data-src'] || attribs.src || '').replace(/^data:.*$/, '').split('?')[0], alt: attribs.alt || '' },
      }),
    },
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
    selfClosing: ['img', 'br', 'hr'],
  }).replace(/\n{3,}/g, '\n\n').trim();
}

export function droppedTags(html) {
  const seen = new Set();
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b/gi)) {
    const t = m[1].toLowerCase();
    if (!ALLOWED.includes(t) && !WRAPPERS.has(t)) seen.add(t);
  }
  return [...seen].sort();
}

export function parseSeo(html) {
  const get = re => decodeEntities((html.match(re) || [])[1] || '').trim();
  return {
    title: get(/<title>([^<]*)<\/title>/i),
    description: get(/<meta\s+name="description"\s+content="([^"]*)"/i),
    ogImage: get(/<meta\s+property="og:image"\s+content="([^"]*)"/i),
  };
}

export function itemToFile(item, seo = {}, order = 0) {
  const { collection, slug } = splitFullUrl(item.fullUrl);
  const excerpt = /lorem ipsum/i.test(visibleText(item.excerpt || '')) ? '' : cleanBody(item.excerpt || '');
  const data = {
    title: decodeEntities(item.title || ''),
    date: isoDate(item.publishOn ?? item.addedOn),
    image: item.assetUrl || '',
    categories: item.categories || [],
    sqsTags: item.tags || [],
    excerpt,
    seoTitle: seo.title || '',
    seoDescription: seo.description || '',
    ogImage: seo.ogImage || '',
    sqsId: item.id,
    sqsOrder: order,
  };
  return { path: `src/${collection}/${slug}.md`, slug, text: matter.stringify(cleanBody(item.body || '') + '\n', data) };
}

export function pageToFile(slug, json, seo = {}) {
  const data = {
    title: decodeEntities(json.collection?.title || slug),
    seoTitle: seo.title || '',
    seoDescription: seo.description || '',
    ogImage: seo.ogImage || '',
    sqsId: json.collection?.id || '',
  };
  return { path: `src/pages/${slug}.md`, text: matter.stringify(cleanBody(json.mainContent || '') + '\n', data) };
}
