/* ============================================================
   Be the ONE — Scroll Interactive Portfolio
   GSAP + ScrollTrigger driven scroll animations
   ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // Declared up here (ahead of setupClientWall()'s own call site further
  // below) specifically to avoid a `let`-hoisting TDZ ReferenceError:
  // setupClientWall('section-2') runs and assigns this variable well
  // before execution reaches the "Shared timeline breakpoints" block
  // further down where cubeScrubRenderer/workReelScrubRenderer are
  // declared -- see the long comment next to those two for the shared
  // "direct call, not a second independent ScrollTrigger" rationale this
  // variable follows for the exact same reason.
  let workReelWallPreRiseRenderer = null;

  /* ============================================================
     ROOT-CAUSE FIX for every scroll-scrubbed <video> on the page
     silently failing to seek (currentTime stuck at 0, or only ever
     advancing via real-time playback) -- confirmed via direct testing:
     when a <video>'s src points at a normal network URL, this server
     serves the file as a single chunked 200 OK response with NO
     Accept-Ranges/206 support (verified with curl -H "Range: ..." --
     it always returns 200, never 206). Per the HTML spec a video
     element's `seekable` TimeRanges is derived from what the network
     resource can ACTUALLY be byte-range-seeked to; with no server-side
     range support, `seekable` stays a degenerate [[0,0]] no matter how
     much of the file is already buffered/decoded, so any explicit
     `video.currentTime = t` assignment silently clamps back to 0 --
     this is true for every video on the site (old and new alike),
     which is exactly why it looked like a fixed-bg-video pause/jump
     during the section-1 -> section-2 hand-off AND an apparent
     dissolve/hard-cut ambiguity between the PHOTOS videos: the visible
     clip was never actually scrubbing frame-by-frame at all, only ever
     snapping into place once playback (or the opacity swap) caught up.
     FIX: fetch() the whole (small, already-optimized-for-web) file as a
     Blob and point the <video> at a `URL.createObjectURL(blob)` instead
     of the network URL. A Blob URL's data is fully local to the page,
     so the browser can seek it freely -- `seekable` immediately reports
     the video's true full duration and `currentTime` assignment works
     instantly, with no dependency on server range support at all. This
     is applied uniformly to every scroll-scrubbed clip (bg-video-1a/1b/
     2/4/5/6 and photos-bg-video-7/8) via blobifySeekableVideo() below,
     called once per video as soon as the page loads.
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
        .catch(() => {
          // Network hiccup -- leave the original network src in place; the
          // video still plays/displays normally, it just won't be
          // frame-accurately scrub-seekable until a page reload retries.
        });
    };
    // BUG FIX (this turn): "왜 섹션 1에 이 영상이 보이는 거야?" -- torch
    // (bg-video-6) was visibly painted INSIDE bg-video-1a's own box on
    // first paint, even though bg-video-1a's own JS-readable state
    // (currentTime, and a <canvas> drawImage() readback of its true
    // decoded frame) was always correct (dark, matches-consistent).
    // Isolating the DOM to bg-video-1a alone (display:none on all 5
    // other <video> elements) did NOT fix it -- the wrong texture was
    // already latched onto that element's compositor layer. Root cause:
    // ALL 6 fixed-bg videos called blobifySeekableVideo() -> fetch ->
    // URL.createObjectURL -> video.load() in the SAME tick on page load
    // (videos.forEach(v => blobifySeekableVideo(v))), so Chromium was
    // simultaneously (re)initializing 6 video decoders/compositor
    // textures at once; under that load it can cross-wire which decoded
    // texture gets composited into which <video> element's layer -- a
    // browser compositor bug, not an app-logic bug (confirmed: disabling
    // GPU/hardware video decode did not fix it, and the wrong frame was
    // visible with a completely fresh page load, no scrolling). FIX:
    // stagger each video's own load() by delayMs so at most one decoder
    // is being (re)initialized at a time -- the visible one (index 0,
    // delay 0) blobifies immediately/alone, every other still-hidden
    // clip's own reload is spread out afterward, eliminating the
    // simultaneous-init race that caused the cross-talk.
    if (delayMs) {
      setTimeout(run, delayMs);
    } else {
      run();
    }
  }

  /* ---------- mobile 100vh fix ---------- */
  function setVH() {
    document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);

  /* ---------- inject real media from media-config.js ---------- */
  function injectMedia() {
    const MEDIA = window.SITE_MEDIA || {};
    const isVideo = (src) => /\.(mp4|webm|mov)(\?.*)?$/i.test(src || '');

    function fill(el, src) {
      if (!src) return;
      el.classList.add('has-media');
      let node;
      if (isVideo(src)) {
        node = document.createElement('video');
        node.src = src;
        node.autoplay = true;
        node.muted = true;
        node.loop = true;
        node.playsInline = true;
      } else {
        node = document.createElement('img');
        node.src = src;
        node.alt = '';
      }
      el.appendChild(node);
    }

    // cube faces -- 12 thumbnails across 6 faces x 2 slots (a/b). Slot a
    // (images 0-5) shows during the cube's 1st lap, slot b (images 6-11)
    // during the 2nd lap; renderIntro() below crossfades between them.
    (MEDIA.cube || []).forEach((src, i) => {
      if (!src) return;
      const faceIndex = i % 6;
      const slot = i < 6 ? 'a' : 'b';
      const slotEl = document.querySelector(`[data-cube-face-slot="${faceIndex}:${slot}"]`);
      if (!slotEl) return;
      fill(slotEl, src);
      const faceEl = slotEl.closest('.cube-face');
      if (faceEl) faceEl.classList.add('has-media');
    });

    // simple single slots (section2Media removed -- now hardcoded into the
    // fixed background video layer, see #fixed-bg-video / setupFixedBgVideo())
    ['splitPhoto', 'photosIntroImage', 'videosIntroThumb'].forEach((key) => {
      const src = MEDIA[key];
      if (!src) return;
      document.querySelectorAll(`[data-media-slot="${key}"]`).forEach((el) => {
        if (el.classList.contains('title-bg-media')) {
          if (isVideo(src)) {
            el.style.background = 'none';
            const v = document.createElement('video');
            v.src = src; v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
            v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
            el.appendChild(v);
          } else {
            el.style.backgroundImage = `url(${src})`;
          }
        } else {
          fill(el, src);
        }
      });
    });

    // arrays: photoCards, landscapeVideos, reelVideos
    ['photoCards', 'landscapeVideos', 'reelVideos'].forEach((key) => {
      (MEDIA[key] || []).forEach((src, i) => {
        const el = document.querySelector(`[data-media-slot="${key}:${i}"]`);
        if (el) fill(el, src);
      });
    });

  }
  injectMedia();

  /* ---------- reveal animations per panel ---------- */
  // BUG FIX (Bug 7, this turn -- "왜 성냥이 프레임인된채로 멈춰있다 영상이
  // 시작되는 거지?"): section-1 is the page's own LANDING panel -- the user
  // is already looking straight at it on first paint, scrollY=0, with NO
  // scroll gesture having happened yet. The old code wired EVERY panel's
  // [data-reveal] items (.eyebrow/.hero-title here) through a ScrollTrigger
  // gated on 'top 65%' onEnter -- which, for a panel already sitting at the
  // very top of the viewport before any scroll, never reliably fires its
  // onEnter on the very first render pass (ScrollTrigger's initial state
  // check races page layout/font/video-metadata loading), OR fires it and
  // then a later refresh (triggered by any late-loading resource shifting
  // document height, the same class of desync fixed for Bug 6) replays
  // onLeaveBack and hides the text again. Either way the effect is exactly
  // the user's report: the background video (bg-video-1a, which has no
  // such CSS/JS gating and is simply always-visible) plays normally, but
  // the hero text/eyebrow -- and by extension the sense that the whole
  // scene is "live" -- stays hidden/frozen until some later, unrelated
  // event finally fires the reveal. FIX: section-1's own [data-reveal]
  // items are shown immediately (no ScrollTrigger dependency at all) since
  // they must already be visible on cold load; only panels the user
  // actually has to SCROLL TO ('top 65%' meaningfully describes scrolling
  // the panel up from below) keep the onEnter/onEnterBack/onLeaveBack
  // scroll-gated reveal.
  document.querySelectorAll('.panel').forEach((panel) => {
    const items = panel.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (panel.id === 'section-1') {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
    ScrollTrigger.create({
      trigger: panel,
      start: 'top 65%',
      onEnter: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }),
      onEnterBack: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }),
      onLeaveBack: () => gsap.to(items, { opacity: 0, y: 28, duration: 0.4, ease: 'power2.in' }),
    });
  });

  /* ---------- global progress bar + page-wide hue-shift ---------- */
  // Continuous scroll-reactive color: the ambient glow blobs (and the
  // whole page's accent hue) slowly rotate through the spectrum as the
  // user scrolls from top to bottom of the entire experience, so there
  // is always something visibly reacting to scroll position beyond the
  // per-section text effects below.
  const glowEls = gsap.utils.toArray('.glow');
  ScrollTrigger.create({
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      document.getElementById('progress-fill').style.width = (self.progress * 100).toFixed(2) + '%';
      const hue = self.progress * 260; // sweep ~260deg across the full scroll
      glowEls.forEach((g) => { g.style.filter = `blur(90px) hue-rotate(${hue}deg)`; });
      document.documentElement.style.setProperty('--scroll-hue', hue.toFixed(1) + 'deg');
    },
  });

  /* ---------- dot navigation: active state + click to scroll ---------- */
  const panels = gsap.utils.toArray('.panel');
  const dots = gsap.utils.toArray('#dot-nav .dot');

  function goToPanel(i) {
    if (panels[i]) panels[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const panelActiveTriggers = panels.map((panel, i) => ScrollTrigger.create({
    trigger: panel,
    start: 'top center',
    end: 'bottom center',
    onEnter: () => setActiveSection(i),
    onEnterBack: () => setActiveSection(i),
  }));

  // onEnter/onEnterBack above are edge-triggered on scroll-direction CROSSINGS
  // only. A window resize (DevTools toggle, orientation change, restoring a
  // maximized window, mobile browser chrome show/hide) makes ScrollTrigger
  // recompute every trigger's pixel start/end (pin distances are viewport-
  // height-relative) WITHOUT scrollY itself changing -- so a boundary can
  // shift right across the frozen scrollY with no scroll event ever firing to
  // trigger onEnter/onEnterBack. Result: the panel-nav/group-title visibility
  // classes stay stuck on the stale section while the actually-visible
  // section changes underneath (e.g. VIDEOS nav still showing while section-1
  // is back on screen). Fix: after every refresh, explicitly resync to
  // whichever panel trigger is actually active for the current scroll
  // position.
  ScrollTrigger.addEventListener('refresh', () => {
    for (let i = panelActiveTriggers.length - 1; i >= 0; i--) {
      if (panelActiveTriggers[i].isActive) {
        setActiveSection(i);
        break;
      }
    }
  });
  function setActiveDot(i) {
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
  }
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goToPanel(i));
  });

  /* ============================================================
     Fixed header nav + PHOTOS/VIDEOS panel-nav (vertical category
     list + Details/Photos|Videos pills) + global scroll cue —
     all driven off the same "which section is active" state.
     The panel-nav stays visible/fixed for as long as ANY section
     in that group is active — i.e. through the group's ENTIRE
     pinned thumbnail-conveyor run, only hiding once every
     thumbnail has fully framed out and the group's last section
     hands off to the next group.
     ============================================================ */
  const headerLinks = gsap.utils.toArray('#site-header .main-nav a');
  const photosPanelNav = document.getElementById('photos-panel-nav');
  const videosPanelNav = document.getElementById('videos-panel-nav');
  const photosTitleOverlay = document.getElementById('photos-title-overlay');
  const videosTitleOverlay = document.getElementById('videos-title-overlay');
  const scrollCue = document.getElementById('global-scroll-cue');
  const scrollFeather = document.getElementById('scroll-feather');

  // section index -> which PHOTOS/VIDEOS group it belongs to, for the
  // panel-nav + group-title visibility gating below (the top header nav's
  // own active state no longer depends on this -- it's pinned to HOME,
  // see setActiveSection below).
  // (9 sections total, DOM order: 0 intro/cube, 1 work-reel, 2 about/logo-wall,
  // 3-4 photos, 5-7 videos, 8 videos-outro (bg-video-11 still finishing;
  // NOT included in VIDEOS_INDICES since its whole purpose is for the
  // panel-nav/group-title to have ALREADY faded away by the time it's
  // reached -- see setupVideosGroupExit()).
  const PHOTOS_INDICES = [3, 4];
  const VIDEOS_INDICES = [5, 6, 7];

  function setActiveSection(i) {
    setActiveDot(i);

    // top header active link -- this entire scroll experience IS the HOME
    // page (PHOTOS/VIDEOS/ABOUT ME here are just in-page anchors, not
    // separate pages -- those live at the standalone /photos and /videos
    // routes, which render their own header with their own hardcoded
    // .active state and are untouched by this code). So the underline
    // must always stay fixed on HOME regardless of which section/group is
    // currently scrolled into view -- it must NEVER jump to PHOTOS/VIDEOS/
    // ABOUT ME while scrolling through HOME.
    headerLinks.forEach((a) => a.classList.toggle('active', a.dataset.navGroup === 'home'));

    // PHOTOS panel-nav (category list + Details/Photos pills) visibility
    const inPhotos = PHOTOS_INDICES.includes(i);
    if (photosPanelNav) photosPanelNav.classList.toggle('is-visible', inPhotos);

    // VIDEOS panel-nav (category list + Details/Videos pills) visibility
    const inVideos = VIDEOS_INDICES.includes(i);
    if (videosPanelNav) videosPanelNav.classList.toggle('is-visible', inVideos);

    // PHOTOS / VIDEOS fixed group title -- same group-membership gate as
    // the panel-nav above, so the title stays pinned at the top for as
    // long as ANY section in its whole group is active (PHOTOS: 3-4,
    // VIDEOS: 5-7), only disappearing once every thumbnail in that
    // group has fully scrolled past.
    if (photosTitleOverlay) photosTitleOverlay.classList.toggle('is-visible', inPhotos);
    if (videosTitleOverlay) videosTitleOverlay.classList.toggle('is-visible', inVideos);

    // hide the scroll cue (and its feather mask) on the very last section
    // (nothing more to scroll to)
    if (scrollCue) {
      scrollCue.style.opacity = i === panels.length - 1 ? '0' : '1';
      scrollCue.style.pointerEvents = i === panels.length - 1 ? 'none' : 'auto';
    }
    if (scrollFeather) {
      scrollFeather.style.opacity = i === panels.length - 1 ? '0' : '1';
    }
  }

  // header nav links: smooth-scroll to target section
  headerLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      goToPanel(Number(a.dataset.navTarget));
    });
  });

  // initialize state for section 0 on load
  setActiveSection(0);

  /* ============================================================
     Fixed group-title continuous color-shift -- while the PHOTOS /
     VIDEOS group title is pinned on screen (see setActiveSection
     above), its color sweeps through the accent gradient in sync
     with how far the user has scrolled through that whole group,
     giving the pinned text itself a continuous "something is always
     reacting to scroll" interactive quality (in addition to the
     enter/exit fade it already gets from initScrollText below).
     ============================================================ */
  function setupGroupTitleColor(startSectionId, endSectionId, titleOverlayId) {
    const startEl = document.getElementById(startSectionId);
    const endEl = document.getElementById(endSectionId);
    const overlay = document.getElementById(titleOverlayId);
    if (!startEl || !endEl || !overlay) return;
    const titleText = overlay.querySelector('.group-title-text');
    if (!titleText) return;
    const colors = [
      getCssVar('--fg'),
      getCssVar('--accent-ember'),
      getCssVar('--accent-flame'),
      getCssVar('--accent-gold'),
      getCssVar('--fg'),
    ];
    ScrollTrigger.create({
      trigger: startEl,
      endTrigger: endEl,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        titleText.style.color = sampleGradient(colors, self.progress);
      },
    });
  }
  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  // simple multi-stop linear color interpolation (hex/rgb -> rgb string)
  function sampleGradient(stops, t) {
    const n = stops.length - 1;
    const scaled = Math.max(0, Math.min(1, t)) * n;
    const i = Math.min(n - 1, Math.floor(scaled));
    const localT = scaled - i;
    return mixColors(stops[i], stops[i + 1], localT);
  }
  function mixColors(a, b, t) {
    const ca = toRgb(a), cb = toRgb(b);
    const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }
  function toRgb(color) {
    const ctx = toRgb._ctx || (toRgb._ctx = document.createElement('canvas').getContext('2d'));
    ctx.fillStyle = color;
    const computed = ctx.fillStyle; // normalizes to #rrggbb or rgb(...)
    if (computed[0] === '#') {
      const hex = computed.slice(1);
      const bigint = parseInt(hex, 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }
    const m = computed.match(/\d+/g) || [255, 255, 255];
    return m.slice(0, 3).map(Number);
  }
  setupGroupTitleColor('section-3', 'section-4', 'photos-title-overlay');
  setupGroupTitleColor('section-5', 'section-7', 'videos-title-overlay');

  /* ============================================================
     Scroll-linked "frame-in" entrance -- the PHOTOS/VIDEOS group
     title and the panel-nav (category list + Details/Photos|Videos
     pills) both used to just pop to opacity:1 the instant their
     group became active (a flat CSS transition, not tied to scroll
     position at all). These two functions replace that with a real
     scroll-scrubbed entrance: as the group's own intro section
     scrolls up into place, the title/nav elements continuously
     resolve into focus in lockstep with the scrollbar, instead of
     snapping in.

     setupGroupTitleFrameIn() specifically: the title (PHOTOS/VIDEOS)
     starts fully below the bottom edge of the viewport and travels
     UP into its resting spot, which is the SAME fixed position
     (`.group-title { position: fixed; top: 92px }`) it already holds
     for the rest of its group -- i.e. it visually "frames in" from
     below the screen and then locks/freezes exactly where it stays
     pinned for the whole PHOTOS/VIDEOS group, rather than the old
     34px micro-nudge. The travel distance is derived from the live
     viewport height (not a fixed px value) so the element always
     starts genuinely off-screen below the fold on any device.
     ============================================================ */
  function setupGroupTitleFrameIn(introSectionId, titleOverlayId, startPoint) {
    const introSection = document.getElementById(introSectionId);
    const overlay = document.getElementById(titleOverlayId);
    if (!introSection || !overlay) return;
    const titleText = overlay.querySelector('.group-title-text');
    if (!titleText) return;

    // How far below its resting position (y:0, i.e. the fixed top:92px
    // spot) the title should start from. `.group-title` is `position:
    // fixed`, so translating it down by the full viewport height moves
    // it to just below the bottom edge of the screen -- exactly the
    // "화면의 하단에서 프레임인" starting point.
    const travelDistance = () => window.innerHeight;

    gsap.set(titleText, { opacity: 0, y: travelDistance(), filter: 'blur(6px)' });

    // start: defaults to 'top bottom' (VIDEOS -- no logo wall precedes it,
    // so it's fine to begin rising as soon as section-5 enters view).
    //
    // PHOTOS override (complaint a -- "photos 텍스트는 로고월이 끝나고
    // 나타나야돼"): ROOT CAUSE (confirmed via Playwright opacity/scrollY
    // scan) was that this trigger's old fixed 'top bottom' -> 'top 35%'
    // window fully resolved the title to opacity 1 by scrollY ~3930,
    // while the logo wall's own exit-fade (setupClientWall's "bottom 85%"
    // -> "bottom top" block, tuned to finish EXACTLY at section-3's own
    // 'top top' per its adjacent long comment) doesn't reach opacity 0
    // until scrollY ~4140 -- a ~210px window where the fully-visible
    // PHOTOS text was overlapping the still-fading logo wall. FIX: pass
    // 'top top' as the start point for PHOTOS specifically, which is the
    // geometrically IDENTICAL scrollY as section-2's 'bottom top' (the two
    // are adjacent full-height panels), i.e. the exact tick the wall
    // finishes disappearing -- so the title's rise now only ever begins
    // once the wall is fully gone, with zero overlap.
    const start = startPoint || 'top bottom';

    ScrollTrigger.create({
      trigger: introSection,
      start,
      // Relative to `start` (not a fixed 'top 35%') so overriding `start`
      // above (PHOTOS's 'top top') keeps the exact same reveal DURATION
      // (0.65 * viewport height of scroll distance -- identical to the
      // original 'top bottom' -> 'top 35%' span) instead of inheriting
      // whatever gap happens to fall between the new start and a fixed
      // 'top 35%' point.
      end: () => '+=' + window.innerHeight * 0.65,
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress;
        const dist = travelDistance();
        gsap.set(titleText, {
          // opacity resolves a touch faster than the travel itself so the
          // text isn't fully invisible for the entire rise -- it's
          // already legible partway up, then locks fully opaque + sharp
          // right as it settles into its pinned position.
          opacity: Math.min(1, p * 1.5),
          y: dist * (1 - p),
          filter: `blur(${6 * (1 - p)}px)`,
        });
      },
    });

    // keep the (pre-scroll) initial off-screen offset correct if the
    // viewport is resized before the user has scrolled into this range
    window.addEventListener('resize', () => {
      if (introSection.getBoundingClientRect().top > window.innerHeight) {
        gsap.set(titleText, { y: travelDistance() });
      }
    });
  }
  setupGroupTitleFrameIn('section-3', 'photos-title-overlay', 'top top');
  setupGroupTitleFrameIn('section-5', 'videos-title-overlay');

  function setupPanelNavFrameIn(introSectionId, panelNavId) {
    const introSection = document.getElementById(introSectionId);
    const nav = document.getElementById(panelNavId);
    if (!introSection || !nav) return;
    const items = [
      ...nav.querySelectorAll('.panel-nav-list li'),
      ...nav.querySelectorAll('.panel-pill'),
    ];
    if (!items.length) return;

    gsap.set(items, { opacity: 0, y: 22 });

    ScrollTrigger.create({
      trigger: introSection,
      start: 'top bottom',
      end: 'top 30%',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress;
        items.forEach((el, i) => {
          // slight stagger: each item's own reveal window is offset a
          // touch from the next so they resolve in one-after-another
          // rather than all snapping in unison, while the whole group
          // still finishes exactly in sync with the shared scrub range.
          const staggerOffset = i * 0.06;
          const localP = Math.max(0, Math.min(1, (p - staggerOffset) / (1 - staggerOffset)));
          gsap.set(el, { opacity: localP, y: 22 * (1 - localP) });
        });
      },
    });
  }
  setupPanelNavFrameIn('section-3', 'photos-panel-nav');
  setupPanelNavFrameIn('section-5', 'videos-panel-nav');

  /* ============================================================
     SECTION 2 -- Client / logo wall (scroll-driven marquee)
     Five full-width rows of white vector-silhouette client logos
     filling the section. Each row's DOM track is its logo list
     rendered TWICE back to back (see index.tsx, #client-track-0..4),
     so translating exactly -50% of the track's own width is a
     perfectly seamless loop point -- we tie that translate directly
     to #section-2's scroll progress (via scrub, NOT a CSS autoplay
     animation) so the motion is genuinely driven by the user's
     scroll position. The TOPMOST row (index 0) flows right-to-left
     per explicit spec ("최상단은 로고가 우에서 좌로 흐르게끔"); the
     remaining rows alternate direction so the wall visibly drifts
     in a criss-cross pattern rather than moving as one flat block.
     ============================================================ */
  function setupClientWall(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    // dir: -1 = track's xPercent DECREASES (more negative) as progress
    // increases, which (given LTR doubled content) reads visually as
    // motion to the LEFT, i.e. content flowing right-to-left.
    // dir: 1 is the mirror (content flowing left-to-right).
    // Empirically verified via Playwright (transform readout + before/
    // after screenshots) -- do not flip this without re-testing.
    // Row 0 (topmost) MUST be dir -1 per explicit spec.
    // 5 -> 6 rows (prior turn) per explicit "로고는 6줄로 작게 들어가야할
    // 거 같고... 절대적으로 이걸 채워줘야할 거 같아" -- see home.html's
    // client-track-0..5 (6 tracks) and .client-logo's re-tuned clamp()
    // bounds in style.css for the matching smaller-logo sizing.
    // THIS TURN: row COUNT stays at 6, but each row's LOGO COUNT went
    // 6 -> 20 (see home.html's client-track-0..5, now 20 unique logos
    // doubled to 40 tiles each) per explicit "로고는 애초에 한줄에
    // 20개씩 넣고" -- cycling through the 35-logo set with a per-row
    // offset so no two rows show the identical sequence. Combined with
    // Bug 8's now-fully-transparent .client-wall background (no more
    // dimming tint), this density increase is what keeps the video
    // bleed-through reading as "bright video behind a dense wall"
    // rather than "gappy holes" -- see .client-tile/.client-logo's
    // re-tuned (much smaller) sizing in style.css.
    const ROW_COUNT = 6;
    const rows = Array.from({ length: ROW_COUNT }, (_, i) => ({
      track: document.getElementById(`client-track-${i}`),
      dir: i % 2 === 0 ? -1 : 1,
    })).filter((r) => r.track);
    if (!rows.length) return;

    rows.forEach((r) => {
      // start each row already offset into its loop so neither track's
      // hard "seam" (the join between the two doubled copies) sits
      // visibly centered on screen at rest.
      gsap.set(r.track, { xPercent: r.dir > 0 ? -8 : -42 });
    });

    // ---- Entrance: logos rise up from below the screen.
    // IMPORTANT (revised this turn): this used to be its own ScrollTrigger
    // scoped to section-2's own 'top bottom' -> 'top 40%' scroll range.
    // But 'top bottom' on section-2 fires at the EXACT SAME scroll
    // position as the work-reel-pin's own RELEASE (the two are adjacent
    // full-height panels, so the instant the pin lets go is precisely
    // when section-2 begins entering) -- i.e. the rise only ever BEGAN
    // once the pin had already fully released, never any earlier. Per
    // this turn's explicit "불을 붙이기 시작할 때... 워크 위드의
    // 로고들이 올라오기 시작해야돼", the rise must already be underway
    // WHILE the pin is still engaged and video-5 (the torch just catching
    // fire) is playing -- i.e. strictly BEFORE release. So the entrance is
    // now driven directly off the work-reel-pin's OWN progress instead
    // (see renderWallPreRise()/workReelWallPreRiseRenderer below, called
    // from setupWorkReel()'s render() -- same "direct call, shared
    // progress" pattern as workReelScrubRenderer/cubeScrubRenderer, for
    // the same reason: a second independent ScrollTrigger on that same
    // still-pinned element would not reliably compute matching progress).
    // This block now only sets the wall's initial (fully hidden) state;
    // the actual rise happens entirely inside renderWallPreRise().
    const wallEntrance = document.getElementById('client-wall');
    if (wallEntrance) {
      gsap.set(wallEntrance, { y: window.innerHeight * 0.35, opacity: 0 });
    }
    // PRERISE_START: chosen to sit just before video-5 (torch-ignite, the
    // "flame just starting to catch" clip -- see CHAIN.PHASE_V4_END in
    // setupFixedBgVideo, which plays across pin progress 0.75 -> 1.0) so
    // the logos are ALREADY visibly rising by the moment that footage is
    // on screen. PRERISE_END = 1.0 means the wall finishes its rise to
    // fully opaque/settled EXACTLY as the pin releases -- the same instant
    // video-6 (torch-blaze) takes over as the active background clip.
    const PRERISE_START = 0.70;
    const PRERISE_END = 1.0;
    const preRiseEase = gsap.parseEase('power2.out');
    function renderWallPreRise(p) {
      if (!wallEntrance) return;
      const riseP = Math.max(0, Math.min(1, (p - PRERISE_START) / (PRERISE_END - PRERISE_START)));
      const riseT = preRiseEase(riseP);
      gsap.set(wallEntrance, { y: window.innerHeight * 0.35 * (1 - riseT), opacity: riseT });
    }
    workReelWallPreRiseRenderer = renderWallPreRise;

    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress; // 0 -> 1 across the section's full scroll transit
        rows.forEach((r) => {
          // -50% is the seamless wrap point (track = 2x the same content);
          // keep the value inside [-50, 0] with a simple modulo so it can
          // scrub indefinitely back and forth without ever jumping.
          const base = r.dir > 0 ? -8 : -42;
          const raw = base + r.dir * p * 50;
          const x = ((raw % 50) + 50) % 50 - 50; // normalize into (-50, 0]
          gsap.set(r.track, { xPercent: x });
        });
      },
    });

    // Edge fade on EXIT only: as section-2 scrolls up and out, its trailing
    // sliver stays technically on-screen for a bit while the NEXT group's
    // fixed .group-title (PHOTOS/VIDEOS) fades in on top at a fixed
    // position -- same visual-collision class of bug fixed elsewhere in
    // this file (see the long edgeFade comment inside setupConveyor).
    // Fading the wall to 0 opacity over the final stretch of section-2's
    // own exit means it is already invisible by the time that overlap
    // window opens, without touching entrance behavior at all.
    const wall = document.getElementById('client-wall');
    if (wall) {
      // The bottom-most row sits close to section-2's own bottom edge, so as
      // the section scrolls up it reaches the fixed PHOTOS/VIDEOS title
      // band (~92-183px from viewport top) once the section's bottom edge
      // is still ~300-400px above the viewport's own bottom -- i.e. well
      // BEFORE the section's bottom edge reaches the viewport top. The
      // fade window below is tuned (and verified) to fully reach opacity
      // 0 comfortably before that geometric overlap point is reached.
      // Per this turn's explicit "로고는 모두 화면위로 사라져서, 포토가
      // 나올 준비가 되어야해" -- a plain opacity fade left the logos
      // visually "in place" (just invisible), which doesn't read as
      // "disappearing off the top of the screen". Adding a upward
      // translateY (to a full -100% of the wall's own height by the end
      // of the window) alongside the existing opacity fade makes every
      // row visibly exit UP and off-screen before PHOTOS appears.
      //
      // REVISED (this turn, "사진은 로고가 다 올라가고 사라지면 바로
      // 나왔으면 좋겠어" -- photos must appear IMMEDIATELY once the logos
      // finish rising off-screen, no gap). ROOT CAUSE (confirmed via
      // Playwright: scrolled through the exact scrollY range and read
      // computed opacity/screenshots at each step): the old `end: 'bottom
      // 45%'` made this fade fully reach opacity 0 at section-2's bottom
      // edge sitting 45% down the viewport -- which, on a full-height
      // panel, lands ~400-500px of scroll distance BEFORE section-3's own
      // top (the exact boundary where setupBgLayerHandoff()/
      // setupPhotosBgVideo() hard-cut the PHOTOS background video layer
      // in). That left a real ~400px "dead" scroll zone where the wall had
      // already faded to nothing but PHOTOS hadn't appeared yet --
      // confirmed visually as several consecutive fully BLACK screenshots
      // in that range. Changing `end` to `'bottom top'` makes the fade
      // finish (opacity 0, fully risen off-screen) at EXACTLY the scrollY
      // where section-2's bottom edge reaches the viewport top -- which,
      // since section-2/section-3 are directly adjacent full-height
      // panels, is the identical scrollY as section-3's own 'top top'
      // hard-cut boundary. The two are now driven by geometrically
      // coincident trigger points, so the last logo pixel disappears on
      // the exact same tick the PHOTOS background/title/cards begin
      // appearing -- no gap, no overlap.
      ScrollTrigger.create({
        trigger: section,
        start: 'bottom 85%',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(wall, { opacity: 1 - p, y: -p * window.innerHeight * 0.6 });
        },
      });
    }
  }
  setupClientWall('section-2');

  /* ============================================================
     FIXED BACKGROUND VIDEO -- a single persistent "media player" layer
     spanning the cube section (1), the work-reel handoff, and playing
     out to completion BEFORE the logo wall (2) begins.
     Per explicit spec (this + two prior turns): "영상은 백그라운드에
     위치가 고정돼, 계속 반응연동형으로 재생돼야 해..." + "...마치 미디어
     플레이어에서 연속 재생하는듯하게..." + this turn's refinement:
     "be the one 텍스트가 올라감과 동시에 2번째 영상이 나와야해. 그리고
     워크 위드 섹션이 나오기 전에 3번째 영상이 끝나고, 첨부한 4번째
     영상이 이어져야해. 이 모든 건, 마치 미디어 플레이어처럼 고정된
     화면에 계속 화면이 흐르는 것처럼 보여야하고, 화면이 스크롤 다운에
     반응하며 위로 올라가는 형식이 아닌 것이여야해. 대신 영상을 제외한
     컨텐츠들만이 스크롤 다운에 반응하며 화면위로 올라가는 거야." + this
     turn's further refinement: "워크 위드가 시작되기 전에 첨부한
     5번영상까지 흘러나와야해" -- the 5th clip (torch ignites/flares into
     a full steady burn) is now the FOURTH and final phase of the SAME
     work-reel pin chain below (not its own separate section-2-scoped
     trigger as in the prior iteration), so it too is guaranteed complete
     before WORKED WITH appears."
     The <video> elements in #fixed-bg-video are `position: fixed` (see
     style.css) -- this is what makes them genuinely behave like a fixed
     media player: they NEVER physically move/scroll regardless of which
     section is pinned, unpinned, or in normal document flow above them.
     Only the FOREGROUND content (cube+hero text in section-1, the
     tagline in the work-reel span, then the WORKED WITH logo wall in
     section-2) scrolls on top of this always-fixed layer. All FIVE
     clips are genuinely scroll-scrubbed (never autoplay/loop, never
     left frozen on a stale frame while still visible), and hard-cut
     between each other (no crossfades), in this exact order:
       1. bg-video-1a (matches fall -> settle -> a hand reaches in and
          lifts one out of frame): scrubbed across the cube-section's
          own "intro-pin" ScrollTrigger progress (0 -> CUT_POINT), in
          perfect lockstep with the cube's rotation/growth -- see
          renderCubeScrub() below. At CUT_POINT the hand lifts the
          match fully out of frame AND, in the exact same instant,
          "Be the ONE" begins its rise/fade-out AND the hard cut to
          1b fires -- all three are keyed off the identical CUT_POINT
          value so they are simultaneous by construction (see
          renderIntro()'s text-exit calc further down, which now uses
          t.CUT_POINT directly instead of a separate earlier constant).
       2. bg-video-1b (the same match now held static/unlit): plays out
          in full immediately after the hard cut, across the FIRST
          phase of the work-reel section's own pinned scroll range --
          see renderWorkReelScrub() / setupWorkReel() below.
       3. bg-video-2 (that held match igniting into flame): hard-cuts
          in the instant 1b's phase ends, plays out across the SECOND
          phase of that same pinned range.
       4. bg-video-4 (the now-lit match approaching an unlit torch,
          which never ignites within this clip): hard-cuts in the
          instant video-2's phase ends, plays out across the THIRD
          quarter of that same pinned range.
       5. bg-video-5 (the torch ignites and flares up into a full steady
          burn -- the payoff to video-4's tension): hard-cuts in the
          instant video-4's phase ends, plays out across the FOURTH
          (final) quarter of that same pinned range -- finishing EXACTLY
          as the work-reel pin releases, which is the same scroll
          position section-2 (WORKED WITH) begins entering the
          viewport. This guarantees the entire 1a->1b->2->4->5 chain is
          always fully complete before WORKED WITH appears, per this
          turn's explicit requirement.
     Housing phases 2-5 inside ONE single pinned ScrollTrigger (rather
     than separate non-pinned "chain" triggers spanning section
     boundaries) is also what delivers the "fixed media player" feel:
     while that pin is engaged the viewport doesn't move at all (matching
     the always-fixed video underneath), and only the tagline text's own
     opacity reacts to the scrub -- there is no in-between moment where a
     section is scrolling library-style up and off screen while a video
     is still trying to play underneath it.
     The whole #fixed-bg-video layer fades in as section-1 begins and
     fades out right before section-3/PHOTOS takes over, remaining a
     static (non-scrubbing) backdrop behind section-2 in between.
     ============================================================ */
  // Exposed so the intro-pin ScrollTrigger (created further below, for the
  // cube itself) can drive the match-footage scrub DIRECTLY off its own
  // self.progress -- see the long note at the "cube-video-scrub" removal
  // point below for why a second independent ScrollTrigger on the same
  // pinned trigger element does NOT reliably share the same progress.
  let cubeScrubRenderer = null;
  // Same pattern as cubeScrubRenderer, but for the work-reel section's own
  // pin (see setupWorkReel() further below): exposed here so that pin's
  // onUpdate/onRefresh can drive the 1b -> video-2 -> video-4 chain
  // scrub DIRECTLY off its own self.progress, for the exact same
  // "two ScrollTriggers on one pinned element don't share progress"
  // reason cubeScrubRenderer exists.
  let workReelScrubRenderer = null;
  // (workReelWallPreRiseRenderer -- the same "direct call, shared
  // progress" pattern again, for the client-wall's PRE-rise -- is
  // declared at the very top of this IIFE instead of here, since
  // setupClientWall() which assigns it runs before this point; see the
  // comment there.)

  // Shared timeline breakpoints for the whole intro-pin sequence (cube +
  // background video-1a scrub + text), consumed by BOTH renderCubeScrub()
  // (below, in setupFixedBgVideo) and renderIntro() (further down, in the
  // cube setup block) so the two stay perfectly in sync by construction.
  //   0        -> CUBE_EXIT_END   cube grows/holds/exits and is FULLY GONE
  //                                by CUBE_EXIT_END; video-1a plays its
  //                                "matches fall & settle" footage (0s ->
  //                                V1A_SETTLE_END_SEC) synced to the cube's
  //                                own progress purely as background ambiance
  //   CUBE_EXIT_END -> CUT_POINT  stage is clear (no cube) -- video-1a plays
  //                                its "hand reaches in, grabs, and lifts the
  //                                match out of frame" footage
  //                                (V1A_SETTLE_END_SEC -> its full duration);
  //                                "Be the ONE" text stays FULLY VISIBLE this
  //                                entire time -- it does not start exiting
  //                                here (see below).
  //   CUT_POINT -> 1               HARD CUT (no crossfade) to video-1b, the
  //                                static held-match close-up shot. Per this
  //                                turn's explicit spec ("텍스트가 올라감과
  //                                동시에 2번째 영상이 나와야해" -- the text
  //                                rise must begin in the EXACT SAME instant
  //                                video-1b appears), "Be the ONE" starts its
  //                                upward sweep/fade-out AT CUT_POINT itself
  //                                (not before) and finishes by p=1, so the
  //                                rise plays out fully while 1b is on
  //                                screen and completes exactly as the pin
  //                                releases -- see renderIntro()'s exitP calc.
  const INTRO_TIMELINE = {
    CUBE_GROW_END: 0.30,
    CUBE_HOLD_END: 0.38,
    CUBE_EXIT_END: 0.45,
    CUT_POINT: 0.95,
  };
  // Timestamp (seconds) inside section1-matches-scrub-01.mp4 where the
  // match pile has finished falling and settled -- found by frame-by-frame
  // inspection of the source footage (matches fall 0->~1s, settle ~1->4.5s
  // static hold, a hand then enters at ~4.5s and grips one match by ~5.5s,
  // lifting it fully out of frame by ~7.5-8s, the clip's own end).
  const V1A_SETTLE_END_SEC = 4.5;

  function setupFixedBgVideo() {
    const layer = document.getElementById('fixed-bg-video');
    const v1a = document.getElementById('bg-video-1a');
    const v1b = document.getElementById('bg-video-1b');
    const v2 = document.getElementById('bg-video-2');
    const v4 = document.getElementById('bg-video-4');
    const v5 = document.getElementById('bg-video-5');
    const v6 = document.getElementById('bg-video-6');
    const s1 = document.getElementById('section-1');
    const s2 = document.getElementById('section-2');
    const s3 = document.getElementById('section-3');
    if (!layer || !v1a || !v1b || !v2 || !v4 || !v5 || !v6 || !s1 || !s2 || !s3) return;

    const videos = [v1a, v1b, v2, v4, v5, v6]; // 0=1a,1=1b,2=ignite,3=torch-approach,4=torch-ignite,5=torch-blaze
    gsap.set(videos, { opacity: 0 });
    gsap.set(v1a, { opacity: 1 });

    // Known source durations used as a fallback until each video's real
    // duration is available via loadedmetadata, so early scroll input
    // before the browser finishes probing the file still maps to a sane
    // currentTime. 1a runs from the ABSOLUTE start (t=0) of its source
    // through the full "matches fall -> settle -> a hand reaches in,
    // grabs one match, and lifts it out of frame" action (see
    // renderCubeScrub below for how its two acts, "settle" and "hand
    // grabs + exits", are mapped onto two different scroll sub-ranges
    // rather than played back linearly across the whole pin). 1b is a
    // static unlit-match held shot; v2 is that match igniting into
    // flame; v4 is the now-lit match approaching an unlit torch (which
    // never ignites within v4's own 6s runtime); v5 is the payoff --
    // the torch itself catches and flares up into a full steady burn --
    // played out across section-2's OWN natural scroll transit (see
    // renderSection2Scrub further below), not a pinned range.
    let dur1a = 8.0;
    let dur1b = 6.0;
    let dur2 = 6.0;
    let dur4 = 6.0;
    let dur5 = 6.0;
    let dur6 = 6.0;
    v1a.addEventListener('loadedmetadata', () => { if (v1a.duration) dur1a = v1a.duration; });
    v1b.addEventListener('loadedmetadata', () => { if (v1b.duration) dur1b = v1b.duration; });
    v2.addEventListener('loadedmetadata', () => { if (v2.duration) dur2 = v2.duration; });
    v4.addEventListener('loadedmetadata', () => { if (v4.duration) dur4 = v4.duration; });
    v6.addEventListener('loadedmetadata', () => { if (v6.duration) dur6 = v6.duration; });
    v5.addEventListener('loadedmetadata', () => { if (v5.duration) dur5 = v5.duration; });

    // Root-cause fix (see blobifySeekableVideo() top-of-file comment for
    // the full explanation): swap each network video src for a Blob URL
    // so it becomes genuinely seekable, independent of server range
    // support. Applied once per video as soon as it starts loading.
    // Staggered (see blobifySeekableVideo()'s own comment for the full
    // "simultaneous decoder init -> compositor cross-talk" root-cause
    // explanation of the torch-in-section-1 bug this fixes): v1a (the
    // only one visible on first paint) blobifies immediately/alone;
    // every other still-hidden clip's own reload is spread out 250ms
    // apart afterward so at most one video decoder is being
    // (re)initialized at any given moment.
    videos.forEach((v, i) => blobifySeekableVideo(v, i * 250));

    function seek(video, duration, localP) {
      const t = Math.max(0, Math.min(1, localP)) * duration;
      if (video.readyState > 0 && Number.isFinite(t)) {
        video.currentTime = t;
      }
    }

    // activeIndex: which single video (0=1a, 1=1b, 2=v2, 3=v4) is currently
    // opaque. All transitions in this whole 4-clip sequence are HARD cuts
    // (no crossfade, matching the established "크로스 페이드는 필요없어"
    // convention) -- so exactly one video is ever opacity:1 at a time, the
    // other three are opacity:0. setActive() is a no-op if already on the
    // requested index, avoiding redundant gsap.set calls every scroll frame.
    let activeIndex = 0;
    function setActive(idx) {
      if (idx === activeIndex) return;
      activeIndex = idx;
      videos.forEach((v, i) => gsap.set(v, { opacity: i === idx ? 1 : 0 }));
    }

    // ---- cube-section scrub: currentTime of 1a tied 1:1 to the cube's own
    // "intro-pin" ScrollTrigger progress (see cubeScrubRenderer below for
    // why this is called directly rather than via a second ScrollTrigger).
    // 1a is scrubbed across the ENTIRE 0 -> CUT_POINT range in two acts
    // (see INTRO_TIMELINE / V1A_SETTLE_END_SEC above): the "settle" footage
    // plays while the cube animates (0 -> CUBE_EXIT_END), then once the
    // cube is fully gone the SAME clip continues into its "hand grabs +
    // lifts the match out of frame" footage (CUBE_EXIT_END -> CUT_POINT).
    // AT CUT_POINT the layer hard-cuts to 1b -- this is the exact same
    // instant renderIntro() (below, in the cube setup block) begins the
    // "Be the ONE" text's rise/exit, so the two are simultaneous by
    // construction (both keyed off the identical CUT_POINT constant).
    function renderCubeScrub(p) {
      const t = INTRO_TIMELINE;
      let aSeconds;
      if (p <= t.CUBE_EXIT_END) {
        const actP = t.CUBE_EXIT_END > 0 ? Math.max(0, p / t.CUBE_EXIT_END) : 0;
        aSeconds = actP * V1A_SETTLE_END_SEC;
      } else {
        const actP = Math.max(0, Math.min((p - t.CUBE_EXIT_END) / (t.CUT_POINT - t.CUBE_EXIT_END), 1));
        aSeconds = V1A_SETTLE_END_SEC + actP * (dur1a - V1A_SETTLE_END_SEC);
      }
      seek(v1a, dur1a, aSeconds / dur1a);
      setActive(p >= t.CUT_POINT ? 1 : 0);
    }

    function renderLayerOpacity(p) {
      // Fully visible from the very first frame (p=0, the top of section-1)
      // -- no fade-in ramp -- since the user lands directly on the cube
      // section with the fixed video already meant to be showing.
      //
      // ROOT-CAUSE FIX (this turn's "6.mp4/7.mp4 사이 페이드아웃 -> 재연결"
      // bug -- the user's THIRD report on this general theme, this time
      // with the actual raw video files attached instead of a screenshot).
      // Forensic identification of the uploaded files (ffprobe + ffmpeg
      // frame-by-frame PIL brightness-curve comparison against every
      // deployed video asset) showed uploaded 6.mp4 matches
      // section2-torch-blaze.mp4 (bg-video-6, THIS layer, #fixed-bg-video)
      // and uploaded 7.mp4 matches photos-intro-07.mp4 (photos-bg-video-7,
      // the OTHER layer, #photos-bg-video-layer) -- i.e. the user's
      // complaint was about the CROSS-LAYER handoff at section-2 ->
      // section-3, not the v7->v8 handoff already fixed in 7ebb1ee/3c06359
      // (which lives entirely INSIDE #photos-bg-video-layer, sections 3-4).
      // This handoff had never been tested by any prior diagnostic round.
      //
      // Previously this function independently ramped THIS layer's opacity
      // 1->0 over the last 6% of the s1->s3 progress span (FADE_OUT_START
      // = 0.94), while a SEPARATE, independently-computed ScrollTrigger in
      // setupPhotosBgVideo() ramped #photos-bg-video-layer's opacity via a
      // binary `self.isActive ? 1 : 0` gate over its OWN s3->s5 span.
      // Despite both being nominally anchored to the exact same boundary
      // (section-3's top), these are two separate ScrollTrigger instances
      // computing progress/isActive independently -- nothing guarantees
      // their outputs sum to 1 at every scroll tick near that shared
      // boundary. A live 20px-step Playwright opacity scan proved they do
      // NOT: at scrollY=5520 (section-3's measured top in a 1024x800
      // viewport) BOTH layers read `opacity: 0` simultaneously -- a
      // genuine double-blackout, confirmed visually via screenshot as a
      // solid black frame (only text/UI chrome visible, zero fire/torch
      // imagery). Fix: this function no longer performs any fade-out at
      // all -- it unconditionally stays at 1. The transition (and the
      // OTHER layer's matching cut-IN) is now driven entirely by ONE
      // shared, zero-width hard-cut ScrollTrigger (see
      // setupBgLayerHandoff() further below, called once both this layer
      // and #photos-bg-video-layer exist) that sets BOTH layers' opacity
      // in the SAME callback from a SINGLE progress value, so they are
      // mathematically guaranteed complementary (op1 + op2 === 1) AND
      // never simultaneously nonzero at every tick -- a double-blackout
      // (or, per a later report, a double-EXPOSED overlap from an earlier
      // gradual-crossfade attempt at this same fix) is now structurally
      // impossible, not just empirically rare. See the long comment above
      // setupBgLayerHandoff()'s own declaration for why a gradual
      // crossfade was tried first and had to be reverted to a hard cut.
      gsap.set(layer, { opacity: 1 });
    }

    // ------------------------------------------------------------------
    // "Media-player playlist" chain for 1b -> v2 -> v4 -> v5, driven
    // ENTIRELY by the work-reel section's OWN pinned ScrollTrigger
    // progress (see setupWorkReel() further below, which calls this
    // function directly via workReelScrubRenderer -- same "share progress
    // by direct call, not a second independent ScrollTrigger" pattern as
    // cubeScrubRenderer above). Housing all FOUR remaining clips inside
    // that ONE pin (rather than v5 living on its own separate,
    // section-2-scoped trigger) is what guarantees the entire
    // 1a->1b->2->4->5 chain finishes BEFORE the pin releases into
    // section-2 (WORKED WITH) -- there is no scroll position where any
    // clip is still playing while section-2 is simultaneously visible.
    // The 0->1 pin progress is split into four equal quarters; each phase
    // hard-cuts in the instant the previous one ends and plays its own
    // clip out in full (currentTime 0 -> its own duration). v6 (the
    // newest attached clip -- torch blazing, panning up) is deliberately
    // NOT part of this pinned chain: per this turn's explicit "워크
    // 위드가 끝날때까지 첨부한 6번 영상이 흘러나와야해" it instead plays
    // across section-2's OWN natural (non-pinned) scroll transit, see the
    // dedicated section-2 ScrollTrigger further below.
    // PHASE_1B_END shrunk from 1/4 -> 0.10 this turn per explicit "be the
    // one에 영상이 끝나자마자, 다음영상이 바로 나와야해. 지금 텀이 너무
    // 길어" -- video-1b is a STATIC held-match shot (near-zero visible
    // motion frame-to-frame), so the old 1/4-of-the-pin allotment for it
    // meant a long stretch of scroll (5% tail of intro-pin's own 220% +
    // fully 25% of work-reel-pin's 170%, ~53% of a full viewport's worth
    // of scroll) where nothing visually NEW was happening right after
    // "Be the ONE" (video-1a) finished -- exactly the "too long an
    // interval before the next video" the user is describing. Cutting
    // 1b's own share down to 0.10 means video-2 (the match actually
    // igniting -- the first genuinely NEW footage after 1a) now appears
    // almost immediately once work-reel-pin engages, right on the heels
    // of 1a's hard cut. The freed 0.15 is folded into V2/V4's own
    // phases (now 0.30 wide each instead of 0.25) rather than shortened
    // away entirely, so those two chain links still each get a full,
    // comfortable on-screen dwell -- only 1b's own dead-air stretch was
    // the actual complaint target. PHASE_V4_END intentionally still
    // lands at 0.70 (was 0.75) -- deliberately kept aligned with
    // PRERISE_START (0.70, see workReelWallPreRiseRenderer /
    // setupClientWall) and comfortably after EXIT_END (0.68, see
    // renderTagline in setupWorkReel) so both of those existing timing
    // relationships stay intact without needing their own re-tuning.
    const CHAIN = {
      PHASE_1B_END: 0.10,
      PHASE_V2_END: 0.40,
      PHASE_V4_END: 0.70,
    };
    function renderVideoChain(p) {
      if (p <= CHAIN.PHASE_1B_END) {
        setActive(1);
        const localP = CHAIN.PHASE_1B_END > 0 ? p / CHAIN.PHASE_1B_END : 1;
        seek(v1b, dur1b, localP);
      } else if (p <= CHAIN.PHASE_V2_END) {
        setActive(2);
        const localP = (p - CHAIN.PHASE_1B_END) / (CHAIN.PHASE_V2_END - CHAIN.PHASE_1B_END);
        seek(v2, dur2, localP);
      } else if (p <= CHAIN.PHASE_V4_END) {
        setActive(3);
        const localP = (p - CHAIN.PHASE_V2_END) / (CHAIN.PHASE_V4_END - CHAIN.PHASE_V2_END);
        seek(v4, dur4, localP);
      } else {
        setActive(4);
        const localP = (p - CHAIN.PHASE_V4_END) / (1 - CHAIN.PHASE_V4_END);
        seek(v5, dur5, localP);
      }
    }

    // ------------------------------------------------------------------
    // SECTION-2 (WORKED WITH) own video -- bg-video-6 (torch blazing,
    // camera panning up to a vertical view), scrubbed against section-2's
    // OWN natural (non-pinned) scroll transit rather than the work-reel
    // pin above. Per this turn's explicit spec:
    //   "현재 첨부한 영상구간이 흘러나올 때, 이미 워크위드의 로고가
    //    화면하단에서 올라오기 시작해야해" -- v6 starts (hard-cut from
    //    v5) at the EXACT same scroll position (section-2's own 'top
    //    bottom') where the client-wall's new entrance ScrollTrigger
    //    (see setupClientWall()) ALSO begins the logos' rise-from-below,
    //    so the two are synchronized by construction (same trigger/start).
    //   "워크 위드가 끝날때까지 첨부한 6번 영상이 흘러나와야해" -- v6's
    //    currentTime is scrubbed 0 -> its own duration across section-2's
    //    ENTIRE visible transit (top bottom -> bottom top), so it is
    //    always still "playing" (never stuck on a frozen frame while
    //    still the active layer) for the whole time WORKED WITH is on
    //    screen, finishing exactly as section-2 itself finishes.
    // section-2 is NOT pinned, so (unlike cubeScrubRenderer/
    // workReelScrubRenderer) a plain independent ScrollTrigger here
    // reliably gets its own correct progress -- no "shared render fn"
    // indirection is needed for a non-pinned trigger.
    ScrollTrigger.create({
      trigger: s2,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        if (!self.isActive) return;
        setActive(5);
        seek(v6, dur6, self.progress);
      },
    });

    // Render an initial frame IMMEDIATELY (a ScrollTrigger's onUpdate only
    // fires once the user actually scrolls or on an explicit refresh) so
    // the layer doesn't stay stuck at its pre-set opacity:0 on first paint
    // even though the page loads already sitting at section-1's very top,
    // where the video should already be fully visible.
    renderLayerOpacity(0);
    renderCubeScrub(0);

    // NOTE: the whole-layer fade-OUT that used to live in a dedicated
    // ScrollTrigger here (trigger: s1, endTrigger: s3, driving
    // renderLayerOpacity(self.progress)) has been REMOVED -- see the long
    // comment inside renderLayerOpacity() above for why an independently-
    // computed fade-out here, paired with #photos-bg-video-layer's own
    // independently-computed fade-in, produced a genuine double-blackout
    // gap right at their shared section-3-top boundary. The fade-out is
    // now driven by setupBgLayerHandoff() (further below, called once
    // BOTH this layer and #photos-bg-video-layer exist) from a single
    // shared progress value that keeps the two layers' opacities
    // mathematically complementary AND mutually exclusive (a hard cut,
    // not a fade) at every scroll tick.

    // Expose both render functions so each section's OWN pinned
    // ScrollTrigger (intro-pin below, work-reel-pin in setupWorkReel())
    // can drive them DIRECTLY off its own self.progress -- see the long
    // comment above cubeScrubRenderer's declaration for why a second
    // independent ScrollTrigger on the same pinned trigger element does
    // NOT reliably compute the same progress.
    cubeScrubRenderer = renderCubeScrub;
    workReelScrubRenderer = renderVideoChain;
  }
  setupFixedBgVideo();

  /* ============================================================
     PHOTOS BACKGROUND VIDEO -- a second persistent "media player"
     layer (#photos-bg-video-layer, see style.css), independent of
     #fixed-bg-video above (which is already fully faded out by the
     time section-3 is reached -- see FADE_OUT_START in
     renderLayerOpacity). Per this turn's explicit spec: "Photos가
     시작될 때는 7번 영상이 나와야하고, 비디오스로 넘어가기 전에 8번
     영상 재생이 끝나야해":
       - video-7 (photos-intro-07.mp4) is the layer's default visible
         clip and starts playing the INSTANT the PHOTOS group begins
         (section-3's own top).
       - video-8 (photos-outro-08.mp4) hard-cuts in partway through
         the group's own scroll transit and MUST finish playing (reach
         its own full duration) before section-5 (VIDEOS) begins.
     Both clips are scrubbed against ONE continuous progress value
     spanning the ENTIRE PHOTOS group (section-3's normal-flow entrance
     THROUGH section-4's own pinned card-conveyor run) via a single
     ScrollTrigger from section-3's 'top top' to section-5's 'top top'
     -- the same "whole-group span" pattern already used for
     #fixed-bg-video's own whole-layer opacity trigger (trigger: s1,
     endTrigger: s3 further up). Splitting that 0->1 span into two
     equal halves (v7 first, v8 second) guarantees v8 always reaches
     its own currentTime === duration (fully finished) by the exact
     scroll position section-5 begins, regardless of how much of that
     total span section-4's conveyor pin itself consumes.
     ============================================================ */
  function setupPhotosBgVideo() {
    const layer = document.getElementById('photos-bg-video-layer');
    const v7 = document.getElementById('photos-bg-video-7');
    const v8 = document.getElementById('photos-bg-video-8');
    const s3 = document.getElementById('section-3');
    const s5 = document.getElementById('section-5');
    if (!layer || !v7 || !v8 || !s3 || !s5) return;

    const videos = [v7, v8];
    gsap.set(videos, { opacity: 0 });
    gsap.set(v7, { opacity: 1 });

    // Same root-cause fix as setupFixedBgVideo() above -- see
    // blobifySeekableVideo()'s top-of-file comment. Staggered for the
    // same "avoid simultaneous decoder init" reason (see that function's
    // comment for the torch-in-section-1 bug this fixes).
    videos.forEach((v, i) => blobifySeekableVideo(v, i * 250));

    // ---- ROOT CAUSE (this turn's "푸드로 넘어갈때 불투명 레이어" bug) ----
    // Both source clips have their OWN baked-in cinematic fade at each end
    // of the raw file -- this is NOT a CSS/z-index/compositing issue (ruled
    // out via canvas drawImage() readback of the raw decoded frame, which
    // matched the composited screenshot exactly at every scrollY tested).
    // Measured via ffmpeg frame extraction + PIL mean-brightness sampling:
    //   photos-intro-07.mp4 (v7): bright/flat ~15 mean brightness from
    //     0.0s->~4.0s, then fades hard to near-black by 5.0s-6.0s (mean
    //     brightness 15.45 @ 4.0s -> 12.4 @ 4.4s -> 7.17 @ 4.8s -> 4.29 @
    //     5.0s -> ~2.5 @ 5.4s-6.0s, i.e. essentially solid black).
    //   photos-outro-08.mp4 (v8): OPENS on a near-black frame (mean 0.87-
    //     0.93 from 0.0s-0.5s), ramps up to full brightness only by
    //     ~1.3s-1.5s (mean 15.76-18.36), peaks around 3.0s (33.36), then
    //     ALSO fades out again near its own end (18.64 @ 4.0s -> 12.74 @
    //     4.4s -> 6.86 @ 5.0s -> ~4.9 @ 5.9s).
    // The old code scrubbed each clip's `currentTime` linearly across its
    // FULL 0->6s `duration`, so this baked-in dark footage landed right in
    // the middle of the scroll-driven PHOTOS transit -- exactly where
    // section-4's cards are animating in, matching the user's precise
    // complaint ("푸드로 넘어갈때(카드들이 올라오기 전에)" = right as
    // section-4/Food's cards are coming up). Fix: instead of scrubbing the
    // full duration, remap scroll progress onto each clip's own SAFE
    // (consistently-bright) sub-window, skipping the fade-in/fade-out
    // footage at the very start/end of each raw file entirely. The safe
    // windows below were chosen so the v7->v8 hard-cut itself also lands
    // between two comparably-bright frames (v7 @ ~4.0s: mean 15.45; v8 @
    // ~1.3s: mean 15.76), so the handoff itself introduces no visible dip.
    const V7_SAFE_START = 0.0;
    const V7_SAFE_END = 4.0;
    const V8_SAFE_START = 1.3;
    // ROOT-CAUSE FIX ("8번 영상이 끝까지 재생이 안 되고... 9번영상이 틀어질
    // 때, 엄청 컷이 튀어보여" -- video-8 cut off before completion + jarring
    // cut into video-9, this turn). V8_SAFE_END was previously 4.0 --
    // artificially truncating photos-outro-08.mp4 (6.0s native duration)
    // more than 1.5s before its actual end, at a point where the clip's
    // own baked-in fade-out is still actively mid-dim (ffmpeg/PIL
    // mean-brightness sampling: 19.87 @ 4.0s, still dropping). The very
    // next layer -- videos-bg-9.mp4 -- opens on a much darker frame (mean
    // 3.95-4.09 across its own 0.0-1.0s) since its composition is a torch
    // approaching an off-frame woodpile against a mostly-black background.
    // Cutting from v8@4.0 (mean ~20) straight to v9@0.0 (mean ~4) is a
    // ~16-point brightness jump -- exactly what reads as a jarring "컷이
    // 튀어보여". Extending V8_SAFE_END to 5.9s lets v8 keep fading almost
    // all the way to its own natural end (mean brightness by 5.9s: ~5.18,
    // nearly identical to v9's opening ~3.95-4.09) so the v8->v9 handoff
    // now lands between two comparably-dark frames, matching the same
    // "land the hard cut between comparably-bright frames" strategy
    // already used for the v7->v8 boundary above. 5.9s (not the full
    // 6.0s) leaves a hair of margin so a rounding/timing edge case can
    // never seek past the clip's last decodable frame.
    const V8_SAFE_END = 5.9;

    // ---- SECOND, ACTUAL ROOT CAUSE of the persistent black flash ----
    // (found only after the safe-window fix above still didn't resolve
    // the user's report -- "네 말대로 하나도 수정된 게 없어"). Confirmed
    // via polling video.seeking/readyState + a canvas drawImage()
    // brightness readback on every frame across the v7->v8 handoff:
    // video-8 sits completely hidden (opacity:0) with its currentTime
    // frozen at its native t=0.0 (near-black first frame, mean
    // brightness 0.85) for the ENTIRE time v7 is playing. The instant
    // scroll crosses the v7->v8 boundary, its opacity flips to 1 AND its
    // currentTime is set for the very FIRST TIME to V8_SAFE_START (1.3s)
    // in the same tick. Because this is video-8's first-ever seek, the
    // browser's decoder has to cold-start rather than advance from an
    // already-warm position -- confirmed this cold-start seek takes
    // ~400-600ms to resolve (`seeking` stays true, the canvas readback
    // stays pinned to the stale near-black t=0 frame throughout), and
    // since it happens at the EXACT moment opacity also flips to 1, the
    // user sees a solid black layer for that whole window. This is
    // genuinely invisible to a single static screenshot/CSS inspection,
    // since by the time any one frame is captured and examined the seek
    // has often already resolved -- it only shows up as a live black
    // flash mid-scroll, exactly matching the user's repeated complaint.
    // FIX: "pre-warm" each video's decoder by seeking it to its own
    // SAFE_START once, immediately, WHILE STILL HIDDEN (opacity:0) right
    // after its blob source finishes loading -- paying that one-time
    // ~400-600ms cold-seek cost invisibly, long before the user ever
    // scrolls anywhere near the handoff. By the time the real handoff
    // happens, the decoder is already warm at that exact timestamp, so
    // the opacity flip and the (now already-seeked, effectively free)
    // currentTime assignment both resolve with no black frame in
    // between. No `{ once: true }` on the listener: blobifySeekableVideo()
    // swaps `video.src` to a blob URL and calls `video.load()`
    // ASYNCHRONOUSLY after its own fetch() resolves, which fires its own
    // fresh 'loadedmetadata' -- if this listener were removed after the
    // first (pre-blob, non-seekable network src) firing, the seek that
    // actually matters (on the seekable blob src) would never happen.
    function prewarmSeek(video, t) {
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = t;
      });
      if (video.readyState > 0) video.currentTime = t;
    }
    prewarmSeek(v7, V7_SAFE_START);
    prewarmSeek(v8, V8_SAFE_START);

    function seek(video, safeStart, safeEnd, localP) {
      const lp = Math.max(0, Math.min(1, localP));
      const t = safeStart + lp * (safeEnd - safeStart);
      if (video.readyState > 0 && Number.isFinite(t)) {
        video.currentTime = t;
      }
    }

    let activeIndex = 0;
    function setActive(idx) {
      if (idx === activeIndex) return;
      activeIndex = idx;
      videos.forEach((v, i) => gsap.set(v, { opacity: i === idx ? 1 : 0 }));
    }

    // Even split: v7 owns the first half of the whole PHOTOS-group
    // transit, v8 the second half -- see the long comment above for why
    // this guarantees v8 finishes exactly as section-5 begins.
    const PHASE_V7_END = 0.5;
    function renderPhotosChain(p) {
      if (p <= PHASE_V7_END) {
        setActive(0);
        const localP = PHASE_V7_END > 0 ? p / PHASE_V7_END : 1;
        seek(v7, V7_SAFE_START, V7_SAFE_END, localP);
      } else {
        setActive(1);
        const localP = (p - PHASE_V7_END) / (1 - PHASE_V7_END);
        seek(v8, V8_SAFE_START, V8_SAFE_END, localP);
      }
    }

    // Single ScrollTrigger spanning the ENTIRE PHOTOS group (section-3's
    // own top through section-5's own top) -- NOT pinned itself, so
    // (unlike the intro-pin/work-reel-pin patterns elsewhere in this
    // file) a plain independent ScrollTrigger here reliably computes its
    // own correct progress; no "shared render fn direct call" indirection
    // is needed. Covers section-4's pinned conveyor transparently since
    // that pin's own pinSpacing simply stretches the ordinary document
    // scroll distance between section-3's top and section-5's top --
    // this trigger's start/end still land exactly on those two edges.
    ScrollTrigger.create({
      id: 'photos-bg-video',
      trigger: s3,
      endTrigger: s5,
      start: 'top top',
      end: 'top top',
      scrub: true,
      onUpdate: (self) => {
        // layer visible only while genuinely inside the PHOTOS group's
        // own span. NOTE (root-cause fix, this turn): `self.progress` is
        // ALWAYS clamped to [0,1] by GSAP regardless of whether the
        // trigger is actually active, so a `progress >= 0 && progress <=
        // 1` check is a tautology that is permanently true -- that was
        // the actual cause of "torch visible in section-1 on first
        // paint": ScrollTrigger.refresh() on page load fired onRefresh
        // once while scrollY was still 0 (long before section-3), and
        // this tautological check unconditionally set the layer to
        // opacity:1, painting photos-bg-video-7 (a torch/flame frame)
        // directly over section-1's hero. Use `self.isActive` instead,
        // which correctly reflects whether the scroll position is
        // presently inside [start, end].
        gsap.set(layer, { opacity: self.isActive ? 1 : 0 });
        renderPhotosChain(self.progress);
      },
      onRefresh: (self) => {
        gsap.set(layer, { opacity: self.isActive ? 1 : 0 });
        renderPhotosChain(self.progress);
      },
      onLeave: () => gsap.set(layer, { opacity: 0 }),
      onLeaveBack: () => gsap.set(layer, { opacity: 0 }),
    });
  }
  setupPhotosBgVideo();

  /* ============================================================
     SECTION-2 -> SECTION-3 BACKGROUND-LAYER HANDOFF (HARD CUT)
     (see the long comment inside renderLayerOpacity() above for the full
     root-cause writeup of the "6.mp4/7.mp4 사이 페이드아웃 -> 재연결" bug
     this closes).

     #fixed-bg-video and #photos-bg-video-layer are two entirely separate
     DOM layers that were previously each driven by their OWN independent
     ScrollTrigger (one a gradual progress-based fade-OUT, the other a
     binary self.isActive-gated fade-IN). Despite both nominally sharing
     section-3's top as their boundary, two independently-computed
     ScrollTrigger instances are not guaranteed to produce complementary
     opacity at every tick -- live polling proved both layers actually
     read opacity:0 SIMULTANEOUSLY for a real range of scroll positions, a
     genuine double-blackout confirmed visually as a solid black frame.

     FIRST attempted fix (see git history) replaced the two independent
     computations with a single shared ~260px-wide GRADUAL crossfade
     (op1=1-p, op2=p) so the two values were mathematically guaranteed to
     sum to 1 at every tick -- this DID eliminate the double-blackout, but
     introduced a NEW, different visible defect the user then reported:
     for the width of that 260px window, BOTH videos are simultaneously
     partially opaque and thus visibly DOUBLE-EXPOSED/overlapping on
     screen at once (two differently-shaped torches ghosted together) --
     "여전히 두개 영상이 중첩돼. 페이드 전혀 없이 두 영상이 이어지게
     만들어줄 수 있을까?" Any nonzero-width blend/crossfade between two
     DIFFERENT pieces of footage (not the same clip fading through black)
     will always show this double-exposure for as long as both opacities
     are simultaneously above 0 -- there is no partial-blend window that
     avoids it. The only way to guarantee neither a black gap NOR a
     double-exposed overlap is a ZERO-WIDTH instantaneous hard cut: at
     every scroll tick exactly one of the two layers is opacity:1 and the
     other is opacity:0, with no intermediate tick where both are
     simultaneously nonzero.

     FIX: collapse the crossfade window to zero width -- a single
     ScrollTrigger with `start` and `end` both pinned to the exact same
     point (section-3's own top) so `self.progress` can only ever be
     exactly 0 (anywhere before that point) or exactly 1 (anywhere at or
     after it), never a fractional in-between value, and sets BOTH
     layers' opacity from that single shared value in the same callback:
       op(#fixed-bg-video)         = 1 - progress   (1 before, 0 at/after)
       op(#photos-bg-video-layer)  = progress       (0 before, 1 at/after)
     Because both are still written from the ONE shared progress value in
     the SAME callback, op1 + op2 === 1 at every tick exactly as before
     (no double-blackout) -- but since progress itself is now binary
     (never fractional), there is no scroll position where both are
     simultaneously nonzero either (no double-exposure). This is a true
     instant hard-cut, not a fade: #fixed-bg-video's torch and
     #photos-bg-video-layer's torch never render on screen at the same
     time, not even for a single intermediate frame.

     Created LAST (after both setupFixedBgVideo() and setupPhotosBgVideo()
     have already registered their own triggers) so GSAP calls this
     trigger's onUpdate/onRefresh AFTER theirs within any single scroll
     tick -- meaning this trigger's gsap.set calls are always the final,
     winning write for both layers at the exact instant scroll crosses
     section-3's top, regardless of what either layer's own trigger also
     wrote moments earlier in that same tick.
     ============================================================ */
  function setupBgLayerHandoff() {
    const fixedLayer = document.getElementById('fixed-bg-video');
    const photosLayer = document.getElementById('photos-bg-video-layer');
    const s3 = document.getElementById('section-3');
    if (!fixedLayer || !photosLayer || !s3) return;

    function render(p) {
      // p is always exactly 0 or exactly 1 here (start === end, so GSAP
      // can only ever report one of its two clamped endpoints) -- this
      // Math.round is defensive/documents that intent, not a fudge for
      // some observed fractional value.
      const cut = Math.round(Math.max(0, Math.min(1, p)));
      gsap.set(fixedLayer, { opacity: 1 - cut });
      gsap.set(photosLayer, { opacity: cut });
    }

    ScrollTrigger.create({
      id: 'bg-layer-handoff',
      trigger: s3,
      start: 'top top',
      end: 'top top',
      scrub: true,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
  }
  setupBgLayerHandoff();

  /* ============================================================
     VIDEOS BACKGROUND VIDEO -- third "media player" layer, same
     scrub-chain pattern as setupPhotosBgVideo() above but scoped to
     the whole VIDEOS group (section-5 intro through section-7 reels)
     PLUS the outro (section-8). Per the original spec: "비디오 관련
     배경영상을 차례대로 로딩에 최적화되게끔 생성해줘" -- three uploaded
     clips (9/10/11.mp4, each re-encoded from source 4K/24fps down to
     1080p H.264 ~1-2MB for web) hard-cut in sequence 9 -> 10 -> 11 as
     the user scrolls through the group.
     Unlike setupPhotosBgVideo's span (which ends at the NEXT group's
     own top, since photos-outro-08 must fully finish before VIDEOS
     begins), this trigger's `endTrigger`/`end` deliberately reaches
     all the way to section-8's own BOTTOM (not top) -- so the whole
     9..16 chain keeps scrubbing/finishing DURING the outro's own
     scroll transit while the foreground VIDEOS content has already
     risen away (see setupVideosGroupExit() below), exactly matching
     "11번영상이 끝나기 전에 비디오 관련 컨텐츠는 모두 화면위로
     올라가면서 사라져야해" (before video 11 finishes, all video
     content must already have risen off-screen).
     EXTENDED (this turn -- "캡쳐 이미지를 분석해 관련영상이 끝나자마자,
     첨부한 영상 순서대로 투명도 조절없이 원본 그대로, 다만 로딩에
     최적화되게끔, 영상을 이어 올려줘"): 5 more uploaded clips
     (12/13/14/15/16.mp4, same re-encode pipeline: 4K->1080p H.264,
     audio stripped, faststart) appended to the SAME hard-cut chain so
     they play, in order, immediately after video-11 finishes -- see the
     PHASE_V*_END constants and renderVideosChain() below for the exact
     per-clip scroll-progress boundaries and #section-8's extended
     min-height in style.css for the extra scroll runway this needed.
     Phase split is NOT an even 8-way share of progress -- weighted by
     how much actual scroll distance each sub-section consumes (see the
     long comment directly above the PHASE_V9_END.. constants below for
     the full breakdown) so no single clip's scrub feels rushed or
     stretched relative to how long the user is actually looking at its
     corresponding foreground content.
     ============================================================ */
  function setupVideosBgVideo() {
    const layer = document.getElementById('videos-bg-video-layer');
    const v9 = document.getElementById('videos-bg-video-9');
    const v10 = document.getElementById('videos-bg-video-10');
    const v11 = document.getElementById('videos-bg-video-11');
    // NEW (this turn -- "관련영상이 끝나자마자, 첨부한 영상 순서대로
    // 투명도 조절없이 원본 그대로 ... 영상을 이어 올려줘"): 5 more
    // user-uploaded clips, re-encoded 4K->1080p/h264/no-audio/faststart
    // (same pipeline as 9/10/11, ffprobe-confirmed 1920x1080/24fps/
    // exactly 6.000000s each) appended to the SAME hard-cut chain so
    // they play immediately after video-11 finishes, in the exact
    // order supplied: 12 -> 13 -> 14 -> 15 -> 16. Frame-accurate
    // forensics (mean-gray + direct visual diff of extracted first/
    // last frames) confirmed a continuous narrative and clean cut
    // points throughout: v11 ends on the small unlit-torch flame from
    // the user's own reference screenshot; v12 opens on that same
    // torch (now catching) and ends fully ablaze; v13 opens on a
    // near-identical blazing-torch frame then pulls back to reveal a
    // photographer holding the torch/camera; v14 continues that same
    // reveal into a full campfire shot; v15 opens on a near-identical
    // campfire frame then widens to a starry-sky/forest vista; v16
    // opens on that same vista and pushes into a full Milky Way finale.
    const v12 = document.getElementById('videos-bg-video-12');
    const v13 = document.getElementById('videos-bg-video-13');
    const v14 = document.getElementById('videos-bg-video-14');
    const v15 = document.getElementById('videos-bg-video-15');
    const v16 = document.getElementById('videos-bg-video-16');
    const s5 = document.getElementById('section-5');
    const s8 = document.getElementById('section-8');
    if (!layer || !v9 || !v10 || !v11 || !v12 || !v13 || !v14 || !v15 || !v16 || !s5 || !s8) return;

    // NEW (this turn -- "횃불에 불이 붙기 전에 재생을 스크롤다운에도 반응없이,
    // 고정된 화면에서 ... 점멸하는 원 옆에 불을 붙여주세요를 영어로 점멸하게끔
    // ... 원을 클릭하는 순간 불이 붙은 장면에서 다시 멈춤. 거기서 다시
    // 스크롤다운에 반응하는 영상으로 전환"): the "IGNITE GATE" -- a
    // click-to-advance interaction spliced into the middle of v12's
    // otherwise pure scroll-scrub. Optional lookups (feature degrades
    // gracefully to the old pure-scroll chain if this markup is absent).
    const gateEl = document.getElementById('ignite-gate');
    const gateCircle = document.getElementById('ignite-gate-circle');
    const connectedEl = document.getElementById('videos-connected-text');
    // REVISED (explicit user spec -- "더 인터랙티브하게 만들어줘"): the old
    // whole-paragraph fade+translateY is replaced by a per-word stagger
    // (see .vc-word spans in home.html, same structural idiom as
    // .wr-word in the work-reel tagline section) -- each word gets its
    // own small scroll-progress sub-window for the blur/scale/rise
    // reveal, computed in renderVideosChain() below.
    const connectedWords = connectedEl ? gsap.utils.toArray(connectedEl.querySelectorAll('.vc-word')) : [];

    // NEW (this turn -- "이때부터 ... 인터랙티브 요소를 많이 가미해서 넣으려고해
    // ... 포트폴리오 분위기에 맞는 다른 문구"): "This is where stories catch
    // fire" reveals over videos-bg-14.mp4's own stable full-blaze campfire
    // window (see the long CSS comment above #videos-catchfire-text for the
    // frame-forensics that pinpointed this window and the phrase choice).
    const catchfireEl = document.getElementById('videos-catchfire-text');
    const catchfireWords = catchfireEl ? gsap.utils.toArray(catchfireEl.querySelectorAll('.cf-word')) : [];
    const catchfireEmberWord = catchfireEl ? catchfireEl.querySelector('.cf-word--ember') : null;

    // NEW (this turn -- "이 구간부터 JUNE HONG을 인터랙티브 요소를 가미해
    // 넣어보자"): letter-staggered "JUNE HONG" reveal over v15's own
    // stable campfire+forest+Milky Way vista (see the long CSS comment
    // above #videos-junehong-text for the frame-forensics that pinpointed
    // this window).
    const junehongEl = document.getElementById('videos-junehong-text');
    const junehongLetters = junehongEl ? gsap.utils.toArray(junehongEl.querySelectorAll('.jh-letter')) : [];

    // NEW (this turn -- "마지막 프레임에 닿기 전에, 스크롤에 반응하면서
    // 나오게끔해줘"): closing contact/branding footer, line-staggered,
    // revealed over the tail of v16's own local progress (see the long
    // CSS comment above #videos-footer-text for the full rationale).
    const footerEl = document.getElementById('videos-footer-text');
    const footerLines = footerEl ? gsap.utils.toArray(footerEl.querySelectorAll('.vf-line')) : [];

    const videos = [v9, v10, v11, v12, v13, v14, v15, v16];
    gsap.set(videos, { opacity: 0, yPercent: 0 });
    gsap.set(v9, { opacity: 1 });

    // Same root-cause fix as the other two bg-video layers -- see
    // blobifySeekableVideo()'s top-of-file comment. Staggered 250ms
    // apart per video for the same "avoid simultaneous decoder init"
    // reason (now 8 videos, so v16 initializes at +1750ms).
    videos.forEach((v, i) => blobifySeekableVideo(v, i * 250));

    // Pre-warm each clip's decoder at its own t=0 while still hidden,
    // same "avoid a cold-seek black-flash on first reveal" fix as
    // setupPhotosBgVideo's prewarmSeek() -- see that function's long
    // comment for the full root-cause writeup.
    function prewarmSeek(video, t) {
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = t;
      });
      if (video.readyState > 0) video.currentTime = t;
    }
    videos.forEach((v) => prewarmSeek(v, 0));

    // All eight re-encoded clips are exactly 6.000000s (ffprobe-confirmed);
    // no baked-in fade-to-black footage was found at either end of any of
    // them, so -- unlike setupPhotosBgVideo's V7/V8_SAFE_START/END -- the
    // full [0, 6] duration is used directly with no safe-window remapping
    // needed.
    const CLIP_DURATION = 6.0;
    function seek(video, localP) {
      const t = Math.max(0, Math.min(1, localP)) * CLIP_DURATION;
      if (video.readyState > 0 && Number.isFinite(t)) {
        video.currentTime = t;
      }
    }

    // ROOT-CAUSE FIX ("영상과 영상 사이가 매끄럽게 이어져야하는데, 툭 끊겨서
    // 나와" -- video-to-video hard-cut bug). The old setActive() did an
    // instant gsap.set({opacity: i===idx?1:0}) at each phase boundary --
    // a true zero-duration hard cut, which is exactly what reads as
    // "끊김" (a jarring cut) no matter how well-matched the two clips'
    // content is. FIX: replace the binary setActive() with a continuous,
    // scroll-progress-driven crossfade computed directly from `p` (NOT a
    // gsap.to() time-tween -- a time-based tween would fall out of sync
    // with scroll position on fast/slow scrubbing and wouldn't reverse
    // cleanly on scroll-up, since this whole chain is scroll-linked, not
    // time-linked). Every frame, all three videos are seeked to their own
    // correct local timestamp (clamped to [0,1] by seek() itself) and
    // assigned a complementary opacity pair that sums to 1 across the
    // active hand-off, so exactly one "unit" of coverage is ever visible
    // and brightness is never doubled/dimmed by the overlap itself.
    //
    // Asymmetric crossfade widths, chosen from frame-accurate ffmpeg
    // forensics on the actual re-encoded clips (mean-gray sampled at each
    // clip's start/end + direct visual diff of the extracted frames):
    // - v9 end (torch approaching an unlit woodpile) matches v10's start
    //   (same pose, same unlit woodpile, mean-gray ~14-15 vs ~16-19) almost
    //   frame-for-frame -- a wider, more visible crossfade here reads as a
    //   clean, deliberate dissolve with no ghosting.
    // - v10 end (woodpile now fully ablaze, one specific flame silhouette)
    //   does NOT match v11's start (also fully ablaze, but a visibly
    //   different flame shape/camera angle) -- crossfading these two
    //   different pieces of footage will always show a brief double-
    //   exposed blend for the width of the transition (this is the same
    //   "two different clips never crossfade cleanly" constraint already
    //   documented on setupBgLayerHandoff() above, which is why THAT
    //   handoff deliberately stays a hard cut). Since the user explicitly
    //   asked for smooth connections here, this boundary uses a much
    //   SHORTER crossfade window instead of a hard cut -- short enough
    //   that the mismatched-content blend is barely perceptible, while
    //   still removing the "cut" feeling entirely.
    // ROOT-CAUSE FIX (explicit user spec, this turn -- "여전히 두 구간에서
    // 컷대컷으로 붙는 하드 컷이 아니야. 살짝씩 디졸브가 껴있는 느낌"): the
    // XFADE_V9_V10 / XFADE_V10_V11 windows above deliberately blended two
    // videos' opacity across a nonzero-width scroll range, which reads as
    // exactly the soft dissolve the user is now explicitly asking to
    // remove. Same "zero-width hard cut" fix already applied elsewhere in
    // this file (see setupBgLayerHandoff()'s long comment) -- collapse
    // both transition windows to zero width so at every scroll tick
    // exactly ONE of v9/v10/v11 is opacity:1 and the other two are
    // opacity:0, with no intermediate tick where two are simultaneously
    // nonzero (i.e. no dissolve, ever).
    //
    // EXTENDED to 8 clips (this turn -- "투명도 조절없이 원본 그대로 ...
    // 영상을 이어 올려줘", explicitly repeating the "no opacity blending"
    // requirement for the 5 newly-appended clips): every new boundary
    // below uses the exact same zero-width hard-cut pattern as the
    // original v9/v10/v11 boundaries -- one clip's opacity is always
    // exactly 1 and all others exactly 0, never blended.
    //
    // Phase widths are NOT an even 8-way split -- weighted by actual
    // scroll distance each stretch consumes, same principle as the
    // original 3-clip comment above: section-5 (v9) = 100vh flat;
    // section-6 (v10) pin = 22%*14 = 308vh; section-7 (v11) pin =
    // 30%*11 = 330vh (v9+v10+v11 old total = 838vh, unchanged); each new
    // clip (v12-v16) gets its own fresh 100vh slice carved out of
    // section-8's now-extended height (see .videos-outro's min-height in
    // style.css) so none of the 5 new clips scrubs by faster than v9's
    // own original pace. New grand total = 838 + 5*100 = 1338vh; boundary
    // fractions below are each clip's cumulative-vh-so-far / 1338.
    const PHASE_V9_END = 0.093946;
    const PHASE_V10_END = 0.344469;
    const PHASE_V11_END = 0.626308;
    const PHASE_V12_END = 0.701046;
    const PHASE_V13_END = 0.775785;
    const PHASE_V14_END = 0.850523;
    const PHASE_V15_END = 0.925262;
    // PHASE_V16_END is implicitly 1.0 (last clip in the chain).

    // ROOT-CAUSE FIX (explicit user spec -- "첫번째 이미지, 컷 투로 바로
    // 붙는 게 아니고, 토치도 화면 아래서부터 스크롤다운에 반응하면서
    // 올라와야지"): the v11->v12 handoff used to be a pure instant
    // opacity swap (v12 simply appearing at opacity:1 already in its
    // final resting position the moment p crossed PHASE_V11_END), which
    // reads exactly as the "컷 투로 바로 붙는" hard cut the user is now
    // asking to remove. RISE_START..RISE_END carves out a lead-in window
    // from the TAIL of v11's own scroll range (v11 keeps playing/visible
    // normally throughout) during which v12 becomes visible too --
    // positioned via a continuous translateY(yPercent) so it visually
    // enters by rising up from below the viewport, in lockstep with
    // scroll-down, reaching its fully-in-place resting position exactly
    // at RISE_END (== GATE_PROGRESS below, the point the ignite-gate
    // arms). This is NOT an opacity dissolve -- v12 is always fully
    // opaque (opacity:1) whenever visible at all; it simply occludes a
    // growing slice of the frame as it rises, so wherever it hasn't yet
    // covered, v11's own already-opaque pixels show through underneath
    // with zero alpha-blending between the two clips. Scrolling back up
    // reverses the rise smoothly (yPercent is a pure function of p), same
    // "interactive/reversible" contract as every other scroll-tied
    // effect on this page.
    const RISE_WIDTH = 0.03;
    const RISE_END = PHASE_V11_END; // numerically == GATE_PROGRESS, defined further below
    const RISE_START = Math.max(PHASE_V10_END, RISE_END - RISE_WIDTH);

    function renderVideosChain(p) {
      const local9 = PHASE_V9_END > 0 ? p / PHASE_V9_END : 1;
      const local10 = (p - PHASE_V9_END) / (PHASE_V10_END - PHASE_V9_END);
      const local11 = (p - PHASE_V10_END) / (PHASE_V11_END - PHASE_V10_END);
      const local12 = (p - PHASE_V11_END) / (PHASE_V12_END - PHASE_V11_END);
      const local13 = (p - PHASE_V12_END) / (PHASE_V13_END - PHASE_V12_END);
      const local14 = (p - PHASE_V13_END) / (PHASE_V14_END - PHASE_V13_END);
      const local15 = (p - PHASE_V14_END) / (PHASE_V15_END - PHASE_V14_END);
      const local16 = (p - PHASE_V15_END) / (1 - PHASE_V15_END);
      seek(v9, local9);
      seek(v10, local10);
      seek(v11, local11);
      seek(v12, local12);
      seek(v13, local13);
      seek(v14, local14);
      seek(v15, local15);
      seek(v16, local16);

      let o9 = 0, o10 = 0, o11 = 0, o12 = 0, o13 = 0, o14 = 0, o15 = 0, o16 = 0;

      if (p < PHASE_V9_END) {
        o9 = 1;
      } else if (p < PHASE_V10_END) {
        o10 = 1;
      } else if (p < PHASE_V11_END) {
        o11 = 1;
      } else if (p < PHASE_V12_END) {
        o12 = 1;
      } else if (p < PHASE_V13_END) {
        o13 = 1;
      } else if (p < PHASE_V14_END) {
        o14 = 1;
      } else if (p < PHASE_V15_END) {
        o15 = 1;
      } else {
        o16 = 1;
      }

      // Rise-up entrance window (see RISE_START/RISE_END long comment
      // above): while p sits inside [RISE_START, RISE_END), v12 turns
      // visible EARLY (ahead of its normal PHASE_V11_END cut point) and
      // is stacked on TOP of v11 (v11 stays opacity:1 underneath,
      // unchanged -- z-order alone, no blending) while a translateY
      // pushes v12 down below the frame at the window's start and
      // eases it up to 0 (fully in place) by the window's end. Once p
      // reaches RISE_END the normal hard-cut logic above has already
      // taken over (o11=0/o12=1), so this only ever touches the brief
      // lead-in, never the steady-state hold.
      let riseYPercent = 0;
      if (p >= RISE_START && p < RISE_END && RISE_END > RISE_START) {
        const riseP = (p - RISE_START) / (RISE_END - RISE_START);
        riseYPercent = (1 - riseP) * 100; // 100% (fully below frame) -> 0% (in place)
        o12 = 1; // pulled forward so it's visible during the rise, stacked above v11
      } else if (p >= RISE_END) {
        riseYPercent = 0; // fully settled for the remainder of v12's normal hold
      }

      gsap.set(v9, { opacity: o9 });
      gsap.set(v10, { opacity: o10 });
      gsap.set(v11, { opacity: o11, zIndex: 0 });
      gsap.set(v12, { opacity: o12, yPercent: riseYPercent, zIndex: 1 });
      gsap.set(v13, { opacity: o13 });
      gsap.set(v14, { opacity: o14 });
      gsap.set(v15, { opacity: o15 });
      gsap.set(v16, { opacity: o16 });

      // NEW (this turn -- "두번째 첨부이미지가 나오는 시점에서 ...
      // 인터랙티브하게 나오게끔"): "You are now connected with my work"
      // reveals continuously as the user scrubs through v13's own
      // "photographer reveal" window -- frame-accurate ffmpeg/PIL mean-
      // gray forensics on videos-bg-13.mp4 found the torch-only shot flat
      // at brightness~16 for t=0-1s, then rising as the camera pulls back
      // to reveal the photographer, peaking at t=2.0s (brightness 24.16,
      // the closest match to the user's second attached screenshot) --
      // so the reveal is keyed to local13 (v13's own 0..1 local progress,
      // already computed above), NOT a fixed fade-in/out timer, making it
      // directly scroll-position-driven (scrubs forward AND reverses
      // cleanly on scroll-up, same "interactive" contract as every other
      // scroll-tied effect on this page) rather than a static one-shot
      // reveal.
      // REVISED (explicit user spec -- "문장 마지막에 마침표를 없애주고,
      // 더 인터랙티브하게 만들어줘"): trailing period removed from the
      // sentence in home.html (now "...with my work", no "."); the old
      // whole-paragraph fade+translateY(26px) is replaced by a per-word
      // stagger over .vc-word spans (same idiom as .wr-word in the
      // work-reel tagline section) -- each of the 7 words gets its own
      // small overlapping sub-window inside the overall in/out envelope
      // below, animating opacity + blur(px->0) + translateY + scale in
      // lockstep with scroll, so the sentence visibly assembles itself
      // word-by-word as the user scrolls (and un-assembles word-by-word
      // in reverse on scroll-up) instead of appearing/leaving as one
      // static block.
      if (connectedEl) {
        const CONNECTED_IN_START = 0.25;
        const CONNECTED_IN_END = 0.4167;
        const CONNECTED_OUT_START = 0.82;
        const CONNECTED_OUT_END = 0.96;
        let co = 0;
        if (local13 >= CONNECTED_IN_START && local13 <= CONNECTED_OUT_END) {
          if (local13 < CONNECTED_IN_END) {
            co = (local13 - CONNECTED_IN_START) / (CONNECTED_IN_END - CONNECTED_IN_START);
          } else if (local13 < CONNECTED_OUT_START) {
            co = 1;
          } else {
            co = 1 - (local13 - CONNECTED_OUT_START) / (CONNECTED_OUT_END - CONNECTED_OUT_START);
          }
        }
        co = Math.max(0, Math.min(1, co));
        gsap.set(connectedEl, { opacity: co > 0.01 ? 1 : 0 });

        if (connectedWords.length) {
          const WORD_COUNT = connectedWords.length;
          // Each word's own reveal ramps across a BAND-wide slice of the
          // overall [0,1] "co" envelope, staggered left-to-right (word 0
          // starts revealing first, the last word finishes last), with
          // adjacent bands overlapping by half so the sentence assembles
          // smoothly rather than one word waiting for the previous one
          // to fully finish. On the way OUT (co falling from 1 back to
          // 0) the exact same per-word bands run in reverse, so the
          // sentence disassembles word-by-word in the mirror order.
          const BAND = 1 / (WORD_COUNT * 0.6);
          connectedWords.forEach((word, i) => {
            const bandStart = (i / WORD_COUNT) * (1 - BAND) * 0.6;
            const wp = Math.max(0, Math.min(1, (co - bandStart) / BAND));
            gsap.set(word, {
              opacity: wp,
              y: (1 - wp) * 22,
              scale: 0.94 + wp * 0.06,
              filter: `blur(${(1 - wp) * 6}px)`,
            });
          });
        }
      }

      // NEW (this turn -- campfire scene interactive text). Reveals
      // continuously as the user scrubs through v14's own stable
      // full-blaze campfire window -- keyed to local14 (v14's own 0..1
      // local progress, already computed above), same "scroll-position-
      // driven, never a fixed timer" contract as the connectedEl block
      // above. IN window starts at local14 0.22 (just after the
      // photographer->campfire motion-blur transition settles, per the
      // fine-grained frame forensics in the CSS comment) and OUT window
      // ends at local14 0.92 (just before v15's own campfire->forest/
      // starry-sky reveal begins), so the text is only ever visible
      // while the screen shows the isolated campfire matching the
      // user's reference screenshot.
      if (catchfireEl) {
        const CATCHFIRE_IN_START = 0.22;
        const CATCHFIRE_IN_END = 0.40;
        const CATCHFIRE_OUT_START = 0.78;
        const CATCHFIRE_OUT_END = 0.92;
        let cf = 0;
        if (local14 >= CATCHFIRE_IN_START && local14 <= CATCHFIRE_OUT_END) {
          if (local14 < CATCHFIRE_IN_END) {
            cf = (local14 - CATCHFIRE_IN_START) / (CATCHFIRE_IN_END - CATCHFIRE_IN_START);
          } else if (local14 < CATCHFIRE_OUT_START) {
            cf = 1;
          } else {
            cf = 1 - (local14 - CATCHFIRE_OUT_START) / (CATCHFIRE_OUT_END - CATCHFIRE_OUT_START);
          }
        }
        cf = Math.max(0, Math.min(1, cf));
        gsap.set(catchfireEl, { opacity: cf > 0.01 ? 1 : 0 });

        if (catchfireWords.length) {
          const CF_WORD_COUNT = catchfireWords.length;
          const CF_BAND = 1 / (CF_WORD_COUNT * 0.6);
          catchfireWords.forEach((word, i) => {
            const bandStart = (i / CF_WORD_COUNT) * (1 - CF_BAND) * 0.6;
            const wp = Math.max(0, Math.min(1, (cf - bandStart) / CF_BAND));
            gsap.set(word, {
              opacity: wp,
              y: (1 - wp) * 22,
              scale: 0.94 + wp * 0.06,
              filter: `blur(${(1 - wp) * 6}px)`,
            });
          });
        }

        // "더 인터랙티브하게" embellishment: once the final word ("fire")
        // has fully assembled (wp==1, i.e. cf has reached the end of its
        // own band), toggle a CSS class that warms it from white to a
        // flame-orange with a gently pulsing glow -- purely a scroll-
        // driven boolean derived from cf, not a separate timer, so it
        // still reverses cleanly on scroll-up (class removed the instant
        // cf drops back below full for that word's band).
        if (catchfireEmberWord) {
          const emberIndex = catchfireWords.indexOf(catchfireEmberWord);
          const emberBandStart = emberIndex >= 0 ? (emberIndex / catchfireWords.length) * (1 - (1 / (catchfireWords.length * 0.6))) * 0.6 : 0;
          const emberBand = 1 / (catchfireWords.length * 0.6);
          const emberWp = Math.max(0, Math.min(1, (cf - emberBandStart) / emberBand));
          catchfireEmberWord.classList.toggle('is-ablaze', emberWp >= 1);
        }
      }

      // NEW (this turn -- campfire+forest+Milky Way vista interactive
      // brand reveal). Reveals continuously as the user scrubs through
      // v15's own wide-vista hold window -- keyed to local15 (v15's own
      // 0..1 local progress, already computed above), same "scroll-
      // position-driven, never a fixed timer" contract as the
      // connectedEl/catchfireEl blocks above. IN window starts at
      // local15 0.46 (right after the forest/Milky Way reveal settles,
      // per the fine-grained frame forensics in the CSS comment) and OUT
      // window ends at local15 0.94 (just before the v15->v16 clip cut),
      // so the name is only ever visible while the screen shows the
      // full campfire+forest+starry-sky composition matching the user's
      // reference screenshot.
      if (junehongEl) {
        const JUNEHONG_IN_START = 0.46;
        const JUNEHONG_IN_END = 0.62;
        const JUNEHONG_OUT_START = 0.82;
        const JUNEHONG_OUT_END = 0.94;
        let jh = 0;
        if (local15 >= JUNEHONG_IN_START && local15 <= JUNEHONG_OUT_END) {
          if (local15 < JUNEHONG_IN_END) {
            jh = (local15 - JUNEHONG_IN_START) / (JUNEHONG_IN_END - JUNEHONG_IN_START);
          } else if (local15 < JUNEHONG_OUT_START) {
            jh = 1;
          } else {
            jh = 1 - (local15 - JUNEHONG_OUT_START) / (JUNEHONG_OUT_END - JUNEHONG_OUT_START);
          }
        }
        jh = Math.max(0, Math.min(1, jh));
        gsap.set(junehongEl, { opacity: jh > 0.01 ? 1 : 0 });

        if (junehongLetters.length) {
          // Letter-by-letter stagger (per explicit user choice: "레터
          // 스태거로 가줘"), same per-item "band" idiom as the word-
          // stagger blocks above but sliced across individual characters
          // instead of whole words -- reads as a name assembling itself
          // letter by letter, like a title card / signature reveal.
          const JH_COUNT = junehongLetters.length;
          const JH_BAND = 1 / (JH_COUNT * 0.6);
          junehongLetters.forEach((letter, i) => {
            const bandStart = (i / JH_COUNT) * (1 - JH_BAND) * 0.6;
            const wp = Math.max(0, Math.min(1, (jh - bandStart) / JH_BAND));
            gsap.set(letter, {
              opacity: wp,
              y: (1 - wp) * 30,
              scale: 0.9 + wp * 0.1,
              filter: `blur(${(1 - wp) * 10}px)`,
            });
            letter.classList.toggle('is-lit', wp >= 1);
          });
        }
      }

      // NEW (this turn -- closing footer). Reveals continuously as the
      // user scrubs through v16's own final stretch -- keyed to local16
      // (v16's own 0..1 local progress, already computed above), same
      // "scroll-position-driven, never a fixed timer" contract as every
      // other reveal in this chain. IN window (0.72 -> 0.88) sits inside
      // v16's stable full Milky Way finale (frame-forensics: the
      // forest/tree-silhouette motion settles into the static wide sky
      // vista by roughly local16 0.55-0.6 and holds unchanged through
      // 1.0 -- see videos-bg-16.mp4 grid samples), and critically
      // FINISHES (reaches full opacity) well BEFORE local16=1 so the
      // footer is already fully readable by the time scrolling bottoms
      // out. UNLIKE the three ephemeral "moment" overlays above
      // (connectedEl/catchfireEl/junehongEl), this is real footer
      // content -- once revealed it should stay put rather than fade
      // back out, so there is deliberately no OUT window: fo simply
      // holds at 1 for the remainder of local16 (including exactly at
      // and "past" 1.0, since seek()/mainST below now clamp there
      // instead of blacking out).
      if (footerEl) {
        const FOOTER_IN_START = 0.72;
        const FOOTER_IN_END = 0.88;
        let fo = 0;
        if (local16 >= FOOTER_IN_START) {
          fo = local16 < FOOTER_IN_END
            ? (local16 - FOOTER_IN_START) / (FOOTER_IN_END - FOOTER_IN_START)
            : 1;
        }
        fo = Math.max(0, Math.min(1, fo));
        gsap.set(footerEl, { opacity: fo > 0.01 ? 1 : 0 });

        if (footerLines.length) {
          const FL_COUNT = footerLines.length;
          const FL_BAND = 1 / (FL_COUNT * 0.6);
          footerLines.forEach((line, i) => {
            const bandStart = (i / FL_COUNT) * (1 - FL_BAND) * 0.6;
            const lp = Math.max(0, Math.min(1, (fo - bandStart) / FL_BAND));
            gsap.set(line, {
              opacity: lp,
              y: (1 - lp) * 24,
              filter: `blur(${(1 - lp) * 8}px)`,
            });
          });
        }
      }
    }

    /* ==========================================================
       IGNITE GATE state machine -- see the long comment above the
       gateEl/gateCircle/connectedEl lookups near the top of this
       function for the full user-spec quote. Splices a click-to-advance
       interaction into v12's otherwise pure scroll-scrub: right as v12
       begins (t=0, confirmed via forensics as a stable fully-unlit torch
       silhouette held flat through t~1.3s -- see v12_t0.jpg), scroll is
       physically locked (wheel/touchmove/keys prevented + actual scroll
       position pinned via ScrollTrigger's own self.scroll() setter, NOT
       just a visual freeze -- matches "고정된 화면" / "a fixed screen")
       and a flickering circular hotspot + "Light the torch" CTA fade in
       (see #ignite-gate CSS). Clicking the circle plays a TIME-based
       (not scroll-based) GSAP tween of the shared progress value from
       the hold point through the ignition burst to a steady, settled
       burn (t=2.35s -- chosen deliberately AFTER the brightest t~1.9s
       ignition-flash peak, confirmed via fine-grained brightness
       forensics: t=1.9 -> 33.25, t=2.3 -> 24.70, t=2.4 -> 21.41 -- so the
       freeze lands on "torch is now lit" rather than "mid-flash burst").
       Once that tween completes, actual scroll position is advanced to
       match (so the frozen frame doesn't jump when scroll unlocks) and
       normal scroll-scrub resumes for the remainder of the chain.
       ========================================================== */
    const V12_PHASE_WIDTH = PHASE_V12_END - PHASE_V11_END;
    const GATE_PROGRESS = PHASE_V11_END; // t=0 of v12 -- fully unlit hold frame
    const LIT_PROGRESS = PHASE_V11_END + V12_PHASE_WIDTH * (2.35 / CLIP_DURATION); // t=2.35s -- steady lit burn
    const GATE_RESET_MARGIN = 0.004;
    let gateState = 'idle'; // idle | armed | igniting | released
    let mainST = null;

    function blockScrollEvent(e) { e.preventDefault(); }
    function blockScrollKeys(e) {
      if (e.target === gateCircle) return;
      const blocked = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Spacebar', 'End', 'Home'];
      if (blocked.indexOf(e.key) !== -1) e.preventDefault();
    }
    function lockScroll() {
      window.addEventListener('wheel', blockScrollEvent, { passive: false });
      window.addEventListener('touchmove', blockScrollEvent, { passive: false });
      window.addEventListener('keydown', blockScrollKeys, { passive: false });
    }
    function unlockScroll() {
      window.removeEventListener('wheel', blockScrollEvent, { passive: false });
      window.removeEventListener('touchmove', blockScrollEvent, { passive: false });
      window.removeEventListener('keydown', blockScrollKeys, { passive: false });
    }
    function scrollToProgress(p) {
      if (!mainST) return;
      mainST.scroll(mainST.start + p * (mainST.end - mainST.start));
    }
    function armGate() {
      gateState = 'armed';
      scrollToProgress(GATE_PROGRESS);
      renderVideosChain(GATE_PROGRESS);
      if (gateEl) {
        gateEl.classList.remove('is-igniting');
        gateEl.classList.add('is-armed');
        gsap.to(gateEl, { opacity: 1, duration: 0.5 });
      }
      lockScroll();
    }
    function igniteTorch() {
      if (gateState !== 'armed') return;
      gateState = 'igniting';
      if (gateEl) {
        gateEl.classList.add('is-igniting');
        gateEl.classList.remove('is-armed');
      }
      const proxy = { p: GATE_PROGRESS };
      gsap.to(proxy, {
        p: LIT_PROGRESS,
        duration: 1.3,
        ease: 'power2.out',
        onUpdate: () => renderVideosChain(proxy.p),
        onComplete: () => {
          gateState = 'released';
          if (gateEl) gsap.set(gateEl, { opacity: 0 });
          scrollToProgress(LIT_PROGRESS);
          unlockScroll();
        },
      });
    }
    if (gateCircle) gateCircle.addEventListener('click', igniteTorch);

    function handleVideosProgress(p) {
      if (gateEl && gateCircle) {
        if (gateState === 'idle' && p >= GATE_PROGRESS) {
          armGate();
          return;
        }
        if (gateState === 'armed') {
          renderVideosChain(GATE_PROGRESS);
          return;
        }
        if (gateState === 'igniting') {
          // The click-triggered tween above owns rendering exclusively
          // while it runs -- ignore scroll-driven updates entirely so the
          // two never fight over the shared video elements' currentTime.
          return;
        }
        if (gateState === 'released' && p < GATE_PROGRESS - GATE_RESET_MARGIN) {
          // Scrolled back up above the gate zone -- reset so scrolling
          // back down re-triggers the click-to-ignite gate again.
          gateState = 'idle';
        }
      }
      renderVideosChain(p);
    }

    // Single ScrollTrigger spanning section-5's own top through
    // section-8's own BOTTOM (see the long comment above for why this
    // differs from setupPhotosBgVideo's "ends at the NEXT group's top"
    // span). Transparently covers section-6/7's own pinned conveyor
    // runs, same as setupPhotosBgVideo covers section-4's pin.
    //
    // ROOT-CAUSE FIX (explicit user spec, this turn -- "마지막 영상에서
    // 마지막 프레임을 홀드해줘"): the OLD onUpdate/onRefresh/onLeave below
    // gated the whole layer's opacity on `self.isActive` alone, which
    // GSAP reports as false BOTH before this trigger's start (progress
    // pinned at 0 -- correct, nothing to show yet) AND after its end
    // (progress pinned at 1, once the user scrolls all the way to the
    // document's true bottom -- WRONG, this is exactly the "hold on
    // v16's last frame" moment, yet the old code faded the entire video
    // layer to fully transparent/black right at that instant, visibly
    // "losing" the last frame the user scrolled all the way to see).
    // Confirmed via direct Playwright progress sampling: at progress
    // 0.999 the layer was opacity 1 (v16 mid-frame), but at progress
    // 1.0 (and beyond, since the document has no further scroll room
    // past that point) isActive flips false and the old code snapped
    // opacity to 0 -- a hard cut to black baked directly into the
    // "reaching the end" experience. FIX: distinguish the two
    // false-isActive cases by `self.progress` itself (0 = at-or-before
    // start, 1 = at-or-after end -- these never collide) instead of
    // isActive alone: show the layer whenever active OR fully past the
    // end (progress>=1), only hide when genuinely before the start
    // (progress<=0 and not active). onLeave (forward exit, i.e.
    // reaching the true end) no longer forces opacity:0 at all -- the
    // last v9-v16 opacity state written by handleVideosProgress()/
    // renderVideosChain() right before this point already has exactly
    // one clip (v16) sitting at opacity:1, seeked to its own final
    // frame (see seek()'s CLIP_DURATION clamp above), so simply leaving
    // the layer visible holds that exact last frame indefinitely.
    // onLeaveBack (scrolling back UP above section-5's own top) is
    // unchanged -- that direction correctly still hides the layer.
    mainST = ScrollTrigger.create({
      id: 'videos-bg-video',
      trigger: s5,
      endTrigger: s8,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const show = self.isActive || self.progress >= 1;
        gsap.set(layer, { opacity: show ? 1 : 0 });
        handleVideosProgress(self.progress);
      },
      onRefresh: (self) => {
        const show = self.isActive || self.progress >= 1;
        gsap.set(layer, { opacity: show ? 1 : 0 });
        handleVideosProgress(self.progress);
      },
      // onLeave intentionally does nothing now (see long comment above --
      // forcing opacity:0 here is exactly the "loses the last frame" bug).
      onLeaveBack: () => {
        gsap.set(layer, { opacity: 0 });
        // Safety net: if the user jumps away entirely (dot-nav click,
        // header nav link, etc.) while the gate had scroll locked, make
        // sure the lock/UI don't stay stuck engaged off-section.
        if (gateState === 'armed' || gateState === 'igniting') {
          gateState = 'idle';
          unlockScroll();
          if (gateEl) gsap.set(gateEl, { opacity: 0 });
        }
      },
    });
  }
  setupVideosBgVideo();

  /* ============================================================
     SECTION-5 BACKGROUND-LAYER HANDOFF (HARD CUT) -- #photos-bg-video-
     layer -> #videos-bg-video-layer, at section-5's own top. Exact
     same "single shared binary progress value written to both layers
     in one callback" pattern as setupBgLayerHandoff() above (see that
     function's long comment for the full double-blackout /
     double-exposure root-cause writeup this class of fix prevents).
     Created AFTER both setupPhotosBgVideo() and setupVideosBgVideo()
     so its writes are always the final, winning ones for both layers
     at the exact instant scroll crosses section-5's top.
     ============================================================ */
  function setupPhotosVideosLayerHandoff() {
    const photosLayer = document.getElementById('photos-bg-video-layer');
    const videosLayer = document.getElementById('videos-bg-video-layer');
    const s5 = document.getElementById('section-5');
    if (!photosLayer || !videosLayer || !s5) return;

    // ROOT-CAUSE FIX ("첫번째 섹션이 다시 토치가 나와" -- section-1 torch
    // regression, this turn). This is a zero-width (start===end) trigger
    // anchored at section-5's top, so GSAP can only ever report its
    // progress as exactly 0 or exactly 1 -- 0 meaning "anywhere at or
    // before section-5's top" and 1 meaning "at or after it". The bug:
    // "anywhere at or before section-5's top" ALSO includes scrollY=0
    // (section-1, the very first paint) and the whole section-1/2 span
    // that #fixed-bg-video owns -- yet this trigger's onRefresh fires
    // once unconditionally on page load (GSAP's standard behavior for
    // every registered trigger) and unconditionally writes
    // photosLayer's opacity to 1 (progress=0 -> cut=0 -> 1-cut=1),
    // stomping over #photos-bg-video-layer's correct opacity:0 already
    // set by setupBgLayerHandoff() moments earlier in the same tick --
    // since this trigger is created LAST, its write always wins. The
    // visible result: photos-bg-video-7 (a torch/flame frame) sits at
    // opacity:1 directly behind section-1's hero on first load, exactly
    // the same class of bug the "self.isActive vs. tautological
    // progress check" fix elsewhere in this file (see the long comment
    // inside setupPhotosBgVideo's ScrollTrigger.create) already solved
    // once for a near-identical case -- this second, newer trigger
    // reintroduced it. FIX: this handoff's hard-cut logic is only
    // meaningful once scroll has actually reached the PHOTOS group
    // (section-3's own top, where 'photos-bg-video' -- the trigger that
    // owns photosLayer for its entire active span -- begins). Before
    // that point, this handoff must do nothing at all and leave
    // photosLayer/videosLayer exactly as setupBgLayerHandoff() /
    // setupPhotosBgVideo() / setupVideosBgVideo() already set them.
    // THIRD ROOT-CAUSE FIX (explicit user spec, this turn -- "여전히 두
    // 구간에서 컷대컷으로 붙는 하드 컷이 아니야. 살짝씩 디졸브가 껴있는
    // 느낌"): the short scroll-span blend introduced by the SECOND fix
    // above (a ~12%vh-wide continuous opacity blend) is itself exactly
    // the soft dissolve the user is now explicitly asking to remove.
    // Reverted back to a true zero-width hard cut -- start and end are
    // both pinned to the exact same point (section-5's own top), so
    // self.progress can only ever be exactly 0 or exactly 1, never a
    // fractional in-between value that would blend the two layers.
    function render(p, self) {
      if (self) {
        const photosBgTrigger = ScrollTrigger.getById('photos-bg-video');
        if (photosBgTrigger && self.scroll() < photosBgTrigger.start) return;
      }
      const cut = Math.round(Math.max(0, Math.min(1, p)));
      gsap.set(photosLayer, { opacity: 1 - cut });
      gsap.set(videosLayer, { opacity: cut });
    }

    ScrollTrigger.create({
      id: 'photos-videos-layer-handoff',
      trigger: s5,
      start: 'top top',
      end: 'top top',
      scrub: true,
      onUpdate: (self) => render(self.progress, self),
      onRefresh: (self) => render(self.progress, self),
    });
  }
  setupPhotosVideosLayerHandoff();

  /* ============================================================
     VIDEOS GROUP EXIT -- "11번영상이 끝나기 전에 비디오 관련 컨텐츠는
     모두 화면위로 올라가면서 사라져야해" (before video-11 finishes,
     all video-related content must rise up off-screen and disappear).
     Same rise+fade treatment as setupClientWall's own wall-exit block
     above (translateY toward -60% of viewport height, combined with an
     opacity fade), applied here to the VIDEOS group's two persistent
     fixed overlays (panel-nav's category list + Details/Videos pills,
     and the "VIDEOS" group-title) since section-7's reels conveyor
     itself already fully frames its last thumbnail off-screen before
     its own pin releases (see edgeMargin/edgeFade in setupConveyor) --
     these two fixed elements are the only VIDEOS-group content still
     left on screen by that point.
     Trigger window: section-7's own 'bottom 85%' -> 'bottom top' --
     the latter is geometrically identical to section-8's own top, so
     both targets are fully risen/invisible by the exact moment the
     outro section begins, well before video-11's own scrub range
     (which continues through section-8's BOTTOM, see
     setupVideosBgVideo above) reaches its end.
     NOTE (Bug 3 fix): this used to re-assert `xPercent: -50` alongside y on
     every frame, because GSAP's inline `transform` write takes full
     ownership of that property once written, and .panel-nav / .group-title
     used to center themselves via CSS `left:50%; transform:translateX(-50%)`
     (a self-referential-width transform). That centering approach was the
     root cause of Bug 3 (category list randomly off-center at certain
     viewport widths / on mobile) and has been replaced with
     `left:0; right:0` + flexbox/text-align centering, which needs NO
     x-transform at all -- so `xPercent: -50` must NOT be re-added here, or
     it would re-introduce an unwanted extra leftward shift on top of the
     now-correct centering.
     ============================================================ */
  function setupVideosGroupExit() {
    const exitSection = document.getElementById('section-7');
    if (!exitSection) return;
    const targets = [
      document.getElementById('videos-panel-nav'),
      document.getElementById('videos-title-overlay'),
    ].filter(Boolean);
    if (!targets.length) return;

    function render(p) {
      const lp = Math.max(0, Math.min(1, p));
      targets.forEach((el) => {
        gsap.set(el, { opacity: 1 - lp, y: -lp * window.innerHeight * 0.6 });
      });
    }

    ScrollTrigger.create({
      id: 'videos-group-exit',
      trigger: exitSection,
      start: 'bottom 85%',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
  }
  setupVideosGroupExit();

  /* ============================================================
     SECTION 1 -- Pinned intro (merged former section 1 + 2):
     A single extended pinned sequence, re-architected so the cube fully
     exits BEFORE the hand-grabs-a-match payoff plays, with "Be the ONE"
     staying on screen across the whole cube animation and only leaving in
     sync with the hand lifting the match out of frame (see INTRO_TIMELINE
     above, shared with renderCubeScrub()):
       0.00 - 0.30  (CUBE_GROW_END) text reacts to scroll (variable-font
                    weight/optical-size ramp, tightening tracking, gradient
                    sweep on ONE) while the cube rotates + grows to its
                    final moderate size (~55-60% of viewport)
       0.30 - 0.38  (CUBE_HOLD_END) cube holds at that final size/position,
                    still slowly rotating -- the poised, framed moment.
                    Text is still fully visible/reacted, untouched.
       0.38 - 0.45  (CUBE_EXIT_END) cube slides out to the left and fades
                    away -- FULLY GONE by 0.45. Text remains fully visible
                    throughout (no longer exits here).
       0.45 - 0.95  (CUT_POINT) stage is clear; the background video plays
                    its "hand reaches in, grips, and lifts the match out of
                    frame" footage. Text keeps sitting fully visible/reacted
                    the entire time -- it does NOT exit here.
       0.95 - 1.00  AT CUT_POINT the background hard-cuts to bg-video-1b
                    (the static held-match shot) and, in that exact same
                    instant, "Be the ONE" begins sweeping upward and fading
                    out -- the two are simultaneous by construction (both
                    keyed off CUT_POINT). The rise finishes exactly as the
                    pin releases at p=1.0, handing off into the work-reel
                    section's own pinned 1b->2->4 video chain.
     ============================================================ */
  const cube = document.getElementById('cube');
  const cubeStageEl = document.getElementById('cube-stage');
  const introSection = document.getElementById('section-1');
  const introText = document.getElementById('intro-pin-text');

  if (cube && cubeStageEl && introSection && introText) {
    const heroLines = introText.querySelectorAll('.hero-title-line');
    const heroMain = introText.querySelectorAll('.hero-title-line:not(.hero-title-the)');
    const heroOne = introText.querySelector('.hero-title-one');
    const eyebrowEl = introText.querySelector('.eyebrow');

    // let GSAP own the transform (keep CSS "left: 82%" as the layout anchor;
    // movement is layered on top via translateX so no per-frame reflow happens)
    gsap.set(cubeStageEl, { xPercent: -50, yPercent: -50, x: 0 });
    gsap.set(cube, { rotateX: -24, rotateY: 35, rotateZ: 0, transformStyle: 'preserve-3d' });

    let deltaToCenterPx = 0;
    let fillScale = 4;

    // 12-thumbnail crossfade: each face carries two stacked media slots
    // (a = lap 1 images 0-5, b = lap 2 images 6-11). At the scroll-progress
    // midpoint (p=0.5) every face crossfades from its slot-a image to its
    // slot-b image over a short transition band, so by the time the pin
    // sequence finishes, all 12 uploaded thumbnails have been shown across
    // the cube's rotation, matching "최소 2바퀴 동안 12장 전부 노출" from
    // the request.
    const cubeSlotsA = gsap.utils.toArray(cube.querySelectorAll('.cube-face-media--a'));
    const cubeSlotsB = gsap.utils.toArray(cube.querySelectorAll('.cube-face-media--b'));
    const CUBE_LAP_CENTER = 0.5; // crossfade midpoint along the 0->1 scroll progress
    const CUBE_LAP_WINDOW = 0.16; // total width of the crossfade transition band
    function renderCubeLaps(p) {
      const half = CUBE_LAP_WINDOW / 2;
      const raw = (p - (CUBE_LAP_CENTER - half)) / CUBE_LAP_WINDOW;
      const bT = Math.max(0, Math.min(1, raw));
      if (cubeSlotsA.length) gsap.set(cubeSlotsA, { opacity: 1 - bT });
      if (cubeSlotsB.length) gsap.set(cubeSlotsB, { opacity: bT });
    }

    function computeCubeGeometry() {
      const sectionRect = introSection.getBoundingClientRect();
      const stageRect = cubeStageEl.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2 - sectionRect.left;
      const sectionCenterX = sectionRect.width / 2;
      deltaToCenterPx = sectionCenterX - stageCenterX;
      const baseSize = Math.max(cubeStageEl.offsetWidth, cubeStageEl.offsetHeight) || 220;
      // moderate end-state size (~55-60% of viewport, matching the SM Audition
      // reference panel) -- deliberately NOT a full-viewport fill anymore.
      const target = Math.min(window.innerWidth, window.innerHeight) * 0.58;
      fillScale = target / baseSize;
    }
    computeCubeGeometry();

    const growEase = gsap.parseEase('power1.inOut');
    const exitEase = gsap.parseEase('power2.in');
    const exitCubeEase = gsap.parseEase('power2.in');

    function renderIntro(p) {
      const t = INTRO_TIMELINE;

      // ---- cube: rotate across its own active range. IMPORTANT: rotP is
      // the cube's LOCAL progress through its own [0, CUBE_EXIT_END] window,
      // rescaled back to a full 0->1 fraction -- NOT raw scroll progress p
      // capped at CUBE_EXIT_END. This is what lets the cube complete its
      // FULL originally-designed rotation (the same total ~555deg / ~1.54
      // turns the 380/520/60 multipliers were calibrated for) by the time it
      // reaches CUBE_EXIT_END, instead of stopping at only 45% of that
      // rotation the way a raw-p cap would. It also gives renderCubeLaps()
      // below a 0->1 progress value whose midpoint (0.5) lands at the actual
      // midpoint of the cube's rotation, matching its original calibration.
      const growP = t.CUBE_GROW_END > 0 ? Math.min(p / t.CUBE_GROW_END, 1) : 1;
      const growT = growEase(growP);
      const scale = 1 + (fillScale - 1) * growT;
      const centeredX = deltaToCenterPx * growT;
      const rotP = t.CUBE_EXIT_END > 0 ? Math.min(p / t.CUBE_EXIT_END, 1) : 1;
      gsap.set(cube, {
        rotateX: -24 + 380 * rotP,
        rotateY: 35 + 520 * rotP,
        rotateZ: 60 * rotP,
      });
      renderCubeLaps(rotP);

      // ---- cube hold + exit-left: CUBE_GROW_END -> CUBE_HOLD_END holds in
      // place (poised, framed moment), then CUBE_HOLD_END -> CUBE_EXIT_END
      // slides left off-screen and fades out -- FULLY GONE by CUBE_EXIT_END,
      // well before the background video's hand-grab payoff plays.
      const exitCubeP = Math.max(0, Math.min((p - t.CUBE_HOLD_END) / (t.CUBE_EXIT_END - t.CUBE_HOLD_END), 1));
      const exitCubeT = exitCubeEase(exitCubeP);
      const exitX = -window.innerWidth * 0.85 * exitCubeT;
      gsap.set(cubeStageEl, {
        scale,
        x: centeredX + exitX,
        opacity: 1 - exitCubeT,
      });

      // ---- text: scroll-reactive variable font across 0 -> CUBE_GROW_END
      // (same window as the cube's own grow, so the type "locks in" to its
      // heaviest weight right as the cube finishes growing).
      const reactP = t.CUBE_GROW_END > 0 ? Math.min(p / t.CUBE_GROW_END, 1) : 1;
      const wght = 560 + (900 - 560) * reactP;
      const opsz = 60 + (144 - 60) * reactP;
      heroMain.forEach((line) => {
        line.style.fontVariationSettings = `'wght' ${wght}, 'opsz' ${opsz}, 'SOFT' 0`;
      });
      if (eyebrowEl) eyebrowEl.style.letterSpacing = (0.5 - 0.28 * reactP) + 'em';
      if (heroOne) heroOne.style.backgroundPosition = (reactP * 100) + '% 50%';

      // ---- extra scroll-reactive strengthening for "Be the ONE" per this
      // turn's explicit "be the one도 스크롤연동 인터랙티브 요소가
      // 더욱더 강화되었으면" request: a continuous subtle parallax drift +
      // opacity-linked glow-intensity on the eyebrow, driven directly off
      // the SAME 0->CUBE_GROW_END window as the font-weight ramp above, so
      // the whole text block feels like it is actively responding to
      // scroll (not just a one-shot weight change) for that entire span.
      const driftX = -14 * reactP;
      const driftY = 8 * Math.sin(reactP * Math.PI);
      gsap.set(introText, { x: driftX });
      if (eyebrowEl) {
        eyebrowEl.style.opacity = String(0.55 + 0.45 * reactP);
        eyebrowEl.style.textShadow = reactP > 0.05
          ? `0 0 ${10 * reactP}px rgba(255, 138, 0, ${0.35 * reactP})`
          : 'none';
      }

      // ---- text exit: "Be the ONE" stays fully visible/reacted through the
      // ENTIRE cube animation (grow/hold/exit) AND through the hand reaching
      // in, gripping, and lifting the match out of frame -- it only begins
      // sweeping upward and fading out AT CUT_POINT, the exact same scroll
      // position where the background video hard-cuts to bg-video-1b (see
      // INTRO_TIMELINE above). Using CUT_POINT as the exit's own START
      // (rather than an earlier "HAND_EXIT_START" window) is what makes the
      // text-rise and video-1b's appearance genuinely SIMULTANEOUS, per this
      // turn's explicit "텍스트가 올라감과 동시에 2번째 영상이 나와야해"
      // spec -- the rise then plays out over the remaining CUT_POINT -> 1
      // range, finishing exactly as the pin releases.
      const exitP = Math.max(0, Math.min((p - t.CUT_POINT) / (1 - t.CUT_POINT), 1));
      const exitT = exitEase(exitP);
      gsap.set(introText, {
        y: driftY + -160 * exitT,
        opacity: 1 - exitT,
      });
    }

    renderIntro(0);

    ScrollTrigger.create({
      id: 'intro-pin',
      trigger: introSection,
      start: 'top top',
      end: '+=220%',
      pin: true,
      scrub: 0.4,
      // This pin pushes every section below it further down the page, so it
      // MUST be measured/laid out before any other ScrollTrigger calculates
      // its start/end (otherwise triggers created earlier in the file — like
      // the panel-index / dot-nav / header-nav triggers above — keep stale
      // pre-pin positions and fire prematurely). refreshPriority makes GSAP
      // refresh this one first regardless of creation order. It must be the
      // HIGHEST of all pins on the page since it's first in the document and
      // its spacer shifts every pin/trigger below it.
      refreshPriority: 4,
      onUpdate: (self) => {
        renderIntro(self.progress);
        // drive the cube-section background video scrub off this EXACT
        // same progress value -- see the long comment inside
        // setupFixedBgVideo() (cubeScrubRenderer) for why this must be
        // called directly here rather than via a second ScrollTrigger.
        if (cubeScrubRenderer) cubeScrubRenderer(self.progress);
      },
      onRefresh: (self) => {
        computeCubeGeometry();
        renderIntro(self.progress);
        if (cubeScrubRenderer) cubeScrubRenderer(self.progress);
      },
    });

    window.addEventListener('resize', () => {
      computeCubeGeometry();
    });
  }

  /* ============================================================
     WORK REEL -- tagline text, pinned between SECTION 1 (cube) and
     SECTION 2 (client logo wall). This section no longer carries its
     own separate video elements -- per this turn's explicit "고정된
     화면에 계속 화면이 흐르는 것처럼 보여야하고... 영상을 제외한
     컨텐츠들만이 스크롤 다운에 반응하며 화면위로 올라가는 거야" spec,
     the ONLY thing that belongs to (and pins with) this section is its
     own foreground content -- the tagline. The actual video being
     shown underneath during this section's pinned span is the SAME
     persistent #fixed-bg-video layer used by section-1, continuing its
     1b -> v2 -> v4 chain (see renderVideoChain() / workReelScrubRenderer
     inside setupFixedBgVideo() above) -- driven DIRECTLY off this
     section's own pin progress, exactly the same "expose a render fn,
     call it from the pin's own onUpdate" pattern used for the cube's
     video-1a scrub in the intro-pin ScrollTrigger below.
     Whole sequence mapped over this pin's own 0->1 progress:
       0.00 - 0.15  tagline fades/blurs in
       0.15 - 0.85  tagline holds fully visible while, underneath, the
                    fixed video layer hard-cuts through 1b -> v2 -> v4
                    in three equal thirds (see CHAIN inside
                    setupFixedBgVideo())
       0.85 - 1.00  tagline fades back out, finishing just as the pin
                    releases (p=1) so the very next thing the user
                    sees is section-2's logo wall beginning to enter --
                    and by that exact point v4 (the final clip in the
                    chain) has ALSO finished, per this turn's explicit
                    "워크 위드 섹션이 나오기 전에 ... 4번째 영상이
                    이어져야해" requirement.
     ============================================================ */
  function setupWorkReel() {
    const section = document.getElementById('section-work-reel');
    const tagline = document.getElementById('work-reel-tagline');
    const words = tagline ? gsap.utils.toArray(tagline.querySelectorAll('.wr-word')) : [];
    if (!section || !tagline || !words.length) return;

    gsap.set(words, { opacity: 0.22, color: 'var(--fg-faint)' });

    // ---- Word-level "reading spotlight" reveal -- replaces the earlier
    // per-LINE stagger per explicit feedback: "스크롤연동 인터랙티브
    // 요소가 자꾸 줄이 바뀌는 건 아닌 거 같아. 다른 효과를 입혀줘." (the
    // old effect visibly reflowed/moved text line-by-line, which read as
    // unwanted layout motion rather than a pleasant reactive effect).
    // Every word stays in its permanent inline position (no y-transform,
    // no blur-driven reflow) -- instead a "highlight" band sweeps
    // continuously left-to-right across the 17 words in lockstep with
    // scroll position p, like a karaoke read-along: each word brightens
    // from dim/faint to fully lit + a touch of scale as the sweep passes
    // over it, then settles back to a slightly-dimmer "already read"
    // state (not all the way back to invisible), so by the end of the
    // hold window the whole sentence is legible while still having been
    // continuously, visibly reactive to scroll for its entire duration.
    const WORD_COUNT = words.length;
    const SWEEP_START = 0.05; // sweep begins shortly after the pin engages
    const SWEEP_END = 0.45;   // sweep (reading) fully complete well before exit
    const BAND = 1 / WORD_COUNT; // how much of the sweep each word occupies
    // ---- Exit phase: added per explicit spec "불을 붙이기 시작할 때...
    // 이미 섹션2 텍스트는 위로 올라가고" -- the sweep-based reveal above
    // used to have NO exit logic at all, so every word simply held at its
    // "already read" opacity all the way through p=1 (the pin's release
    // point), meaning the tagline was still fully visible over the
    // torch-igniting footage. Now the whole tagline rises up and fades to
    // fully invisible (opacity 0) within EXIT_START -> EXIT_END, comfortably
    // BEFORE video-5 (the torch-igniting payoff clip, which plays across
    // the pin's final quarter, p: 0.75 -> 1.0 -- see CHAIN/renderVideoChain
    // in setupFixedBgVideo) is showing "the moment it starts to catch fire".
    // The client-wall's own pre-rise (see workReelWallPreRiseRenderer
    // below / setupClientWall) begins at WALL_PRERISE_START, slightly
    // BEFORE the tagline is fully gone, so the two visually overlap for a
    // beat ("text already rising away AND logos already starting to rise")
    // rather than one waiting for the other to fully finish first.
    const EXIT_START = 0.50;
    const EXIT_END = 0.68; // fully faded/gone well before video-5 (torch-ignite,
    // the "flame just starting to catch" payoff) begins at pin progress 0.75
    // -- see CHAIN.PHASE_V4_END in setupFixedBgVideo.
    const exitEaseTag = gsap.parseEase('power2.in');
    function renderTagline(p) {
      // sweepP: 0->1 position of the reading spotlight across the sentence
      const sweepP = Math.max(0, Math.min(1, (p - SWEEP_START) / (SWEEP_END - SWEEP_START)));
      const exitP = Math.max(0, Math.min(1, (p - EXIT_START) / (EXIT_END - EXIT_START)));
      const exitT = exitEaseTag(exitP);
      words.forEach((word, i) => {
        const wordCenter = (i + 0.5) / WORD_COUNT;
        // distance (in "word slots") between the sweep position and this
        // word's own slot -- used to build a smooth brightening band
        // rather than a hard on/off cut per word.
        const dist = (sweepP - wordCenter) / BAND;
        // "read" state: fully behind the sweep -> settled dim-lit;
        // "active" state: right under the sweep -> peak brightness;
        // "unread" state: ahead of the sweep -> faint.
        const active = Math.max(0, 1 - Math.abs(dist));
        const passed = Math.max(0, Math.min(1, -dist + 0.5));
        const readOpacity = 0.22 + 0.78 * Math.max(active, passed * 0.62);
        const scale = 1 + 0.05 * active;
        gsap.set(word, {
          opacity: readOpacity * (1 - exitT),
          scale,
          y: -40 * exitT,
          color: active > 0.5 ? 'var(--accent-gold)' : 'var(--fg)',
        });
      });
    }

    function render(p, isActive) {
      renderTagline(p);

      // ---- drive the fixed-bg-video layer's 1b -> v2 -> v4 chain off this
      // EXACT same pin progress (see the long comment above this function
      // for why this must be a direct call rather than a second
      // independent ScrollTrigger on the same pinned trigger element).
      //
      // IMPORTANT: only forward to the chain when this pin is genuinely
      // active/in-view (or being explicitly refreshed while active).
      // ScrollTrigger evaluates progress as CLAMPED 0 at setup time / before
      // the trigger's own start is reached -- calling this unconditionally
      // on the very first `render(0)` below would stomp setupFixedBgVideo()'s
      // correct initial "1a visible" state with "1b visible" (since p=0 <=
      // CHAIN.PHASE_1B_END), producing a wrong-video flash on first paint
      // before the user has scrolled at all. Gating on isActive avoids that.
      if (isActive && workReelScrubRenderer) workReelScrubRenderer(p);

      // ---- WORKED WITH logo-wall pre-rise, driven off this SAME pin
      // progress (see the long comment inside setupClientWall() next to
      // workReelWallPreRiseRenderer's assignment for the full rationale:
      // section-2's own scroll-entry trigger fired too late -- only after
      // this pin had already released -- so the logos must instead begin
      // rising from within the pin's own tail end, in lockstep with
      // video-5's "torch just catching fire" footage). Same isActive gate
      // as workReelScrubRenderer above, and for the identical reason.
      if (isActive && workReelWallPreRiseRenderer) workReelWallPreRiseRenderer(p);
    }
    renderTagline(0);

    ScrollTrigger.create({
      id: 'work-reel-pin',
      trigger: section,
      start: 'top top',
      // Shortened from 260% -> 170% per "섹션 1에서 2로 넘어갈때 섹션
      // 사이의 텀이 너무 길어" -- less scroll distance to traverse the
      // whole tagline + 1b->2->4 chain before section-2 begins, without
      // needing to speed up the individual video clips themselves.
      end: '+=170%',
      pin: true,
      scrub: 0.4,
      // Sits between the intro pin (4, highest/earliest) and the PHOTOS
      // conveyor (3) -- a non-integer priority slots it in document order
      // without needing to renumber either of those existing values.
      refreshPriority: 3.5,
      onUpdate: (self) => render(self.progress, self.isActive),
      onRefresh: (self) => render(self.progress, self.isActive),
    });
  }
  setupWorkReel();

  /* ============================================================
     Category-list highlight sync — the vertical category list in
     the fixed PHOTOS/VIDEOS panel-nav lights up the item matching
     whichever thumbnail currently sits centered in its conveyor.
     ============================================================ */
  function setActiveCategory(listId, catIndex) {
    const list = document.getElementById(listId);
    if (!list || catIndex == null) return;
    list.querySelectorAll('li').forEach((li) => {
      li.classList.toggle('active', Number(li.dataset.catIndex) === catIndex);
    });
  }

  /* ============================================================
     SECTIONS 4, 6 & 7 -- Unified thumbnail conveyor.
     Every thumbnail (photo cards + both video carousels) frames
     IN from the right edge, slides across through the centered
     "active" position, and frames OUT past the left edge as the
     user scrolls down through the section -- a continuous
     right-to-left filmstrip rather than a discrete crossfade/swap.
     ============================================================ */
  const conveyors = [];

  // Deterministic per-index "jitter" added on top of the distance-based
  // tilt below, purely so neighboring cards don't all rotate by the exact
  // same formula (which would look mechanical/wavelike) -- small fixed
  // offsets per index, cycling every 10 items, give each card its own
  // slightly distinct signature angle, closer to the organic/scattered
  // feel of a handful of real polaroids tossed on a table (per the user's
  // reference image: Food/Fashion/Product/Venue all sit at visibly
  // different, non-uniform angles).
  const TILT_JITTER_DEG = [0, 2, -2, 3, -1, -3, 1, 2, -2, 0];
  // How many degrees of rotation to add per "slot" of distance from the
  // active/center position, and the hard cap on that so far-off cards
  // (still mostly off-screen) don't spin past a believable scattered-
  // photo angle. Combined with TILT_JITTER_DEG above, this means: a card
  // near dead-center sits close to upright (small jitter only), and the
  // further it slides toward either edge the more it leans into its tilt
  // -- so the angle is continuously changing as the card moves, per the
  // user's request, rather than a fixed static rotation.
  const TILT_SLOPE_DEG = 4;
  const TILT_MAX_DEG = 14;

  // Deterministic per-index vertical offset + phase for the VIDEOS
  // carousels' "float" mode (see `float` option below) -- gives each
  // item its own fixed up/down resting bias and bob timing, cycling
  // every 8 items, so neighbors don't bob in perfect unison (which
  // would look like a single rigid row bouncing, not scattered embers
  // drifting independently). Purely decorative, same role as
  // TILT_JITTER_DEG above but for vertical position instead of angle.
  const FLOAT_Y_BIAS = [-26, 16, -10, 24, -20, 8, -16, 30];
  const FLOAT_PHASE = [0, 0.35, 0.7, 0.15, 0.5, 0.85, 0.25, 0.6];
  // How far (px) an item drifts up/down as it crosses the frame, on
  // top of its own fixed bias above -- keeps the whole row from ever
  // reading as a static, perfectly level filmstrip.
  const FLOAT_BOB_PX = 30;
  // Distance (in "item slots" from center) at which an item reaches
  // its minimum scale/opacity -- beyond this it stays clamped, so far
  // off-screen items don't shrink to nothing or vanish while still
  // technically visible. Range widened and minimums lowered vs. the
  // first pass so items further from center recede more noticeably
  // into the fire background instead of staying near full size/opacity
  // most of the way across the frame (user: "장작이나 횃불이 더 많이
  // 보일 수 있는 방법으로 흐르게 해줘").
  const FLOAT_DEPTH_RANGE = 1.8;
  const FLOAT_MIN_SCALE = 0.6;
  const FLOAT_MIN_OPACITY = 0.32;

  function setupConveyor({ sectionId, frameId, count, labelSelector, dotSelector, categoryForIndex, categoryListId, gap, pinPercentPerItem, refreshPriority, tilt, float }) {
    const section = document.getElementById(sectionId);
    const frame = document.getElementById(frameId);
    if (!section || !frame) return;
    const items = gsap.utils.toArray(frame.querySelectorAll('.thumb-item'));
    const dots = section.querySelectorAll(dotSelector || '.carousel-dot');
    const label = labelSelector ? section.querySelector(labelSelector) : null;

    gsap.set(items, { xPercent: -50, yPercent: -50 });

    let spacing = 260;
    // `edgeMargin` = how many extra "item slots" of travel to add PAST each
    // end of the [0, count-1] index range so the first/last item actually
    // clears the frame's edge (fully hidden) before curIdx hits its limit,
    // instead of just reaching the frame's boundary. A flat margin of "1
    // item" is only enough when the item is roughly as wide as the frame
    // itself (true for the landscape/reel carousels, where one item
    // basically fills the whole frame) -- but PHOTOS shows several
    // 220px-wide cards inside a much wider ~900px frame, so 1 item's worth
    // of travel (spacing) falls far short of sliding a card from fully
    // off-screen-right to fully off-screen-left. Concretely this was the
    // cause of the user's reported bug: the LAST card was still straddling
    // the right frame edge (only partially traveled off) at the exact
    // moment the section's pin released and the page scrolled on to
    // VIDEOS, so the card visually got "sliced" by the section handoff
    // instead of finishing its frame-out. Computing the margin from the
    // actual frame/item widths (half-frame + half-item, divided by
    // spacing, rounded up) guarantees enough travel on BOTH edges for
    // every conveyor, regardless of how many items fit in the frame at
    // once.
    let edgeMargin = 1;
    function computeSpacing() {
      const w = items[0] ? items[0].getBoundingClientRect().width : frame.getBoundingClientRect().width;
      spacing = w + (gap != null ? gap : 32);
      const frameW = frame.getBoundingClientRect().width;
      const needed = frameW / 2 + w / 2;
      edgeMargin = Math.max(1, Math.ceil(needed / spacing));
    }
    computeSpacing();

    let lastActiveIdx = -1;
    // `isSectionActive` gates writes to the shared category-list DOM: several
    // conveyors (e.g. landscape + reels) point at the SAME videos category
    // list, so each one must only claim the highlight while its own section
    // is actually the one in view -- otherwise whichever conveyor's ScrollTrigger
    // happens to fire/init last would always win regardless of scroll position.
    let isSectionActive = false;

    // dots/label container: this section's own "content" cluster whose
    // opacity gets edge-faded below (see `fadeOpacity` in render()).
    const dotsWrap = section.querySelector('.carousel-dots');

    // ------------------------------------------------------------------
    // Edge fade: once this section's pin RELEASES (progress -> 1 going
    // forward, or -> 0 going backward), the section stops being pinned
    // and instead scrolls away/into place as ordinary document flow for
    // a further ~1 viewport height (since .stack-panel/.video-carousel-panel
    // are now locked to exactly 100vh -- see style.css). During that
    // ordinary-scroll transit, this section's own dots/label row (fixed
    // near the BOTTOM of its 100vh box) visually travels up through the
    // screen band occupied by the FIXED .group-title / .panel-nav of
    // whichever group is now current -- if left fully opaque, that read
    // as the two "swapping" as they cross paths (the bug in the user's
    // screenshots). Fading dots/label/frame down to 0 opacity right
    // before the pin releases (and back up right after it engages)
    // means that by the time this section is no longer pinned, its
    // trailing content is already invisible, so nothing is left to
    // visually collide with the fixed title/nav during that transit.
    const EDGE = 0.08;
    function edgeFade(t) {
      if (t < EDGE) return t / EDGE;
      if (t > 1 - EDGE) return (1 - t) / EDGE;
      return 1;
    }

    function render(t) {
      // extend the index range past [0, count-1] by `edgeMargin` slots on
      // each side so the very first item starts FULLY hidden off-right and
      // the very last item ends FULLY hidden off-left (see edgeMargin's
      // comment above), instead of both merely reaching the frame's edge.
      const curIdx = -edgeMargin + t * (count - 1 + 2 * edgeMargin);
      items.forEach((item, i) => {
        // negated vs. the old left-to-right version: items with a HIGHER
        // index start further to the right and travel toward/past the left.
        const dist = i - curIdx;
        if (tilt) {
          // Angle = a fixed per-card signature (jitter, so cards don't all
          // share one formula) plus a component that grows with how far
          // the card currently sits from the centered/active slot -- so
          // the SAME card continuously changes angle as it slides through
          // center (near 0deg at dist=0) out toward either edge (leaning
          // further into its tilt), exactly the "angle changes as it
          // moves" behavior the user asked for, rather than a static
          // per-card rotation that never changes.
          const jitter = TILT_JITTER_DEG[((i % TILT_JITTER_DEG.length) + TILT_JITTER_DEG.length) % TILT_JITTER_DEG.length];
          const slope = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, dist * TILT_SLOPE_DEG));
          gsap.set(item, { x: dist * spacing, rotation: jitter + slope });
        } else if (float) {
          // VIDEOS' own distinct flow (deliberately NOT the PHOTOS tilt
          // look, per user request for "a different kind of flow"):
          // items drift up/down like embers/lanterns rising off the
          // fixed torch/bonfire background instead of rotating, AND
          // scale+fade down with distance from center so the frame
          // reads as having real depth -- both together also mean each
          // item now occupies less of the frame's own vertical/visual
          // space, letting much more of the fire background show
          // through around and behind the row (the user's core ask:
          // "뒤에 횃불과 모닥불이 더 보이게").
          const bias = FLOAT_Y_BIAS[((i % FLOAT_Y_BIAS.length) + FLOAT_Y_BIAS.length) % FLOAT_Y_BIAS.length];
          const phase = FLOAT_PHASE[((i % FLOAT_PHASE.length) + FLOAT_PHASE.length) % FLOAT_PHASE.length];
          // `dist * 0.6` keeps the bob's own period from lining up 1:1
          // with the item spacing (which would look like a rigid,
          // repeating wave) -- combined with the per-item phase offset,
          // neighboring items drift out of sync with each other.
          const bob = Math.sin((dist * 0.6 + phase) * Math.PI) * FLOAT_BOB_PX;
          const depth = Math.min(1, Math.abs(dist) / FLOAT_DEPTH_RANGE);
          const scale = 1 - depth * (1 - FLOAT_MIN_SCALE);
          const opacity = 1 - depth * (1 - FLOAT_MIN_OPACITY);
          gsap.set(item, { x: dist * spacing, y: bias + bob, scale, opacity });
        } else {
          gsap.set(item, { x: dist * spacing });
        }
      });

      const fadeOpacity = edgeFade(Math.max(0, Math.min(1, t)));
      if (dotsWrap) gsap.set(dotsWrap, { opacity: fadeOpacity });
      if (label) gsap.set(label, { opacity: fadeOpacity });

      const activeIdx = Math.max(0, Math.min(count - 1, Math.round(curIdx)));
      if (categoryForIndex && categoryListId && isSectionActive) {
        setActiveCategory(categoryListId, categoryForIndex(activeIdx));
      }
      if (activeIdx !== lastActiveIdx) {
        lastActiveIdx = activeIdx;
        dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
        if (label) {
          const txt = label.querySelector('span');
          if (txt) txt.textContent = `${String(activeIdx + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
        }
      }
    }
    render(0);

    // PIN the whole section for the duration of the conveyor run: the
    // panel (and therefore the fixed header's PHOTOS/VIDEOS state + the
    // panel-nav) stays put at the top of the viewport while every
    // thumbnail frames in from the left and frames out to the right;
    // only once the LAST thumbnail has fully exited does the pin release
    // and normal scroll hand off to the next section.
    const pinDistance = (pinPercentPerItem != null ? pinPercentPerItem : 30) * count;
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + pinDistance + '%',
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      refreshPriority: refreshPriority != null ? refreshPriority : 0,
      onUpdate: (self) => { isSectionActive = self.isActive; render(self.progress); },
      onEnter: () => { isSectionActive = true; },
      onEnterBack: () => { isSectionActive = true; },
      onRefresh: (self) => {
        computeSpacing();
        isSectionActive = self.isActive;
        render(self.progress);
      },
    });
    conveyors.push({ computeSpacing, render, st });
  }

  // Every pin below the intro pin ALSO pushes everything after it further
  // down the page. GSAP refreshes higher refreshPriority triggers first, so
  // pins must be prioritized in DOCUMENT ORDER (earliest section = highest
  // priority) -- otherwise triggers for later sections (dot-nav, reveal,
  // scroll-text -- all default priority 0) would compute their start/end
  // using stale pre-pin offsets, same reasoning as the intro pin above.
  // intro pin = 4 (highest, earliest); these three conveyors follow in order.

  // PHOTOS: 10 cards spread across the 5 categories, 2 items per
  // category (same pattern as the VIDEOS landscape carousel below)
  setupConveyor({
    sectionId: 'section-4', frameId: 'photo-stack', count: 10, gap: 46,
    categoryForIndex: (idx) => Math.floor(idx / 2), categoryListId: 'photos-category-list',
    pinPercentPerItem: 22, refreshPriority: 3, tilt: true,
  });

  // VIDEOS landscape: 14 items spread UNEVENLY across the first 5
  // (non-Reels) categories, matching the real supplied-asset counts:
  // EVENTS x3 (idx 0-2), BRAND FILMS x4 (idx 3-6), DOCUMENTARY x2
  // (idx 7-8), COMMERCIALS x4 (idx 9-12), ART x1 (idx 13). This
  // replaces the old uniform Math.floor(idx/2) mapping (which assumed
  // a flat 2-per-category split) with an explicit lookup table, since
  // the category boundaries are no longer evenly spaced.
  const LANDSCAPE_CATEGORY_BOUNDARIES = [3, 7, 9, 13]; // cumulative counts: EVENTS|BRAND FILMS|DOCUMENTARY|COMMERCIALS|(ART)
  function landscapeCategoryForIndex(idx) {
    for (let cat = 0; cat < LANDSCAPE_CATEGORY_BOUNDARIES.length; cat++) {
      if (idx < LANDSCAPE_CATEGORY_BOUNDARIES[cat]) return cat;
    }
    return LANDSCAPE_CATEGORY_BOUNDARIES.length; // ART (last non-Reels category)
  }
  setupConveyor({
    sectionId: 'section-6', frameId: 'landscape-frame', count: 14, labelSelector: '.carousel-label', gap: 64,
    categoryForIndex: landscapeCategoryForIndex, categoryListId: 'videos-category-list',
    pinPercentPerItem: 22, refreshPriority: 2, float: true,
  });

  // VIDEOS reels: all 11 items belong to the final "REELS" category
  setupConveyor({
    sectionId: 'section-7', frameId: 'reel-frame', count: 11, labelSelector: '.carousel-label', gap: 46,
    categoryForIndex: () => 5, categoryListId: 'videos-category-list',
    pinPercentPerItem: 30, refreshPriority: 1, float: true,
  });

  window.addEventListener('resize', () => {
    conveyors.forEach((c) => c.computeSpacing());
  });

  /* ============================================================
     Scroll-reactive text -- headings/labels marked [data-scroll-text]
     (PHOTOS/VIDEOS intro titles, subtitles, stack heading, carousel
     labels) fade/slide in as their panel enters view, then keep
     reacting for the full time that panel is on screen: variable-
     font weight ramps up on serif titles, letter-spacing widens on
     small-caps labels -- so typography stays visibly tied to scroll
     position rather than a one-shot on-enter reveal.

     NOTE -- .carousel-label is intentionally EXCLUDED from the
     opacity/y control below (see `skipOpacity`). Its opacity is
     already fully owned by `edgeFade()` inside setupConveyor(),
     which fades it to 0 right before its own section's pin releases
     so it can never visually collide with the fixed group-title/
     panel-nav during the post-pin scroll transit (see the long
     comment on `edgeFade` above). This ScrollTrigger here is keyed
     to the PANEL's own top/bottom viewport position -- a totally
     independent timeline from the conveyor's pin-scrub progress --
     so if it also drove the label's opacity, the two would fight
     over the same property (whichever's onUpdate ran last on a given
     frame would win), and since this trigger's "panel back in view"
     window overlaps the pin-release transit, it kept winning and
     re-revealing the label right on top of the fixed title/nav. The
     letter-spacing effect is still applied to the label as before --
     only opacity/y is skipped for it.
     ============================================================ */
  function initScrollText() {
    document.querySelectorAll('[data-scroll-text]').forEach((el) => {
      const panel = el.closest('.panel');
      if (!panel) return;
      const isVariableTitle = el.matches('.group-title-text');
      const skipOpacity = el.matches('.carousel-label');
      const baseLetterSpacing = parseFloat(getComputedStyle(el).letterSpacing) || 0;

      if (!skipOpacity) gsap.set(el, { opacity: 0, y: 36 });

      ScrollTrigger.create({
        trigger: panel,
        start: 'top 85%',
        end: 'bottom 15%',
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          if (!skipOpacity) {
            const enterP = Math.min(p / 0.3, 1);
            gsap.set(el, { opacity: enterP, y: 36 * (1 - enterP) });
          }
          if (isVariableTitle) {
            el.style.fontVariationSettings = `'wght' ${400 + 320 * p}`;
          } else {
            el.style.letterSpacing = (baseLetterSpacing + 6 * p) + 'px';
          }
        },
      });
    });
  }
  initScrollText();

  /* ---------- refresh ScrollTrigger after full load (fonts/images) ---------- */
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
