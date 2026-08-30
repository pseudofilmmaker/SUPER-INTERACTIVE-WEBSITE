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

  /* -------- Photos-only: "View detail" lightbox -------- */
  const lightbox = document.getElementById('photo-lightbox');
  const lightboxImg = document.getElementById('photo-lightbox-img');
  const lightboxClose = document.querySelector('.photo-lightbox-close');
  const detailLinks = document.querySelectorAll('[data-lightbox]');
  if (lightbox && lightboxImg && detailLinks.length) {
    function openLightbox(src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.classList.add('is-open');
    }
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightboxImg.src = '';
    }
    detailLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const card = link.closest('.detail-card');
        const img = card ? card.querySelector('.detail-card-media img') : null;
        openLightbox(link.getAttribute('href'), img ? img.alt : '');
      });
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }
})();
