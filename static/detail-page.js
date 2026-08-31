/* ============================================================
   /photos and /videos detail pages.

   /videos: plain static grid with clickable .detail-filter-pill
   <button data-filter> elements — show/hide .detail-card by category,
   unchanged from before.

   /photos (ROUND 2 rework): the card grid was replaced by a pinned,
   scroll-scrubbed single-row conveyor (see photos-hero.js), so its
   category pills are no longer click-to-filter buttons — like HOME's
   own #photos-category-list, they are read-only <span data-cat-index>
   indicators that photos-hero.js's conveyor highlights automatically
   as the currently-centered card's category scrolls into view. The
   click-filter branch below is scoped to buttons with [data-filter]
   only, so it naturally no-ops on /photos' new pill markup.
   ============================================================ */
(function () {
  'use strict';

  const filterPills = document.querySelectorAll('.detail-filter-pill[data-filter]');
  const cards = document.querySelectorAll('.detail-card');

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.toggle('active', p === pill));
      const filter = pill.dataset.filter;
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* -------- Photos-only: "View detail" lightbox --------
     Works against BOTH the old .detail-card markup (/videos, if it
     ever grows a lightbox) and the new .thumb-item conveyor cards
     (/photos) — both share the same .detail-card-media img +
     [data-lightbox] link structure. */
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
        const card = link.closest('.detail-card, .thumb-item');
        const img = card ? card.querySelector('.detail-card-media img') : null;
        openLightbox(link.getAttribute('href'), img ? img.alt : '');
      });
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }
})();
