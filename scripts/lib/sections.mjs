// One-time migration: rebuild a Squarespace 7.1 page's <main> as clean, editable HTML.
// Sections become bands, sqs rows/cols become a 12-column grid, and each block becomes plain markup.
// Blocks backed by live data (summaries, form, social links) become Nunjucks shortcodes/partials.
import { parseDocument } from 'htmlparser2';
import * as DU from 'domutils';
import serializer from 'dom-serializer';
const render = serializer.default || serializer;
import sanitizeHtml from 'sanitize-html';

const hasClass = (e, c) => (e.attribs?.class || '').split(/\s+/).includes(c);
const classes = e => (e.attribs?.class || '').split(/\s+/).filter(Boolean);
const find = (test, nodes) => DU.findOne(test, Array.isArray(nodes) ? nodes : [nodes], true);
const findAll = (test, nodes) => DU.findAll(test, Array.isArray(nodes) ? nodes : [nodes]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const RICH = {
  allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'br', 'blockquote', 'sup', 'sub', 'span'],
  allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['class'] },
  allowedClasses: { '*': ['sqsrte-*'] },
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
};
const rich = html => sanitizeHtml(html, RICH).replace(/<span>([\s\S]*?)<\/span>/g, '$1').trim();

const imgSrc = img => (img.attribs['data-src'] || img.attribs.src || '').split('?')[0];

function blockType(el) {
  const c = classes(el).find(x => /^sqs-block-(html|spacer|horizontalrule|button|summary-v2|code|image|form|socialaccountlinks|quote|gallery)$/.test(x));
  return c ? c.slice('sqs-block-'.length) : null;
}

export function summaryArgs(hrefs, settingClasses, order) {
  const paths = hrefs.map(h => new URL(h, 'https://x').pathname.split('/').filter(Boolean));
  const collection = paths[0][0];
  const slugs = paths.map(p => p[1]);
  const newest = (order[collection] || []).slice(0, slugs.length);
  const set = n => settingClasses.includes(`summary-block-setting-${n}`);
  const design = (settingClasses.find(c => /^summary-block-setting-design-(carousel|autogrid|grid|list|wall)$/.test(c)) || 'summary-block-setting-design-grid').slice('summary-block-setting-design-'.length);
  const args = { collection };
  if (slugs.length && slugs.every((s, i) => s === newest[i])) args.latest = slugs.length;
  else args.slugs = slugs;
  return { ...args, design, date: set('primary-metadata-date'), excerpt: set('show-excerpt'), readMore: set('show-read-more-link') };
}

function convertBlock(el, ctx) {
  const type = blockType(el);
  switch (type) {
    case 'html': {
      const content = find(e => hasClass(e, 'sqs-html-content'), el) || find(e => hasClass(e, 'sqs-block-content'), el);
      return content ? rich(render(content.children)) : '';
    }
    case 'spacer': {
      const v = classes(el).find(c => /^vsize-\d+$/.test(c)) || 'vsize-1';
      return `<div class="spacer ${v}"></div>`;
    }
    case 'horizontalrule':
      return '<hr class="rule">';
    case 'button': {
      const a = find(e => e.name === 'a', el);
      const align = (classes(find(e => hasClass(e, 'sqs-block-button-container'), el) || el).find(c => /^sqs-block-button-container--(left|center|right)$/.test(c)) || '--left').split('--')[1];
      return a ? `<p class="btn-wrap btn-wrap--${align}"><a class="btn" href="${esc(a.attribs.href || '#')}">${esc(DU.textContent(a).trim())}</a></p>` : '';
    }
    case 'image': {
      const img = find(e => e.name === 'img', el);
      if (!img) return '';
      const a = find(e => e.name === 'a' && e.attribs.href, el);
      const tag = `<img src="${esc(imgSrc(img))}" alt="${esc(img.attribs.alt || '')}" loading="lazy">`;
      return `<figure class="image">${a ? `<a href="${esc(a.attribs.href)}">${tag}</a>` : tag}</figure>`;
    }
    case 'summary-v2': {
      const settings = [...new Set(findAll(e => classes(e).some(c => c.startsWith('summary-block-setting-')), el).flatMap(classes))];
      const hrefs = [...new Set(findAll(e => e.name === 'a' && hasClass(e, 'summary-title-link'), el).map(a => a.attribs.href))];
      if (!hrefs.length) { ctx.warnings.push('summary block with no items'); return ''; }
      return `{% summary collections, '${JSON.stringify(summaryArgs(hrefs, settings, ctx.order))}' %}`;
    }
    case 'quote': {
      const bq = find(e => e.name === 'blockquote', el);
      const cite = find(e => e.name === 'figcaption', el);
      if (!bq) return '';
      return `<blockquote class="quote"><p>${esc(DU.textContent(bq).replace(/\s+/g, ' ').trim())}</p>${cite ? `<cite>${esc(DU.textContent(cite).replace(/\s+/g, ' ').trim())}</cite>` : ''}</blockquote>`;
    }
    case 'gallery': {
      const design = (JSON.parse((el.attribs['data-block-json'] || '{}').replace(/&#123;/g, '{').replace(/&#125;/g, '}')).design) || 'grid';
      const isImg = e => e.name === 'img' && (e.attribs['data-src'] || e.attribs['data-image']) && DU.getParent(e)?.name !== 'noscript';
      const slides = findAll(e => hasClass(e, 'slide'), el);
      const units = slides.length ? slides.map(sl => [find(isImg, sl), find(e => hasClass(e, 'image-slide-title'), sl)]) : findAll(isImg, el).map(i => [i, null]);
      const figs = units.filter(([img]) => img).map(([img, title]) => {
        const cap = title ? DU.textContent(title).replace(/\s+/g, ' ').trim() : '';
        return `<figure class="image"><img src="${esc((img.attribs['data-image'] || img.attribs['data-src']).split('?')[0])}" alt="${esc(img.attribs.alt || '')}" loading="lazy">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
      });
      return `<div class="gallery gallery--${esc(design)}">${figs.join('')}</div>`;
    }
    case 'form':
      return '{% include "partials/contact-form.njk" %}';
    case 'socialaccountlinks':
      return '{% include "partials/social.njk" %}';
    case 'code': {
      const box = find(e => hasClass(e, 'sqs-code-container'), el) || el;
      for (const s of findAll(e => e.name === 'style', box)) DU.removeElement(s);
      const html = render(box.children).trim();
      ctx.warnings.push(`code block passed through: ${DU.textContent(box).replace(/\s+/g, ' ').trim().slice(0, 60)}`);
      return `<div class="code">${html}</div>`;
    }
    default:
      ctx.warnings.push(`unknown block: ${classes(el).join(' ').slice(0, 80)}`);
      return '';
  }
}

// Blocks the Custom CSS targets by id keep a stable hook: #block-X becomes #b-X.
function keepId(el, html, ctx) {
  const id = (el.attribs.id || '').replace(/^block-/, '');
  return id && ctx.keepIds.has(id) ? `<div id="b-${id}">${html}</div>` : html;
}

function convertNode(el, ctx) {
  if (el.type !== 'tag') return '';
  if (hasClass(el, 'sqs-block')) return keepId(el, convertBlock(el, ctx), ctx);
  if (hasClass(el, 'row')) return `<div class="row">${el.children.map(c => convertNode(c, ctx)).join('')}</div>`;
  const span = classes(el).find(c => /^span-\d+$/.test(c));
  if (hasClass(el, 'col') && span) return `<div class="col ${span}">${el.children.map(c => convertNode(c, ctx)).join('')}</div>`;
  return el.children.map(c => convertNode(c, ctx)).join('');
}

// Fluid-engine placement: a base (mobile) grid-area and one inside @media (min-width: 768px).
function gridAreas(css, id) {
  const out = { m: 'auto', d: 'auto' };
  const re = new RegExp(`\\.${id} \\{ grid-area: ([^;]+);`, 'g');
  for (const m of css.matchAll(re)) {
    const before = css.slice(0, m.index);
    const depth = (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length;
    out[depth > 0 ? 'd' : 'm'] = m[1].trim();
  }
  return out;
}

function convertSection(section, ctx) {
  if (classes(section).some(c => c.startsWith('collection-type-blog-'))) return '{% include "partials/collection-list.njk" %}';
  const layout = classes(section).map(c => c
    .replace(/^section-height--/, 'h-').replace(/^content-width--/, 'w-')
    .replace(/^horizontal-alignment--/, 'ha-').replace(/^vertical-alignment--/, 'va-'))
    .filter(c => /^(h|w|ha|va)-/.test(c));
  const bgImg = find(e => e.name === 'img', findAll(e => hasClass(e, 'section-background'), section));
  const wrapper = find(e => hasClass(e, 'content-wrapper'), section);
  const styles = [];
  if (bgImg && imgSrc(bgImg)) styles.push(`--bg: url('${imgSrc(bgImg)}')`);
  for (const m of (wrapper?.attribs.style || '').matchAll(/(padding-(?:top|bottom)):\s*([^;]+);?/g)) styles.push(`${m[1]}: ${m[2].trim()}`);
  const cls = ['band', `band--${section.attribs['data-section-theme']}`, ...layout, bgImg ? 'has-bg' : ''].filter(Boolean).join(' ');
  const fluid = find(e => hasClass(e, 'fluid-engine'), section);
  let inner;
  if (fluid) {
    const css = findAll(e => e.name === 'style', section).map(s => DU.textContent(s)).join(' ').replace(/\s+/g, ' ');
    const cells = findAll(e => hasClass(e, 'fe-block'), fluid).map(fe => {
      const block = find(e => hasClass(e, 'sqs-block'), fe);
      if (!block) return '';
      const { m, d } = gridAreas(css, classes(fe).find(c => c.startsWith('fe-block-')));
      return `<div class="fe-cell" style="--m: ${m}; --d: ${d}">${keepId(block, convertBlock(block, ctx), ctx)}</div>`;
    });
    inner = `<div class="fe-grid">${cells.join('')}</div>`;
  } else {
    const content = find(e => hasClass(e, 'sqs-layout'), section) || section;
    inner = content.children.map(c => convertNode(c, ctx)).join('');
  }
  return `<section class="${cls}"${styles.length ? ` style="${esc(styles.join('; '))};"` : ''}>\n<div class="band__content">${inner}</div>\n</section>`;
}

// An item body (tombstone, post, bio) is a bare sqs-layout: rows/cols/blocks without sections.
export function convertLayout(bodyHtml, { order = {}, keepIds = new Set() } = {}) {
  const doc = parseDocument(bodyHtml);
  const ctx = { warnings: [], order, keepIds };
  const layout = find(e => hasClass(e, 'sqs-layout'), doc.children);
  const html = (layout ? layout.children : doc.children).map(c => convertNode(c, ctx)).join('');
  return { html: html.trim() + '\n', warnings: ctx.warnings };
}

export function convertPage(mainHtml, order = {}, { keepIds = new Set() } = {}) {
  const doc = parseDocument(mainHtml);
  const ctx = { warnings: [], order, keepIds };
  const sections = findAll(e => e.name === 'section' && e.attribs['data-section-theme'] !== undefined, doc.children);
  const top = sections.filter(s => !sections.some(o => o !== s && DU.findOne(e => e === s, o.children, true)));
  return { html: top.map(s => convertSection(s, ctx)).join('\n\n') + '\n', warnings: ctx.warnings };
}
