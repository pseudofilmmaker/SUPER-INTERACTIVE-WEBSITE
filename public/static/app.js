/* ============================================================
   Be the ONE — Scroll Interactive Portfolio
   GSAP + ScrollTrigger driven scroll animations
   ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

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
  // (8 sections total, DOM order: 0 intro/cube, 1 work-reel, 2 about/logo-wall,
  // 3-4 photos, 5-7 videos)
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
    const ROW_COUNT = 5;
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
      ScrollTrigger.create({
        trigger: section,
        start: 'bottom 85%',
        end: 'bottom 45%',
        scrub: true,
        onUpdate: (self) => { gsap.set(wall, { opacity: 1 - self.progress }); },
      });
    }
  }
  setupClientWall('section-2');

  /* ============================================================
     FIXED BACKGROUND VIDEO -- cube section (1) + logo wall (2)
     Per explicit spec: "영상은 백그라운드에 위치가 고정돼, 계속 반응
     연동형으로 재생돼야 해... 지금의 웹사이트 매트리얼은 영상 위에서
     계속 움직이는 거지." The <video> elements in #fixed-bg-video
     (position:fixed, see style.css) are layered behind everything:
       - bg-video-1a / bg-video-1b (cube section, section-1): SCRUB-ONLY,
         same technique as WORK REEL below -- muted, no autoplay/loop,
         currentTime is set directly from the cube-section scroll
         progress every frame (via the /reel-video Range-proxy route so
         seeking stays smooth). 1a = matches fall, settle, then a hand
         reaches in and lifts one out of frame (a single continuous
         8s take); 1b = the same match now held static/unlit, the calm
         beat right after the hard cut. This progress is read from the
         SAME trigger/start/end as the cube's own "intro-pin" ScrollTrigger
         above, so the footage advances in perfect lockstep with the
         cube's rotation/growth -- true "반응연동형" (scroll-position-
         linked) playback, not autoplay/loop.
       - bg-video-2 (logo wall, section-2): ALSO scrub-only (not
         autoplay/loop) -- the same held match now ignites into flame
         partway through its own 6s runtime; currentTime is tied 1:1 to
         the section-2 crossfade progress below so the strike/ignite
         beat lands exactly as the logo wall scrolls into view. The
         whole cube-group (1a+1b) crossfades into it as section-2
         scrolls into view.
       - the whole layer fades in in as section-1 begins and fades out
         right before section-3/PHOTOS takes over (round scope is
         explicitly limited to "로고월섹션까지").
     ============================================================ */
  // Exposed so the intro-pin ScrollTrigger (created further below, for the
  // cube itself) can drive the match-footage scrub DIRECTLY off its own
  // self.progress -- see the long note at the "cube-video-scrub" removal
  // point below for why a second independent ScrollTrigger on the same
  // pinned trigger element does NOT reliably share the same progress.
  let cubeScrubRenderer = null;

  // Shared timeline breakpoints for the whole intro-pin sequence (cube +
  // background video-01 scrub + text), consumed by BOTH renderCubeScrub()
  // (below, in setupFixedBgVideo) and renderIntro() (further down, in the
  // cube setup block) so the two stay perfectly in sync by construction.
  //   0        -> CUBE_EXIT_END   cube grows/holds/exits and is FULLY GONE
  //                                by CUBE_EXIT_END; video-01 plays its
  //                                "matches fall & settle" footage (0s ->
  //                                V1A_SETTLE_END_SEC) synced to the cube's
  //                                own progress purely as background ambiance
  //   CUBE_EXIT_END -> CUT_POINT  stage is clear (no cube) -- video-01 plays
  //                                its "hand reaches in and grabs a match"
  //                                footage (V1A_SETTLE_END_SEC -> its full
  //                                duration); "Be the ONE" text stays FULLY
  //                                VISIBLE through the reach + grip, then
  //                                sweeps up/fades out ONLY during
  //                                HAND_EXIT_START -> CUT_POINT, the narrow
  //                                window where the hand actually lifts the
  //                                match OUT of frame -- finishing exactly
  //                                as the hard cut below fires
  //   CUT_POINT -> 1              HARD CUT (no crossfade) to video-02, the
  //                                static held-match close-up shot
  const INTRO_TIMELINE = {
    CUBE_GROW_END: 0.30,
    CUBE_HOLD_END: 0.38,
    CUBE_EXIT_END: 0.45,
    HAND_EXIT_START: 0.90,
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
    const s1 = document.getElementById('section-1');
    const s2 = document.getElementById('section-2');
    const s3 = document.getElementById('section-3');
    if (!layer || !v1a || !v1b || !v2 || !s1 || !s2 || !s3) return;

    gsap.set(v1a, { opacity: 1 });
    gsap.set(v1b, { opacity: 0 });
    gsap.set(v2, { opacity: 0 });

    // Known source durations (8.0s / 6.016s) used as a fallback until each
    // video's real duration is available via loadedmetadata -- same
    // pattern as setupWorkReel() below, so early scroll input before the
    // browser finishes probing the file still maps to a sane currentTime.
    // 1a (section1-matches-scrub-01.mp4) runs from the ABSOLUTE start (t=0)
    // of its source through the full "matches fall -> settle -> a hand
    // reaches in, grabs one match, and lifts it out of frame" action (see
    // renderCubeScrub below for how its two acts, "settle" and "hand grabs
    // + exits", are mapped onto two different scroll sub-ranges rather than
    // played back linearly across the whole pin). 1b (scrub-02) is a static
    // unlit-match held shot with no motion of its own -- shown after the
    // hard cut as the calm "held match" beat before section-2's ignite.
    let dur1a = 8.0;
    let dur1b = 6.016;
    v1a.addEventListener('loadedmetadata', () => { if (v1a.duration) dur1a = v1a.duration; });
    v1b.addEventListener('loadedmetadata', () => { if (v1b.duration) dur1b = v1b.duration; });

    function seek(video, duration, localP) {
      const t = Math.max(0, Math.min(1, localP)) * duration;
      if (video.readyState > 0 && Number.isFinite(t)) {
        video.currentTime = t;
      }
    }

    // groupOpacity: how visible the whole cube-clip group (1a+1b combined)
    // is vs. bg-video-2 -- driven by the section-2 crossfade trigger below.
    let groupOpacity = 1;
    // localA/localB: the 1a<->1b crossfade weights -- driven by the cube
    // section's own scroll progress (cubeP trigger below).
    let localA = 1;
    let localB = 0;

    function applyOpacities() {
      gsap.set(v1a, { opacity: localA * groupOpacity });
      gsap.set(v1b, { opacity: localB * groupOpacity });
      gsap.set(v2, { opacity: 1 - groupOpacity });
    }

    // ---- cube-section scrub: currentTime of 1a/1b tied 1:1 to the SAME
    // scroll range as the cube's own "intro-pin" ScrollTrigger (trigger
    // #section-1, start 'top top', end '+=220%') so the match footage
    // advances in perfect sync with the cube rotating/growing -- reusing
    // the identical trigger/start/end makes GSAP compute an identical
    // progress value across both ScrollTriggers.
    //
    // NOTE (re-architected): NO crossfade between 1a and 1b anymore -- the
    // two clips are shown as a hard, sequential cut (1a plays in full, THEN
    // 1b appears), matching the "크로스 페이드는 필요없어" request. 1a itself
    // is scrubbed across the ENTIRE 0 -> CUT_POINT range in two acts (see
    // INTRO_TIMELINE / V1A_SETTLE_END_SEC above): the "settle" footage plays
    // in the background while the cube animates (0 -> CUBE_EXIT_END), then
    // once the cube is fully gone the SAME clip continues into its "hand
    // grabs the match" footage (CUBE_EXIT_END -> CUT_POINT). At CUT_POINT
    // the whole layer hard-cuts to 1b (the static held-match close-up),
    // with zero opacity overlap between the two.
    function renderCubeScrub(p) {
      const t = INTRO_TIMELINE;
      // ---- Act 1 ("settle"): plays across 0 -> CUBE_EXIT_END, mapped onto
      // 1a's own 0 -> V1A_SETTLE_END_SEC seconds.
      // ---- Act 2 ("hand grabs + exits"): plays across CUBE_EXIT_END ->
      // CUT_POINT, mapped onto 1a's remaining V1A_SETTLE_END_SEC -> dur1a
      // seconds.
      let aSeconds;
      if (p <= t.CUBE_EXIT_END) {
        const actP = t.CUBE_EXIT_END > 0 ? Math.max(0, p / t.CUBE_EXIT_END) : 0;
        aSeconds = actP * V1A_SETTLE_END_SEC;
      } else {
        const actP = Math.max(0, Math.min((p - t.CUBE_EXIT_END) / (t.CUT_POINT - t.CUBE_EXIT_END), 1));
        aSeconds = V1A_SETTLE_END_SEC + actP * (dur1a - V1A_SETTLE_END_SEC);
      }
      seek(v1a, dur1a, aSeconds / dur1a);

      // 1b: held on its very first frame until the hard cut, then scrubs
      // its own short static-shot duration across CUT_POINT -> 1.
      const bP = Math.max(0, Math.min((p - t.CUT_POINT) / (1 - t.CUT_POINT), 1));
      seek(v1b, dur1b, bP);

      // Hard cut at CUT_POINT: no blended opacity range at all -- 1a is
      // fully visible right up to CUT_POINT, then 1b is fully visible from
      // CUT_POINT onward, in a single step.
      const isPastCut = p >= t.CUT_POINT;
      localA = isPastCut ? 0 : 1;
      localB = isPastCut ? 1 : 0;
      applyOpacities();
    }

    function renderLayerOpacity(p) {
      // Fully visible from the very first frame (p=0, the top of section-1)
      // -- no fade-in ramp -- since the user lands directly on the cube
      // section with the fixed video already meant to be showing. Only
      // fades OUT near the very end of section-2, handing off to
      // section-3's own background just before it takes over.
      const FADE_OUT_START = 0.94;
      let op = 1;
      if (p > FADE_OUT_START) op = 1 - (p - FADE_OUT_START) / (1 - FADE_OUT_START);
      gsap.set(layer, { opacity: Math.max(0, Math.min(1, op)) });
    }
    // v2 (section2-match-ignite.mp4): the static unlit match ignites into
    // flame partway through its own 6.016s runtime -- unlike the old torch
    // "loop" footage this is a one-shot, non-seamless ignition, so it is
    // scrub-driven (currentTime tied 1:1 to the section-2 crossfade
    // progress) rather than autoplay+loop, ensuring the strike/ignite beat
    // always lands in perfect sync with the logo wall scrolling into view
    // instead of looping/jumping unpredictably.
    let dur2 = 6.016;
    v2.addEventListener('loadedmetadata', () => { if (v2.duration) dur2 = v2.duration; });

    function renderCrossfade(p) {
      groupOpacity = 1 - p;
      applyOpacities();
      seek(v2, dur2, p);
    }

    // Render an initial frame IMMEDIATELY (matching the renderIntro(0) /
    // work-reel render(0) pattern used elsewhere in this file): a
    // ScrollTrigger's onUpdate only fires once the user actually scrolls
    // (or on an explicit refresh), so without this call the layer would
    // stay stuck at its pre-set opacity:0 on first paint even though the
    // page loads already sitting at the very top of section-1, where the
    // video should already be fully visible.
    renderLayerOpacity(0);
    renderCubeScrub(0);
    renderCrossfade(0);

    // Whole-layer visibility: fades in the instant section-1 begins,
    // stays fully visible through section-1 -> work-reel -> section-2,
    // then fades out right before section-3 (PHOTOS) takes over so it
    // hands off cleanly to that group's own existing background pattern.
    ScrollTrigger.create({
      trigger: s1,
      start: 'top top',
      endTrigger: s3,
      end: 'top top',
      scrub: true,
      onUpdate: (self) => renderLayerOpacity(self.progress),
      onRefresh: (self) => renderLayerOpacity(self.progress),
    });

    // Match-footage scrub: rather than creating a SECOND ScrollTrigger with
    // the same trigger/start/end as the cube's own "intro-pin" (which was
    // tried first and did NOT work -- GSAP measured it against a different
    // pixel range than intro-pin's, e.g. start:1980/end:3960 vs intro-pin's
    // start:-0.001/end:1980, because intro-pin's `pin:true` inserts a
    // spacer that shifts the trigger element's OWN measured position, and
    // a second independent ScrollTrigger on that same trigger element
    // without a matching refreshPriority gets measured on a different
    // refresh pass and lands on the POST-spacer-shifted range instead),
    // we instead just expose this render function and call it DIRECTLY
    // from inside intro-pin's own onUpdate/onRefresh (see below) with the
    // exact same `self.progress` number that already drives the cube --
    // guaranteeing perfect sync by construction rather than by trying to
    // get two separate ScrollTriggers to agree on identical progress.
    cubeScrubRenderer = renderCubeScrub;

    // Crossfade the cube-clip group (1a/1b) -> video-2 (ignite) as
    // section-2 (the logo wall) scrolls up into place -- i.e. the
    // backdrop itself transitions in lockstep with the user arriving
    // at the logo wall.
    ScrollTrigger.create({
      trigger: s2,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      onUpdate: (self) => renderCrossfade(self.progress),
      onRefresh: (self) => renderCrossfade(self.progress),
    });
  }
  setupFixedBgVideo();

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
       0.45 - 0.90  (HAND_EXIT_START) stage is clear; the background video
                    plays its "hand reaches in, grips a match" footage.
                    Text keeps sitting fully visible/reacted the entire time.
       0.90 - 0.95  (CUT_POINT) the hand LIFTS the match up and out of frame
                    -- text sweeps upward and fades out in lockstep with it,
                    finishing exactly as CUT_POINT hard-cuts the background
                    to the static held-match close-up shot.
       0.95 - 1.00  static held-match shot holds; text stays hidden, pin
                    releases at 1.0 revealing the section right after.
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

      // ---- text exit: "Be the ONE" now stays fully visible/reacted through
      // the ENTIRE cube animation (grow/hold/exit) AND through the hand
      // reaching in and gripping the match -- it only sweeps upward and
      // fades out during HAND_EXIT_START -> CUT_POINT, the narrow window
      // where the hand actually LIFTS the match out of frame in the
      // background video, finishing exactly as CUT_POINT hard-cuts to the
      // static held-match shot.
      const exitP = Math.max(0, Math.min((p - t.HAND_EXIT_START) / (t.CUT_POINT - t.HAND_EXIT_START), 1));
      const exitT = exitEase(exitP);
      gsap.set(introText, {
        y: -160 * exitT,
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
     WORK REEL -- scroll-scrubbed match videos + tagline, inserted
     between SECTION 1 (cube) and SECTION 2 (client logo wall).
     Single pinned ScrollTrigger, whole sequence mapped over 0->1:
       0.00 - 0.15  tagline fades/blurs in over video 1's still frame
       0.15 - 0.45  video 1 (match moves, ends on a fast zoom into
                    the match head) scrubs from 0 -> its own duration
       0.45 - 0.50  crossfade video1 -> video2, tagline fades out
       0.50 - 1.00  video 2 (match ignites, chars from red to black)
                    scrubs from 0 -> its own duration, finishing
                    EXACTLY as the pin releases (p=1) so the very
                    next thing the user sees is section-2's logo
                    wall beginning to enter -- matches the explicit
                    "로고가 나오기 전까지 2번 영상이 마무리" requirement.
     Both <video> elements are scrub-only: muted, no autoplay/loop,
     currentTime is set directly from scroll progress every frame.
     Source files were re-encoded with all-intraframe keyframes
     (ffmpeg -g 1 -keyint_min 1 -sc_threshold 0) specifically so
     currentTime seeks stay smooth during fast scroll scrubbing.
     ============================================================ */
  function setupWorkReel() {
    const section = document.getElementById('section-work-reel');
    const v1 = document.getElementById('work-reel-video-1');
    const v2 = document.getElementById('work-reel-video-2');
    const tagline = document.getElementById('work-reel-tagline');
    if (!section || !v1 || !v2 || !tagline) return;

    gsap.set(tagline, { opacity: 0, y: 26, filter: 'blur(6px)' });
    gsap.set(v2, { opacity: 0 });

    // Fallback duration (matches the known 6.016s source length) used until
    // each video's real duration is available via loadedmetadata, so early
    // scroll input before the browser finishes probing the file still maps
    // to a sane (if approximate) currentTime instead of doing nothing.
    const FALLBACK_DURATION = 6.016;
    let dur1 = FALLBACK_DURATION;
    let dur2 = FALLBACK_DURATION;
    v1.addEventListener('loadedmetadata', () => { if (v1.duration) dur1 = v1.duration; });
    v2.addEventListener('loadedmetadata', () => { if (v2.duration) dur2 = v2.duration; });

    function seek(video, duration, localP) {
      const t = Math.max(0, Math.min(1, localP)) * duration;
      // guard against redundant/NaN seeks (readyState 0 = HAVE_NOTHING)
      if (video.readyState > 0 && Number.isFinite(t)) {
        video.currentTime = t;
      }
    }

    function render(p) {
      // ---- tagline: fade/blur in across 0 -> 0.15, hold, fade out 0.42 -> 0.50
      const inP = Math.min(p / 0.15, 1);
      const outP = Math.max(0, Math.min((p - 0.42) / 0.08, 1));
      const taglineOpacity = inP * (1 - outP);
      gsap.set(tagline, {
        opacity: taglineOpacity,
        y: 26 * (1 - inP) + -14 * outP,
        filter: `blur(${6 * (1 - inP) + 6 * outP}px)`,
      });

      // ---- video 1: scrubs across 0.15 -> 0.45
      const v1P = Math.max(0, Math.min((p - 0.15) / 0.30, 1));
      seek(v1, dur1, v1P);

      // ---- crossfade video1 -> video2 across 0.45 -> 0.50
      const crossP = Math.max(0, Math.min((p - 0.45) / 0.05, 1));
      gsap.set(v1, { opacity: 1 - crossP });
      gsap.set(v2, { opacity: crossP });

      // ---- video 2: scrubs across 0.50 -> 1.00, finishing exactly at p=1
      // (pin release), right before section-2's logo wall begins.
      const v2P = Math.max(0, Math.min((p - 0.50) / 0.50, 1));
      seek(v2, dur2, v2P);
    }
    render(0);

    ScrollTrigger.create({
      id: 'work-reel-pin',
      trigger: section,
      start: 'top top',
      end: '+=260%',
      pin: true,
      scrub: 0.4,
      // Sits between the intro pin (4, highest/earliest) and the PHOTOS
      // conveyor (3) -- a non-integer priority slots it in document order
      // without needing to renumber either of those existing values.
      refreshPriority: 3.5,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
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
    function computeSpacing() {
      const w = items[0] ? items[0].getBoundingClientRect().width : frame.getBoundingClientRect().width;
      spacing = w + (gap != null ? gap : 32);
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
      // extend the index range slightly past [0, count-1] so the very
      // first item still frames in from off-right, and the very last
      // item fully frames out past the left edge, instead of both
      // snapping straight to/from the centered position.
      const curIdx = -1 + t * (count + 1);
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

  // PHOTOS: 5 cards <-> 5 categories, 1:1 mapping
  setupConveyor({
    sectionId: 'section-4', frameId: 'photo-stack', count: 5, gap: 46,
    categoryForIndex: (idx) => idx, categoryListId: 'photos-category-list',
    pinPercentPerItem: 30, refreshPriority: 3,
  });

  // VIDEOS landscape: 10 items spread across the first 5 (non-Reels)
  // categories, 2 items per category
  setupConveyor({
    sectionId: 'section-6', frameId: 'landscape-frame', count: 10, labelSelector: '.carousel-label', gap: 32,
    categoryForIndex: (idx) => Math.floor(idx / 2), categoryListId: 'videos-category-list',
    pinPercentPerItem: 22, refreshPriority: 2,
  });

  // VIDEOS reels: all 6 items belong to the final "Reels" category
  setupConveyor({
    sectionId: 'section-7', frameId: 'reel-frame', count: 6, labelSelector: '.carousel-label', gap: 24,
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
