// Renders a Squarespace-style summary block (home carousels, People grid) from a live collection.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = url => (url === '/' ? '/' : decodeURIComponent(url).toLowerCase().replace(/\/*$/, '/'));
const longDate = d => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const isoDay = d => new Date(d).toISOString().slice(0, 10);

function meta(item, kind) {
  if (kind === 'date') return `<time class="card__meta" datetime="${isoDay(item.data.date)}">${longDate(item.data.date)}</time>`;
  if (kind === 'cats' && item.data.categories?.length) return `<p class="card__meta">${esc(item.data.categories.join(', '))}</p>`;
  return '';
}

function card(item, a) {
  const link = href(item.url);
  const m = meta(item, a.meta);
  const parts = [
    item.data.image ? `<a class="card__image" href="${link}"><img src="${esc(item.data.image)}" alt="${esc(item.data.title)}" loading="lazy"></a>` : '',
    a.metaPosition === 'above-title' ? m : '',
    `<h3 class="card__title"><a href="${link}">${esc(item.data.title)}</a></h3>`,
    a.metaPosition === 'below-title' ? m : '',
    a.excerpt && item.data.excerpt ? `<div class="card__excerpt">${item.data.excerpt}</div>` : '',
    a.readMore ? `<a class="card__more" href="${link}">Read more →</a>` : '',
    a.metaPosition === 'below-content' ? m : '',
  ];
  return `<article class="card">${parts.join('')}</article>`;
}

export function renderSummary(collections, json) {
  const a = JSON.parse(json);
  const all = collections[a.collection] || [];
  const bySlug = new Map(all.map(i => [href(i.url).split('/').filter(Boolean).pop(), i]));
  const items = a.latest === 'all' ? all : a.latest ? all.slice(0, a.latest) : (a.slugs || []).map(s => bySlug.get(s.toLowerCase())).filter(Boolean);
  const style = a.perRow ? ` style="--per-row: ${a.perRow}; --gutter: ${a.gutter || 0}px"` : '';
  const nav = a.design === 'carousel' ? '<div class="summary__nav"><button type="button" class="summary__prev" aria-label="Previous"><svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8 1L1 8l7 7"/></svg></button><button type="button" class="summary__next" aria-label="Next"><svg viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1l7 7-7 7"/></svg></button></div>' : '';
  return `<div class="summary summary--${esc(a.design)} summary--${esc(a.collection)}"${style}>${nav}<div class="summary__items">${items.map(i => card(i, a)).join('')}</div></div>`;
}
