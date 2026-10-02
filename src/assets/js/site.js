// Mobile menu: a real button that toggles the nav and reports its state; Escape closes it.
document.querySelectorAll('.nav-burger').forEach(btn => {
  const header = btn.closest('.site-header');
  const set = open => { header.classList.toggle('nav-open', open); btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && header.classList.contains('nav-open')) { set(false); btn.focus(); } });
});

// Carousel arrows and the Transactions filter (replaces the paid Squarespace "custom-filter" plugin).
document.querySelectorAll('.summary--carousel').forEach(block => {
  const track = block.querySelector('.summary__items');
  const step = () => track.querySelector('.card')?.getBoundingClientRect().width || track.clientWidth;
  block.querySelector('.summary__prev')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  block.querySelector('.summary__next')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  // Recent Transactions auto-advances one card every 5s, looping; it pauses while hovered, focused or off-screen, and never runs for reduced motion.
  if (!block.classList.contains('summary--experience') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let paused = false, visible = true;
  ['mouseenter', 'focusin'].forEach(e => block.addEventListener(e, () => { paused = true; }));
  ['mouseleave', 'focusout'].forEach(e => block.addEventListener(e, () => { paused = false; }));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(block);
  setInterval(() => {
    if (paused || !visible || document.hidden) return;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step(), behavior: 'smooth' });
  }, 5000);
});

document.querySelectorAll('[data-filters]').forEach(panel => {
  // Phones: start with the groups collapsed, like the old site's compact Filter panel.
  if (matchMedia('(max-width: 767px)').matches) panel.querySelectorAll('details').forEach(d => { d.open = false; });
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

// Gallery sliders auto-advance like Squarespace's (autoplay), unless the visitor prefers reduced motion.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.gallery--slider').forEach(track => {
    if (track.children.length < 2) return;
    setInterval(() => {
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + track.clientWidth, behavior: 'smooth' });
    }, 3000);
  });
}
