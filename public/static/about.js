/* ============================================================
   ABOUT ME (/about) — scroll-interactive sequence
   GSAP + ScrollTrigger, following the same "one dominant pinned
   ScrollTrigger, many renderer functions reading the same local
   progress p" architecture used throughout the HOME page's own
   scroll chains (see app.js's setupVideosBgVideo()/setupWorkReel()
   for the reference pattern this file mirrors).

   ROUND 4 NOTE: the earlier coded starfield/cosmic-dust <canvas>
   background (its own independent requestAnimationFrame time-loop,
   not scroll-driven) has been removed — video2 (the real starfield-
   loop clip) now simply loops forever as the backdrop instead of
   handing off to that synthetic canvas once it played through once
   (see the video2.loop assignment and DISSOLVE section below).
   ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- mobile 100vh fix (same fix as app.js, this page loads
     independently and does not include app.js) ---------- */
  function setVH() {
    document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);

  /* ============================================================
     ROOT-CAUSE FIX for scroll-scrubbed <video> seeking — identical
     issue/fix as app.js's blobifySeekableVideo() (this server does
     not support byte-range/206 requests, so a network-backed <video>
     element's `seekable` stays a degenerate [[0,0]] and currentTime
     assignment silently clamps to 0). Duplicated here rather than
     imported since about.html does not load app.js at all (it is a
     fully separate page bundle, same separation as detail-page.js
     for /photos and /videos).
     ============================================================ */
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

  function prewarmSeek(video, t) {
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = t;
    });
    if (video.readyState > 0) video.currentTime = t;
  }

  const heroSection = document.getElementById('section-about-hero');
  const layer = document.getElementById('about-bg-video-layer');
  const video1 = document.getElementById('about-bg-video-1');
  const video2 = document.getElementById('about-bg-video-2');
  const introCrawlViewport = document.getElementById('about-intro-crawl-viewport');
  const introCrawlText = document.getElementById('about-intro-crawl-text');
  const titleEl = document.getElementById('about-title-text');
  const titleJune = document.getElementById('about-title-june');
  const titleHong = document.getElementById('about-title-hong');
  const titleSubtitle = document.getElementById('about-title-subtitle');
  const photoEl = document.getElementById('about-photo-reveal');
  const crawlViewport = document.getElementById('about-crawl-viewport');
  const crawlText = document.getElementById('about-crawl-text');
  const scrollCue = document.getElementById('about-scroll-cue');

  if (!heroSection || !layer || !video1 || !video2) return;

  /* ============================================================
     BLACK-FLASH-AT-START FIX
     video1's own genuine first frame (t=0) is NOT black — it is the
     lit campfire shot (confirmed via direct frame extraction). The
     flash the user saw was a LOADING gap: gsap.set(video1,{opacity:1})
     makes the <video> element visible immediately, but a fresh
     <video> has readyState 0 (HAVE_NOTHING) and renders as a plain
     black box until its first frame actually decodes — and
     blobifySeekableVideo() below makes it briefly reload again (via
     video.load()) after swapping to a Blob URL, which resets
     readyState to 0 a second time. Both gaps are now bridged by the
     poster="about-bg-01-poster.jpg" attribute added in about.html — a
     still frame extracted from this exact clip's t=0, which every
     browser displays in place of the black box for as long as
     readyState stays at 0. Once real video data is ready it swaps to
     the live frame, which is visually identical to the poster, so
     the transition is seamless. prewarmSeek(video1, 0) below is then
     just an explicit safety net that keeps currentTime pinned to 0
     once metadata is available, rather than the fix itself.
     ============================================================ */
  blobifySeekableVideo(video1, 0);
  prewarmSeek(video1, 0);
  gsap.set([video1, video2], { opacity: 0 });
  gsap.set(video1, { opacity: 1 });

  const V1_DURATION = 8.0;
  function seekVideo1(localP) {
    const t = Math.max(0, Math.min(1, localP)) * V1_DURATION;
    if (video1.readyState > 0 && Number.isFinite(t)) {
      video1.currentTime = t;
    }
  }

  /* ============================================================
     ROUND 4 ITEM 2 ("차라리 두번째 영상을 룹으로 계속 돌려줘"): video2
     (the 4s starfield loop) is NOT scroll-scrubbed — it is a real-time
     ambient clip that now simply LOOPS FOREVER as the page's backdrop
     for the rest of the pinned sequence, instead of playing once then
     handing off to a coded <canvas> procedural starfield (the old
     Round 2 item 7 behavior — removed). video2.loop = true (also set
     as a `loop` attribute in the markup, this is belt-and-suspenders)
     means the browser itself restarts playback at 0 on 'ended', so no
     JS is needed to keep it going; the old videoTwoHolding /
     videoTwoEverEnded hold-then-handoff flags no longer exist since
     there is no more handoff state to track.
     ============================================================ */
  video2.loop = true;

  /* ============================================================
     Phase boundaries — all fractions of the pinned hero's own local
     scroll progress p ∈ [0,1].

     PHASE_V1_END: video1 (campfire -> pulls back into the Milky Way,
     8s) scrubs 1:1 with scroll across [0, PHASE_V1_END].

     DISSOLVE_WIDTH: explicit, DELIBERATE exception to this site's
     established hard-cut-only video-chain convention (see the long
     comment on setupVideosBgVideo()/renderVideosChain() in app.js —
     "투명도 조절없이 원본 그대로", i.e. no opacity blending, ever, is
     the rule everywhere else on the site). The user's spec for THIS
     page explicitly asked for a dissolve at exactly this one handoff
     ("우주 장면을 디졸브 시켜서 이을 거야"), so it is honored here —
     but ONLY here: nothing else on this page or site crossfades.
     A narrow width keeps it reading as a deliberate dissolve rather
     than a long, mushy cross-fade.

     After the dissolve, video2 (Round 4: video2.loop = true) simply
     loops forever in real time as the persistent ambient backdrop for
     the rest of the page — see the video2.loop assignment above.
     ============================================================ */
  const PHASE_V1_END = 0.30;
  const DISSOLVE_WIDTH = 0.05;
  const DISSOLVE_START = PHASE_V1_END - DISSOLVE_WIDTH / 2;
  const DISSOLVE_END = PHASE_V1_END + DISSOLVE_WIDTH / 2;

  // ------------------------------------------------------------
  // Phase timeline (Round 4 revision). Two design modes coexist:
  //   (a) SEQUENTIAL, gapped handoffs (prologue line -> title+photo
  //       group -> bio -> closing crawl) — each phase fully clears
  //       (opacity 0) before the next one's IN_START, so big scene
  //       changes never visually collide. Round 4 item 3 moved BIO
  //       from mode (b) back into this sequential mode.
  //   (b) A LAYERED, simultaneous pair (title + photo only) — the
  //       user asked for the photo to sit BEHIND the JUNE/HONG title
  //       ("june hong뒤에 배치해줘", i.e. at the same time, not after),
  //       so PHOTO shares TITLE's exact IN/OUT window (stacked behind
  //       it via z-index in style.css) and the two fade in/out as one.
  // ------------------------------------------------------------

  // Prologue line — Round 4 item 1 ("화면 하단에서 나타나지만 이
  // 문장만큼은 2d 느낌으로 센터에서 고정되었다 저 멀리 우주로 꺼지는
  // 느낌으로"). Replaces the old two-line rotateX/perspective crawl
  // with a SINGLE flat (no tilt, ever) line that: (1) rises straight
  // up from below the viewport while fading in, (2) HOLDS flat and
  // dead-center (both axes) for a beat, then (3) shrinks + fades as if
  // drifting away into deep space — a scale-down + opacity recede, not
  // a 3D perspective fold, so it always reads as a flat 2D element.
  const INTRO_TEXT_IN_START = DISSOLVE_END + 0.02;
  const INTRO_TEXT_IN_END = INTRO_TEXT_IN_START + 0.05;
  const INTRO_TEXT_HOLD_END = 0.44;
  const INTRO_TEXT_OUT_END = 0.50;
  const INTRO_TEXT_RISE_VH = 34; // starts this far below dead-center, rises to 0

  // Title card — "JUNE / subtitle / HONG", pichiworld's two-word
  // logo-reveal-with-subtitle-between pattern. Begins only after the
  // intro crawl has fully cleared (0.50 -> 0.53 gap).
  const TITLE_IN_START = 0.53;
  const TITLE_IN_END = 0.59;
  const TITLE_OUT_START = 0.64;
  const TITLE_OUT_END = 0.68;

  // Profile-photo reveal — Round 3 item 2: now LAYERED behind the
  // title (same IN/OUT window, stacked underneath via z-index in
  // style.css) instead of appearing sequentially after it fades.
  const PHOTO_IN_START = TITLE_IN_START;
  const PHOTO_IN_END = TITLE_IN_END;
  const PHOTO_OUT_START = TITLE_OUT_START;
  const PHOTO_OUT_END = TITLE_OUT_END;

  // Closing opening crawl — 3D perspective paragraph receding up/back
  // into the starfield, carrying the full bio copy. Opacity ramps in
  // over a short window; the perspective translateY itself is a
  // continuous function of p across the WHOLE remaining span so the
  // recede motion reads as one continuous scroll-driven camera move.
  //
  // Round 6 ("June Hong 이름의 페이드아웃 시작점에 두번째 이미지가
  // 흘러나와야돼" -- the second scene (starfield + crawl copy) must
  // start flowing in exactly at the moment the JUNE/HONG title begins
  // its own fade-out, not before it): CRAWL_IN_START/END are now
  // aliased directly to TITLE_OUT_START/END so the two are driven by
  // the same p-window and can never drift out of sync with each other
  // again — as JUNE/HONG fades out, the crawl fades in over the exact
  // same span (was 0.60-0.65, starting before the title faded at all;
  // Round 5's "before it shrinks" request is superseded by this one).
  const CRAWL_IN_START = TITLE_OUT_START;
  const CRAWL_IN_END = TITLE_OUT_END;
  const CRAWL_RUN_START = CRAWL_IN_START;
  const CRAWL_RUN_END = 0.995;
  const CRAWL_Y_START = 78; // vh, bottom of viewport
  const CRAWL_Y_END = -60; // vh, receded up past the top
  // Shallow, legible tilt matching the pichiworld reference screenshot
  // (was 55deg — far too steep to read, per user feedback). Kept as a
  // named constant here so the JS-driven inline transform and the CSS
  // default (.about-crawl-text { transform: rotateX(22deg) ... }) can
  // never drift out of sync with each other.
  const CRAWL_TILT_DEG = 22;

  // Everything (bg layer + all overlays) fades out right before the
  // pin releases, so the handoff into the plain, non-animated profile
  // section (photo + bio) below reads as a clean scene change rather
  // than an abrupt jump.
  const OUTRO_START = 0.94;
  const OUTRO_END = 1.0;

  const easeInOut = gsap.parseEase('power2.inOut');

  function windowedOpacity(p, inStart, inEnd, outStart, outEnd) {
    if (p < inStart) return 0;
    if (p < inEnd) return easeInOut(Math.max(0, Math.min(1, (p - inStart) / (inEnd - inStart))));
    if (p < outStart) return 1;
    if (p < outEnd) return 1 - easeInOut(Math.max(0, Math.min(1, (p - outStart) / (outEnd - outStart))));
    return 0;
  }

  function renderAboutHero(p) {
    p = Math.max(0, Math.min(1, p));

    // ---- layer opacity ----
    // Fully visible from the very first frame (p=0, the top of the pinned
    // hero) -- NO fade-in ramp. This mirrors the exact fix already applied
    // to HOME's #fixed-bg-video (see renderLayerOpacity()'s comment in
    // app.js): the user lands directly on this section with the campfire
    // clip already meant to be showing, so ramping opacity 0->1 over the
    // first 3% of scroll made the page open on a black screen instead of
    // the video's real first frame -- exactly the "검은 화면이 아니라
    // 영상의 시작점에 맞춰줘" bug report. Only the OUTRO fade (pin
    // release) still applies.
    const outroFactor = 1 - easeInOut(Math.max(0, Math.min(1, (p - OUTRO_START) / (OUTRO_END - OUTRO_START))));
    layer.style.opacity = outroFactor;

    // ---- video1 scrub + dissolve handoff into video2 ----
    const local1 = PHASE_V1_END > 0 ? p / PHASE_V1_END : 1;
    seekVideo1(local1);
    if (p <= DISSOLVE_START) {
      video1.style.opacity = 1;
      video2.style.opacity = 0;
    } else if (p >= DISSOLVE_END) {
      video1.style.opacity = 0;
      video2.style.opacity = 1;
      if (video2.paused) video2.play().catch(() => {});
    } else {
      const t = easeInOut((p - DISSOLVE_START) / DISSOLVE_WIDTH);
      video1.style.opacity = 1 - t;
      video2.style.opacity = t;
      if (video2.paused) video2.play().catch(() => {});
    }

    // ---- prologue line — Round 4 item 1 ----
    // Flat/2D (no rotateX, ever), three-beat motion driven purely by
    // opacity + translateY + scale:
    //   1) IN_START -> IN_END: fades in while rising from
    //      +INTRO_TEXT_RISE_VH up to dead-center (translateY 0), at
    //      normal scale (1) -- "화면 하단에서 나타나지만".
    //   2) IN_END -> HOLD_END: holds fully opaque, flat, dead-center
    //      (both axes, via the viewport's own flex centering in
    //      style.css) -- "이 문장만큼은 2d 느낌으로 센터에서 고정".
    //   3) HOLD_END -> OUT_END: scales up slightly + fades out, as if
    //      drifting away from the camera into deep space -- "저 멀리
    //      우주로 꺼지는 느낌".
    if (introCrawlViewport && introCrawlText) {
      let opacity = 0;
      let y = INTRO_TEXT_RISE_VH;
      let scale = 1;
      if (p < INTRO_TEXT_IN_START) {
        opacity = 0;
        y = INTRO_TEXT_RISE_VH;
        scale = 1;
      } else if (p < INTRO_TEXT_IN_END) {
        const t = easeInOut((p - INTRO_TEXT_IN_START) / (INTRO_TEXT_IN_END - INTRO_TEXT_IN_START));
        opacity = t;
        y = INTRO_TEXT_RISE_VH * (1 - t);
        scale = 1;
      } else if (p < INTRO_TEXT_HOLD_END) {
        opacity = 1;
        y = 0;
        scale = 1;
      } else if (p < INTRO_TEXT_OUT_END) {
        const t = easeInOut((p - INTRO_TEXT_HOLD_END) / (INTRO_TEXT_OUT_END - INTRO_TEXT_HOLD_END));
        opacity = 1 - t;
        y = 0;
        // Receding "into the cosmos" reads as the text drifting FURTHER
        // away, i.e. shrinking -- not growing -- while it fades.
        scale = 1 - 0.55 * t;
      } else {
        opacity = 0;
        y = 0;
        scale = 0.45;
      }
      introCrawlViewport.style.opacity = opacity;
      introCrawlText.style.transform = `translateY(${y}vh) scale(${scale})`;
    }

    // ---- title card ----
    if (titleEl) {
      const to = windowedOpacity(p, TITLE_IN_START, TITLE_IN_END, TITLE_OUT_START, TITLE_OUT_END);
      titleEl.style.opacity = to;
      const rise = 1 - Math.max(0, Math.min(1, (p - TITLE_IN_START) / (TITLE_IN_END - TITLE_IN_START)));
      if (titleJune) titleJune.style.transform = `translateY(${rise * -18}px)`;
      if (titleHong) titleHong.style.transform = `translateY(${rise * 18}px)`;
      if (titleSubtitle) titleSubtitle.style.letterSpacing = (0.32 + (1 - rise) * 0.1) + 'em';
    }

    // ---- profile-photo reveal — layered BEHIND the title, sharing
    // its exact IN/OUT window (see PHOTO_IN_*/PHOTO_OUT_* above,
    // aliased directly to TITLE_IN_*/TITLE_OUT_*). Stacking order
    // (behind vs. in front) is handled purely by z-index in style.css;
    // sizing/feathering (Round 4 item 4) is handled purely in CSS too. ----
    if (photoEl) {
      const po = windowedOpacity(p, PHOTO_IN_START, PHOTO_IN_END, PHOTO_OUT_START, PHOTO_OUT_END);
      photoEl.style.opacity = po;
      const riseP = Math.max(0, Math.min(1, (p - PHOTO_IN_START) / (PHOTO_IN_END - PHOTO_IN_START)));
      const scale = 0.88 + 0.12 * easeInOut(riseP);
      const rise = (1 - easeInOut(riseP)) * 26;
      photoEl.style.transform = `translateY(${rise}px) scale(${scale})`;
    }

    // ---- opening crawl (3D perspective, continuous recede) ----
    if (crawlViewport && crawlText) {
      const co = windowedOpacity(p, CRAWL_IN_START, CRAWL_IN_END, OUTRO_START, OUTRO_END);
      crawlViewport.style.opacity = co;
      const runP = Math.max(0, Math.min(1, (p - CRAWL_RUN_START) / (CRAWL_RUN_END - CRAWL_RUN_START)));
      const y = CRAWL_Y_START + (CRAWL_Y_END - CRAWL_Y_START) * runP;
      crawlText.style.transform = `rotateX(${CRAWL_TILT_DEG}deg) translateY(${y}vh)`;
    }

    // ---- scroll cue fades once the story actually gets going ----
    if (scrollCue) {
      scrollCue.style.opacity = p > 0.06 ? '0' : '1';
    }
  }

  renderAboutHero(0);

  ScrollTrigger.create({
    id: 'about-hero-pin',
    trigger: heroSection,
    start: 'top top',
    end: '+=620%',
    pin: true,
    scrub: 0.5,
    onUpdate: (self) => renderAboutHero(self.progress),
    onRefresh: (self) => renderAboutHero(self.progress),
  });

  /* ---------- resting profile section reveal (photo + bio) ---------- */
  document.querySelectorAll('.about-panel [data-reveal]').forEach((el) => {
    gsap.set(el, { opacity: 0, y: 28 });
  });
  const profileWrap = document.querySelector('.about-profile-wrap');
  if (profileWrap) {
    const items = profileWrap.querySelectorAll('[data-reveal]');
    ScrollTrigger.create({
      trigger: profileWrap,
      start: 'top 80%',
      onEnter: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }),
      onEnterBack: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }),
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
