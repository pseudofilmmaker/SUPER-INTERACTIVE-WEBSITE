/* ============================================================
   /photos and /videos detail pages — category filter pills.
   Plain static grid, no scroll-scrub animation needed here (that
   lives on the HOME page teaser); just show/hide cards by category.
   ============================================================ */
(function () {
  'use strict';

  const pills = document.querySelectorAll('.detail-filter-pill');
  const cards = document.querySelectorAll('.detail-card');
  if (!pills.length) return;

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.toggle('active', p === pill));
      const filter = pill.dataset.filter;
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });
})();
