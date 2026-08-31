/* ============================================================
   /photos page script — two independent pieces:

   1) Video hero backdrop: video-1 (campfire -> Milky Way pull-back)
      is scroll-scrubbed (NOT autoplaying in real time) across the
      pinned #photos-hero-panel section — its `currentTime` is tied
      1:1 to that pin's own ScrollTrigger progress, so scrolling down
      plays the clip forward frame-by-frame and scrolling back up
      rewinds it, exactly like HOME's setupFixedBgVideo()/
      cubeScrubRenderer scrubs bg-video-1a off the intro-pin's
      progress. Once the scrub reaches its own end (progress ~1,
      i.e. the pin is about to release), it hard-cuts to video-2 (a
      seamless starfield loop), which THEN plays/loops forever in
      real time as a PERSISTENT fixed backdrop (position:fixed,
      z-index:0 — see #photos-hero-video-layer in style.css),
      decoupled from scroll from that point on — same "video2 keeps
      looping no matter what the user does with scroll" behavior
      established in Round 2 ("스크롤 다운으로 넘어갈 수 있게끔해줘. 다만
      두번째 영상은 계속 룹이야"), just reached via a scroll-driven scrub
      of video-1 instead of a real-time autoplay per Round 8 feedback
      ("포토에서 처음 영상 시작부터 스크롤다운으로 반응연동형 재생이
      되어야해. 오토 플레이가 먹히는 영상이 아니구"). ROUND 8.1
      follow-up ("스크롤 업에도 반응해줘야될 거 같아"): the hand-off to
      video-2 is now REVERSIBLE — scrolling back up into the pin's own
      range after already reaching video-2 (onEnterBack) un-hands-off
      back to video-1's scrub, so up/down scroll stays reactive across
      the video1<->video2 boundary too, not just within video-1's own
      range.

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
     PART 1 — video hero backdrop: video-1 scroll-scrubbed via a
     PINNED #photos-hero-panel, then hard-cuts to video-2 (persistent
     real-time loop) once the scrub reaches its own end.
     ============================================================ */
  (function setupHeroVideo() {
    const panel = document.getElementById('photos-hero-panel');
    const video1 = document.getElementById('photos-hero-video-1');
    const video2 = document.getElementById('photos-hero-video-2');
    if (!panel || !video1 || !video2) return;

    /* Root-cause fix for scroll-scrubbed <video> seeking (same as
       app.js/about.js's blobifySeekableVideo — see that file's
       top-of-file comment for the full explanation): this server
       serves video files as a single non-range-seekable 200 OK
       response, so `seekable` stays a degenerate [[0,0]] and any
       `currentTime` assignment silently clamps back to 0 unless the
       <video> is pointed at a local Blob URL instead. video-1 MUST
       be scrub-seekable from the very first scroll tick (there is no
       autoplay to mask a not-yet-ready currentTime write anymore), so
       it blobifies immediately/first; video-2 (which only ever plays
       forward in real time once handed off) is staggered slightly to
       avoid the simultaneous-decoder-init compositor cross-talk bug
       documented alongside blobifySeekableVideo() in app.js. */
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

    let dur1 = 8.0; // fallback until loadedmetadata resolves the real duration
    video1.addEventListener('loadedmetadata', () => { if (video1.duration) dur1 = video1.duration; });

    const scrollCue = document.getElementById('photos-scroll-cue');

    let handedOff = false;
    let broken = false; // set only by the error/timeout safety net below —
    // once video-1 is confirmed unplayable there is nothing to scrub back
    // to, so onEnterBack must NOT try to revive it in that case.
    function handToVideo2(isBroken) {
      if (handedOff) return;
      handedOff = true;
      if (isBroken) broken = true;
      // Hard-cut video1 -> video2 (this site's established
      // no-crossfade convention — see setupVideosBgVideo() in app.js).
      // video2 then plays/loops forever in real time as a persistent
      // backdrop, fully independent of scroll position from this
      // point on (exactly the Round-2 behavior, just reached via a
      // scroll-driven scrub of video-1 instead of a real-time
      // autoplay+'ended' handoff).
      gsap.set(video1, { opacity: 0 });
      gsap.set(video2, { opacity: 1 });
      video2.currentTime = 0;
      video2.play().catch(() => {});
      if (scrollCue) scrollCue.style.opacity = '0';
    }

    // Un-hand-off back to video-1's scrub when the user scrolls back UP
    // into the pin range after having already reached video-2 (ROUND 8.1
    // follow-up: "스크롤 업에도 반응해줘야될 거 같아" — the scrub must be
    // reversible even across the video1->video2 boundary, not just within
    // it). video-2 pauses and hides; video-1 reappears and resumes tracking
    // the pin's own progress from wherever the user has scrolled back to.
    function handBackToVideo1(p) {
      if (!handedOff || broken) return;
      handedOff = false;
      video2.pause();
      gsap.set(video2, { opacity: 0 });
      gsap.set(video1, { opacity: 1 });
      renderHeroScrub(p);
    }

    // Scroll-scrub video-1's currentTime 0 -> its own duration across
    // the pin's own 0 -> 1 progress — same "pin + scrub currentTime
    // 1:1" mechanism HOME's setupFixedBgVideo() uses for bg-video-1a
    // off the intro-pin ScrollTrigger. Per explicit spec ("처음 영상
    // 시작부터 스크롤다운으로 반응연동형 재생이 되어야해"), this must be
    // reactive from t=0 -- there is no autoplay/real-time fallback at
    // all: the clip's only source of forward motion is the user's own
    // scroll position (scrolling back up rewinds it, exactly like
    // bg-video-1a).
    function renderHeroScrub(p) {
      if (handedOff) return;
      const t = Math.max(0, Math.min(1, p)) * dur1;
      if (video1.readyState > 0 && Number.isFinite(t)) {
        video1.currentTime = t;
      }
      // fade the "SCROLL" cue out early in the scrub -- once the user
      // has demonstrably started scrolling there is no need to keep
      // prompting them, same "fade the cue out almost immediately
      // once progress leaves 0" convention ABOUT's own pinned hero
      // uses for #about-scroll-cue.
      if (scrollCue) scrollCue.style.opacity = p > 0.06 ? '0' : '1';
    }
    renderHeroScrub(0);

    ScrollTrigger.create({
      id: 'photos-hero-scrub',
      trigger: panel,
      start: 'top top',
      end: '+=140%',
      pin: true,
      pinSpacing: true,
      scrub: 0.3,
      onUpdate: (self) => renderHeroScrub(self.progress),
      onRefresh: (self) => renderHeroScrub(self.progress),
      // Reaching the very end of the scrub (scrolling forward past
      // progress 1, i.e. the pin's own release point) is exactly when
      // video-1 has finished playing out its full duration -- hand
      // off to video-2's persistent real-time loop right here. Rapid
      // scroll-flings can cross straight from progress<1 to onLeave
      // without onUpdate ever reporting progress===1, so onLeave is
      // the correct place for the handoff, not a progress===1 check
      // inside onUpdate.
      onLeave: () => handToVideo2(),
      // Scrolling back DOWN into the pin range from below (i.e. the
      // user had already scrolled past it onto video-2, and is now
      // scrolling back up into the pin's own scrub distance again) —
      // must un-hand-off back to video-1 so the scrub is reversible
      // across the video1->video2 boundary too, not just within it
      // (ROUND 8.1: "스크롤 업에도 반응해줘야될 거 같아"). self.progress
      // is ~1 right at this crossing, so video-1 resumes essentially
      // at its own last frame -- no visible jump.
      onEnterBack: (self) => handBackToVideo1(self.progress),
      // Scrolling back up above the pin's own start (before it has
      // even engaged) is the only rewind case that needs video-1's
      // very first frame restored explicitly -- onUpdate already
      // handles every other backward-scrub position while the pin is
      // still active.
      onLeaveBack: () => {
        if (handedOff) return;
        renderHeroScrub(0);
        if (scrollCue) scrollCue.style.opacity = '1';
      },
    });

    // Safety net: if video-1 fails to load/decode at all (network
    // error, unsupported codec, etc.) don't leave the page stuck on a
    // frozen first frame forever with no way to reach the persistent
    // video-2 backdrop -- fall through after a generous timeout.
    video1.addEventListener('error', () => handToVideo2(true));
    setTimeout(() => { if (!handedOff && video1.readyState === 0) handToVideo2(true); }, 12000);
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
