/* ============================================================
   /photos page script — two independent pieces:

   1) Video hero backdrop: video-1 (campfire -> Milky Way pull-back)
      autoplays once -> on 'ended' hard-cuts to video-2 (starfield
      loop), which then loops forever as a PERSISTENT fixed backdrop
      (position:fixed, z-index:0 — see #photos-hero-video-layer in
      style.css). ROUND 2 REWORK: this is now fully decoupled from
      scroll/reveal state — there is no more scroll-lock gate, no
      "revealed" class, no gated opacity fade on the page content.
      video2 just keeps looping no matter what the user does with
      scroll, exactly per the user's Round-2 feedback ("스크롤 다운으로
      넘어갈 수 있게끔해줘. 다만 두번째 영상은 계속 룹이야").

   2) Photos conveyor: a pinned, scroll-scrubbed SINGLE-ROW card
      carousel — direct adaptation of app.js's setupConveyor()
      (HOME page's own #section-4/photo-stack), using the same
      .thumb-frame/.thumb-item markup + GSAP `x` transform + pinned
      ScrollTrigger scrub mechanism, so cards slide in from the right
      and out to the left as the user scrolls DOWN (not swipe).
   ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- mobile 100vh fix (same as app.js/about.js) ---------- */
  function setVH() {
    document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);

  /* ============================================================
     PART 1 — video hero backdrop (persistent, scroll-independent)
     ============================================================ */
  (function setupHeroVideo() {
    const video1 = document.getElementById('photos-hero-video-1');
    const video2 = document.getElementById('photos-hero-video-2');
    if (!video1 || !video2) return;

    /* Same byte-range/206 workaround used by app.js/about.js on this
       server (blobifySeekableVideo). Not strictly required for a
       straight-through autoplay (no seeking happens here), but kept
       for consistency/robustness. */
    function blobifySeekableVideo(video, delayMs) {
      if (!video || video.dataset.blobified) return;
      video.dataset.blobified = '1';
      const originalSrc = video.currentSrc || video.src;
      if (!originalSrc) return;
      const run = () => {
        fetch(originalSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const wasPlaying = !video.paused;
            video.src = blobUrl;
            video.load();
            if (wasPlaying) video.play().catch(() => {});
          })
          .catch(() => {});
      };
      if (delayMs) setTimeout(run, delayMs);
      else run();
    }

    blobifySeekableVideo(video1, 0);
    blobifySeekableVideo(video2, 250);

    video2.loop = true;

    gsap.set([video1, video2], { opacity: 0 });
    gsap.set(video1, { opacity: 1 });

    let handedOff = false;
    function handToVideo2() {
      if (handedOff) return;
      handedOff = true;
      // Hard-cut video1 -> video2 (this site's established
      // no-crossfade convention — see setupVideosBgVideo() in app.js).
      // video2 then loops forever as a persistent backdrop, fully
      // independent of scroll position or any page state.
      gsap.set(video1, { opacity: 0 });
      gsap.set(video2, { opacity: 1 });
      video2.currentTime = 0;
      video2.play().catch(() => {});
    }

    video1.addEventListener('ended', handToVideo2);
    // Safety net: if video1 fails to load/play at all (autoplay
    // block, network error, etc.) don't leave video2 silently never
    // starting — fall through after a generous timeout.
    video1.addEventListener('error', handToVideo2);
    setTimeout(() => { if (!handedOff) handToVideo2(); }, 12000);
  })();

  /* ============================================================
     PART 2 — PHOTOS conveyor: pinned, scroll-scrubbed single row.
     Direct adaptation of app.js's setupConveyor() (see that file's
     SECTIONS 4/6/7 comment block for the full reasoning behind each
     piece below) — trimmed to the PHOTOS ("tilt") case only, since
     /photos is a standalone page bundle with its own single
     conveyor instance (unlike app.js which drives three).
     ============================================================ */
  (function setupPhotosConveyor() {
    const section = document.getElementById('photos-conveyor-section');
    const frame = document.getElementById('photos-conveyor-frame');
    if (!section || !frame) return;

    const items = gsap.utils.toArray(frame.querySelectorAll('.thumb-item'));
    const count = items.length;
    if (!count) return;
    const dots = document.querySelectorAll('#photos-conveyor-dots .carousel-dot');
    const filterList = document.getElementById('photos-category-filter');

    gsap.set(items, { xPercent: -50, yPercent: -50 });

    const TILT_JITTER_DEG = [0, 2, -2, 3, -1, -3, 1, 2, -2, 0];
    const TILT_SLOPE_DEG = 4;
    const TILT_MAX_DEG = 14;

    let spacing = 260;
    let edgeMargin = 1;
    function computeSpacing() {
      const w = items[0] ? items[0].getBoundingClientRect().width : frame.getBoundingClientRect().width;
      spacing = w + 46;
      const frameW = frame.getBoundingClientRect().width;
      const needed = frameW / 2 + w / 2;
      edgeMargin = Math.max(1, Math.ceil(needed / spacing));
    }
    computeSpacing();

    let lastActiveIdx = -1;

    function setActiveCategoryPill(idx) {
      if (!filterList) return;
      filterList.querySelectorAll('.detail-filter-pill').forEach((pill) => {
        pill.classList.toggle('active', Number(pill.dataset.catIndex) === idx);
      });
    }

    function render(t) {
      const curIdx = -edgeMargin + t * (count - 1 + 2 * edgeMargin);
      items.forEach((item, i) => {
        const dist = i - curIdx;
        const jitter = TILT_JITTER_DEG[((i % TILT_JITTER_DEG.length) + TILT_JITTER_DEG.length) % TILT_JITTER_DEG.length];
        const slope = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, dist * TILT_SLOPE_DEG));
        gsap.set(item, { x: dist * spacing, rotation: jitter + slope });
      });

      const activeIdx = Math.max(0, Math.min(count - 1, Math.round(curIdx)));
      if (activeIdx !== lastActiveIdx) {
        lastActiveIdx = activeIdx;
        dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
        const catIdx = Math.floor(activeIdx / 2);
        setActiveCategoryPill(catIdx);
      }
    }
    render(0);

    // PIN the conveyor section for the duration of its scrub run —
    // same mechanism as HOME's setupConveyor(): the section stays put
    // at the top of the viewport while cards slide through, and only
    // once the last card fully exits does the pin release and normal
    // scroll continue on into the rest of the document.
    const pinPercentPerItem = 22;
    const pinDistance = pinPercentPerItem * count;
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + pinDistance + '%',
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => { computeSpacing(); render(self.progress); },
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  })();
})();
