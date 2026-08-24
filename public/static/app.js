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
  document.querySelectorAll('.panel').forEach((panel) => {
    const items = panel.querySelectorAll('[data-reveal]');
    if (!items.length) return;
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

  panels.forEach((panel, i) => {
    ScrollTrigger.create({
      trigger: panel,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setActiveSection(i),
      onEnterBack: () => setActiveSection(i),
    });
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
  function setupGroupTitleFrameIn(introSectionId, titleOverlayId) {
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

    ScrollTrigger.create({
      trigger: introSection,
      start: 'top bottom',
      end: 'top 35%',
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
  setupGroupTitleFrameIn('section-3', 'photos-title-overlay');
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
    // 5 -> 6 this turn per explicit "로고는 6줄로 작게 들어가야할 거
    // 같고... 절대적으로 이걸 채워줘야할 거 같아" -- see home.html's
    // client-track-0..5 (6 tracks now) and .client-logo's re-tuned
    // clamp() bounds in style.css for the matching smaller-logo sizing.
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
    const V8_SAFE_END = 4.0;

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
     PLUS the new outro (section-8). Per this turn's spec: "비디오
     관련 배경영상을 차례대로 로딩에 최적화되게끔 생성해줘" -- three
     uploaded clips (9/10/11.mp4, each re-encoded from source 4K/24fps
     down to 1080p H.264 ~1-2MB for web) hard-cut in sequence
     9 -> 10 -> 11 as the user scrolls through the group.
     Unlike setupPhotosBgVideo's span (which ends at the NEXT group's
     own top, since photos-outro-08 must fully finish before VIDEOS
     begins), this trigger's `endTrigger`/`end` deliberately reaches
     all the way to section-8's own BOTTOM (not top) -- video-11 must
     still be mid-playback (not yet finished) at the moment section-8
     begins, so it keeps scrubbing/finishing DURING the outro's own
     scroll transit while the foreground VIDEOS content has already
     risen away (see setupVideosGroupExit() below), exactly matching
     "11번영상이 끝나기 전에 비디오 관련 컨텐츠는 모두 화면위로
     올라가면서 사라져야해" (before video 11 finishes, all video
     content must already have risen off-screen).
     Phase split is NOT an even 3-way share of progress -- weighted
     roughly by how much actual scroll distance each sub-section
     consumes (section-5 is a single unpinned ~100vh panel; section-6's
     pin runs ~22%*14=308vh; section-7+outro's pin+plain span runs
     ~30%*11+100=430vh) so no single clip's scrub feels rushed or
     stretched relative to how long the user is actually looking at
     its corresponding foreground content.
     ============================================================ */
  function setupVideosBgVideo() {
    const layer = document.getElementById('videos-bg-video-layer');
    const v9 = document.getElementById('videos-bg-video-9');
    const v10 = document.getElementById('videos-bg-video-10');
    const v11 = document.getElementById('videos-bg-video-11');
    const s5 = document.getElementById('section-5');
    const s8 = document.getElementById('section-8');
    if (!layer || !v9 || !v10 || !v11 || !s5 || !s8) return;

    const videos = [v9, v10, v11];
    gsap.set(videos, { opacity: 0 });
    gsap.set(v9, { opacity: 1 });

    // Same root-cause fix as the other two bg-video layers -- see
    // blobifySeekableVideo()'s top-of-file comment. Staggered 250ms
    // apart per video for the same "avoid simultaneous decoder init"
    // reason.
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
    prewarmSeek(v9, 0);
    prewarmSeek(v10, 0);
    prewarmSeek(v11, 0);

    // All three re-encoded clips are exactly 6.000000s (ffprobe-confirmed);
    // no baked-in fade-to-black footage was found at either end of any of
    // the three (brightness sampled every 1s across each clip stayed in a
    // consistent ~16-51 mean-gray range throughout), so -- unlike
    // setupPhotosBgVideo's V7/V8_SAFE_START/END -- the full [0, 6] duration
    // is used directly with no safe-window remapping needed.
    const CLIP_DURATION = 6.0;
    function seek(video, localP) {
      const t = Math.max(0, Math.min(1, localP)) * CLIP_DURATION;
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

    const PHASE_V9_END = 0.15;
    const PHASE_V10_END = 0.55;
    function renderVideosChain(p) {
      if (p <= PHASE_V9_END) {
        setActive(0);
        const localP = PHASE_V9_END > 0 ? p / PHASE_V9_END : 1;
        seek(v9, localP);
      } else if (p <= PHASE_V10_END) {
        setActive(1);
        const localP = (p - PHASE_V9_END) / (PHASE_V10_END - PHASE_V9_END);
        seek(v10, localP);
      } else {
        setActive(2);
        const localP = (p - PHASE_V10_END) / (1 - PHASE_V10_END);
        seek(v11, localP);
      }
    }

    // Single ScrollTrigger spanning section-5's own top through
    // section-8's own BOTTOM (see the long comment above for why this
    // differs from setupPhotosBgVideo's "ends at the NEXT group's top"
    // span). Transparently covers section-6/7's own pinned conveyor
    // runs, same as setupPhotosBgVideo covers section-4's pin.
    ScrollTrigger.create({
      id: 'videos-bg-video',
      trigger: s5,
      endTrigger: s8,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        gsap.set(layer, { opacity: self.isActive ? 1 : 0 });
        renderVideosChain(self.progress);
      },
      onRefresh: (self) => {
        gsap.set(layer, { opacity: self.isActive ? 1 : 0 });
        renderVideosChain(self.progress);
      },
      onLeave: () => gsap.set(layer, { opacity: 0 }),
      onLeaveBack: () => gsap.set(layer, { opacity: 0 }),
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

    function render(p) {
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
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
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
     xPercent: -50 is re-asserted alongside y on every frame because
     GSAP's inline `transform` write takes full ownership of that
     property once written -- omitting it would silently drop the
     elements' existing CSS `transform: translateX(-50%)` centering.
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
        gsap.set(el, { xPercent: -50, opacity: 1 - lp, y: -lp * window.innerHeight * 0.6 });
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

  function setupConveyor({ sectionId, frameId, count, labelSelector, dotSelector, categoryForIndex, categoryListId, gap, pinPercentPerItem, refreshPriority }) {
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
        gsap.set(item, { x: (i - curIdx) * spacing });
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
    pinPercentPerItem: 22, refreshPriority: 3,
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
    sectionId: 'section-6', frameId: 'landscape-frame', count: 14, labelSelector: '.carousel-label', gap: 32,
    categoryForIndex: landscapeCategoryForIndex, categoryListId: 'videos-category-list',
    pinPercentPerItem: 22, refreshPriority: 2,
  });

  // VIDEOS reels: all 11 items belong to the final "REELS" category
  setupConveyor({
    sectionId: 'section-7', frameId: 'reel-frame', count: 11, labelSelector: '.carousel-label', gap: 24,
    categoryForIndex: () => 5, categoryListId: 'videos-category-list',
    pinPercentPerItem: 30, refreshPriority: 1,
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
