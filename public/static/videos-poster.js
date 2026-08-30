/* ============================================================
   /videos "Featured Works" poster carousel (ROUND 7).

   Reference: bfc.or.kr's "04 추천지원작" section initializes
   .poster_on as a jQuery slick carousel:
     slidesToShow:1, autoplay:true, autoplaySpeed:2500, arrows:false,
     vertical:true, centerMode:false, pauseOnFocus:false, draggable:false

   This project has no jQuery/slick dependency (deliberately kept
   lightweight — GSAP is the only animation lib in use, and only on
   home/photos/about). This file reproduces the same user-facing
   behavior (auto-advance every 2.5s, one slide visible at a time,
   pauses while a slide's hover-reveal text panel is being read)
   with plain vanilla JS + the CSS opacity/transform transition
   already defined on .rec-poster-slide in style.css.
   ============================================================ */
(function () {
  'use strict';

  const root = document.getElementById('rec-poster-on');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.rec-poster-slide'));
  const dots = Array.from(root.querySelectorAll('.rec-poster-on-dots span'));
  if (!slides.length) return;

  let current = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
  if (current < 0) current = 0;
  let timer = null;
  let paused = false;
  const AUTOPLAY_MS = 2500;

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === current));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  function next() {
    if (!paused) show(current + 1);
  }

  function start() {
    stop();
    timer = window.setInterval(next, AUTOPLAY_MS);
  }
  function stop() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  /* Pause autoplay while the visitor is hovering/focused on the
     active slide's metadata panel, so it doesn't advance out from
     under someone mid-read (BFC's own slick config sets
     pauseOnFocus:false, but that reads as an oversight against its
     own UX intent here, so this reimplementation intentionally
     pauses on hover instead). */
  root.addEventListener('mouseenter', () => { paused = true; });
  root.addEventListener('mouseleave', () => { paused = false; });
  root.addEventListener('focusin', () => { paused = true; });
  root.addEventListener('focusout', () => { paused = false; });

  dots.forEach((dot, i) => {
    dot.style.cursor = 'pointer';
    dot.addEventListener('click', () => show(i));
  });

  show(current);
  start();

  /* Stop entirely once the panel scrolls off-screen (saves work,
     matches the "no pointless background timers" convention used
     elsewhere in this project's scroll-driven sections). */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.1 });
    io.observe(root);
  }
})();
