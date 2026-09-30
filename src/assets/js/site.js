// Carousel arrows and the Transactions filter (replaces the paid Squarespace "custom-filter" plugin).
document.querySelectorAll('.summary--carousel').forEach(block => {
  const track = block.querySelector('.summary__items');
  const step = () => track.querySelector('.card')?.getBoundingClientRect().width || track.clientWidth;
  block.querySelector('.summary__prev')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  block.querySelector('.summary__next')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

document.querySelectorAll('[data-filters]').forEach(panel => {
  const items = [...panel.parentElement.querySelectorAll('.grid__item')];
  const groups = [...panel.querySelectorAll('.filter')];
  const apply = () => {
    const active = groups.map(g => ({ attr: g.dataset.attr, values: [...g.querySelectorAll('button[aria-pressed="true"]')].map(b => b.dataset.value) })).filter(g => g.values.length);
    for (const item of items) {
      const ok = active.every(g => (item.dataset[g.attr] || '').split('|').some(v => g.values.includes(v)));
      item.classList.toggle('is-hidden', !ok);
    }
  };
  panel.addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    apply();
  });
});
