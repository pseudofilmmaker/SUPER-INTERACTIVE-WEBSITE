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
  // ROUND 14 REVERSAL of the Round 7-8 "deliberate overlap" design
  // ("겹치면서 올라가는 건 좀 아닌 거 같은데? 제목과 본문의 구간을
  // 명확히 분리"). Rounds 7-8 had WIDENED this window specifically so
  // the closing bio crawl underneath would spend a long stretch
  // visually overlapping JUNE/HONG while it faded out. The user has
  // now reversed that call: the title and the body text must occupy
  // clearly SEPARATE scroll segments with no simultaneous on-screen
  // overlap. Narrowed back down to the original, normal, prompt
  // fade-out width (was widened to 0.76 in Round 8 specifically to
  // create overlap time — that reason no longer applies).
  const TITLE_OUT_END = 0.68;

  // Profile-photo reveal — Round 3 item 2: now LAYERED behind the
  // title (same IN/OUT window, stacked underneath via z-index in
  // style.css) instead of appearing sequentially after it fades.
  const PHOTO_IN_START = TITLE_IN_START;
  const PHOTO_IN_END = TITLE_IN_END;
  const PHOTO_OUT_START = TITLE_OUT_START;
  const PHOTO_OUT_END = TITLE_OUT_END;

  // Closing opening crawl — 3D perspective paragraph receding up/back
  // into the starfield, carrying the full bio copy.
  //
  // ROUND 14 REDESIGN ("겹치면서 올라가는 건 좀 아닌 거 같은데? 제목과
  // 본문의 구간을 명확히 분리하고, 본문은 화면의 위까지 스크롤업되서
  // 사라지는 걸 유의"). Rounds 7-8-13 all iterated on a design where
  // this crawl was DELIBERATELY made to overlap the fading JUNE/HONG
  // title on screen at the same time, fully opaque and legible for a
  // long stretch. Round 14's fix moved the crawl to start only AFTER
  // TITLE_OUT_END plus a deliberate no-text gap (CRAWL_GAP), so the
  // handoff read as two totally separate scenes.
  //
  // ROUND 15 REFINEMENT ("제목이 페이드 될 때, 본문이 이미 올라오고
  // 있어야지" — while the title is still fading, the crawl body should
  // ALREADY be rising). First attempt at this (CRAWL_IN_START ==
  // TITLE_OUT_START, 0.08-wide fade-in) was still WRONG per follow-up
  // feedback ("겹치는 구간이 하나도 없잖아?" — there is NO overlapping
  // segment at all): starting the crawl's fade-in exactly when the
  // title starts fading meant the crawl was still only ~0-30% opaque
  // AND still positioned far below the visible viewport for most of
  // the title's own fade window — technically nonzero opacity, but not
  // actually VISIBLE on screen at the same time as the title, so it
  // never read as a real overlap.
  //
  // ROUND 15 FIX (v2): the crawl's entrance now starts BEFORE the
  // title even begins fading (CRAWL_LEAD) and finishes shortly AFTER
  // (CRAWL_IN_END = TITLE_OUT_START + CRAWL_LEAD), so it is centered
  // on TITLE_OUT_START rather than starting there. That guarantees
  // that at the exact moment the title starts to disappear, the crawl
  // is already ~50% opaque and roughly halfway risen into view, and
  // by TITLE_OUT_START + CRAWL_LEAD (still inside the title's own
  // fade-out window) the crawl has finished rising to its fully
  // visible resting spot — so for the back half of the title's own
  // fade, both the (dimming) title and the (now fully up) crawl are
  // genuinely on screen together, a real crossfade rather than a
  // same-instant coincidence of two invisible-to-each-other windows.
  const CRAWL_LEAD = 0.02;
  const CRAWL_IN_START = TITLE_OUT_START - CRAWL_LEAD; // = 0.62
  // Entry leg: fades in while rising from off-screen-bottom
  // (CRAWL_Y_START) up to a genuinely on-screen, comfortably legible
  // resting spot (CRAWL_Y_VISIBLE) — finishes at TITLE_OUT_START +
  // CRAWL_LEAD (0.66), i.e. still inside the title's own 0.64->0.68
  // fade-out window, so the crawl is fully up and legible while the
  // title is still visibly (if dimly) on screen for the last stretch
  // of its own fade.
  const CRAWL_IN_END = TITLE_OUT_START + CRAWL_LEAD; // = 0.66
  const CRAWL_RUN_START = CRAWL_IN_START;
  const CRAWL_ENTRY_END = CRAWL_IN_END;
  const CRAWL_Y_START = 78; // vh, bottom of viewport (fully hidden)
  const CRAWL_Y_VISIBLE = 24; // vh -- on-screen, comfortably legible resting spot
  // Recede leg.
  //
  // ROUND 15 v4 (REVERTED): first attempt at fixing the "hard slice at
  // the frame edge" bug shrank the travel distance (-150 -> -20vh), but
  // the user rejected this ("화면 끝까지 올라가는 건 유지하고" — KEEP the
  // full climb all the way up, off the top of the screen). The actual
  // ask was narrower: keep the full-height climb, just make sure the
  // fade is generous ENOUGH by the time it reaches the top edge that the
  // disappearance reads as a graceful dissolve rather than a hard cut
  // ("끝에 갔을 때 충분히 페이드를 걸어서 어색하게 사라지지 않게").
  //
  // ROUND 15 v5 FIX: CRAWL_Y_END restored to -150vh (full climb kept).
  // The real bug was simply that the fade window (OUTRO_START..OUTRO_END)
  // used to only span the FINAL 10% of the pin (0.90->1) while the
  // physical climb had already been running the whole time at full
  // opacity — so the visible portion of text was still 100% opaque as
  // it slid past the top edge and got clipped by #about-crawl-viewport's
  // overflow:hidden, reading as an abrupt cutoff. Fixed by moving
  // CRAWL_FADE_START much earlier (0.70, right after the rise settles at
  // CRAWL_ENTRY_END=0.66) so the fade runs across the ENTIRE climb this
  // time, not just its tail — opacity is already well under 0.3 by the
  // time the text's top line nears the viewport's top edge (verified via
  // Playwright: rect.top crosses 0 around p=0.80-0.85, where opacity is
  // already ~0.2-0.05), so whatever gets clipped is already faint enough
  // that the clip line itself is not perceptible.
  const CRAWL_FADE_START = 0.70;
  const CRAWL_RUN_END = 1;
  const CRAWL_Y_END = -150; // vh, full climb off past the top edge, as originally requested
  // Shallow, legible tilt matching the pichiworld reference screenshot
  // (was 55deg — far too steep to read, per user feedback). Kept as a
  // named constant here so the JS-driven inline transform and the CSS
  // default (.about-crawl-text { transform: rotateX(22deg) ... }) can
  // never drift out of sync with each other.
  const CRAWL_TILT_DEG = 22;

  // All the HERO-ONLY overlays (prologue line, title+photo, crawl)
  // fade out right before this first pin releases, so the handoff
  // into Chapter 2 (Selected Works) below reads as a clean scene
  // change rather than an abrupt jump.
  //
  // CHAPTERS 2-5 FIX ("두번째 별이 점멸하는 영상이 뒤에 룹으로 깔리는
  // 거를 잊지 말아줘"): #about-bg-video-layer (which now shows only
  // the looping starfield, video1 already long since dissolved out)
  // must stay visible as the persistent backdrop behind ALL of the
  // new chapters, not just chapter 1 -- so it is NO LONGER faded to 0
  // here. Only the hero's own foreground overlays fade at OUTRO.
  //
  // ROUND 12 FIX ("사진도 이름도 모두, 위에 겹치는 걸 없애줘야되는
  // 거야" -- the hero's own fixed-position crawl text was still fully
  // opaque and ghosting on top of the real, then-still-existing
  // .about-profile-wrap resting section -- same photo, same name,
  // same tagline -- once that section had already scrolled into view
  // underneath it). Fixed at the time by moving this fade window
  // earlier, well before that section's measured peek-in point.
  //
  // ROUND 13 ADJUSTMENT ("위쪽까지 스크롤되다가 사라져야지"): the
  // crawl's own upward recede (CRAWL_Y_END=-150vh) now finishes
  // physically carrying the text off past the top edge at
  // CRAWL_RUN_END -- BEFORE this opacity fade ever starts, so
  // OUTRO_START is pinned to start no earlier than that, with
  // OUTRO_END given a small amount of room after it purely as an
  // already-off-screen opacity cleanup, not the thing doing the
  // visible "disappearing" anymore.
  //
  // ROUND 14 NOTE: CRAWL_RUN_END moved out to 0.90 to make room for
  // the separated title/gap/crawl beats within the same total hero
  // pin length, which pushed this window later too; HERO_PIN_DISTANCE
  // below was widened (6.2 -> 7.4 * viewport height) in lockstep.
  //
  // ROUND 15 NOTE: the .about-profile-wrap section this ghosting fix
  // originally guarded against has since been deleted outright ("이
  // 구간은 삭제해줘" -- see about.html/style.css), so that specific
  // safety-margin rationale no longer applies. HERO_PIN_DISTANCE is
  // left at 7.4x regardless -- it still exists to give the hero's own
  // internal beats (title fade, overlapping crawl entrance, crawl
  // hold, crawl recede) comfortable scroll runway, which is unrelated
  // to the now-removed section and still holds.
  //
  // ROUND 15 v3 FIX ("첫번째 이미지가 화면 밖으로 빠지면... 스크롤 다운
  // 갭이 너무 커" -- once the crawl scrolls off-screen, the gap before
  // Chapter 2's title fully appears feels far too long). Root cause:
  // OUTRO_END used to be 0.94, leaving a full unused 0.94->1.0 tail
  // where the pin was still held but NOTHING was on screen any more
  // (crawl already faded to opacity 0, nothing else animating) --
  // pure dead scroll before the pin even released into Chapter 2.
  // Fixed by letting the opacity cleanup run all the way to the very
  // end of the pin (OUTRO_END = 1) instead of finishing early and
  // leaving a silent tail -- same fade, just no longer front-loaded
  // with unused scroll room after it.
  //
  // ROUND 15 v4 FIX ("올라가다가 페이드아웃을 걸어서"): OUTRO_START used
  // to be pinned to CRAWL_RUN_END (i.e. the fade only began once the
  // rise had ALREADY finished), which is exactly what produced the
  // "opaque text sliced by the frame edge" bug -- the fade and the rise
  // never overlapped. Now driven by the dedicated CRAWL_FADE_START
  // (0.76) defined above instead, so the fade runs DURING the second
  // half of the (now much shorter) rise, not after it.
  const OUTRO_START = CRAWL_FADE_START;
  const OUTRO_END = 1;

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
    // 영상의 시작점에 맞춰줘" bug report.
    //
    // Chapters 2-5 fix: no more OUTRO fade-to-0 here -- the starfield
    // loop must persist behind every later chapter (see setupChapterPin
    // below, which never touches this layer's opacity either). It stays
    // pinned at 1 once fully faded in and is never faded out again.
    layer.style.opacity = 1;

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
    // Round 8: on the way OUT, the group now SHRINKS (scale 1 -> 0.62)
    // as it fades, reading as if it's receding away from camera into
    // the starfield -- rather than a flat opacity dissolve in place --
    // which combined with the widened TITLE_OUT window above gives the
    // crawl text underneath a longer, more legible overlap window.
    if (titleEl) {
      const to = windowedOpacity(p, TITLE_IN_START, TITLE_IN_END, TITLE_OUT_START, TITLE_OUT_END);
      titleEl.style.opacity = to;
      const rise = 1 - Math.max(0, Math.min(1, (p - TITLE_IN_START) / (TITLE_IN_END - TITLE_IN_START)));
      const outP = Math.max(0, Math.min(1, (p - TITLE_OUT_START) / (TITLE_OUT_END - TITLE_OUT_START)));
      const outScale = 1 - 0.38 * easeInOut(outP);
      titleEl.style.transform = `scale(${outScale})`;
      if (titleJune) titleJune.style.transform = `translateY(${rise * -18}px)`;
      if (titleHong) titleHong.style.transform = `translateY(${rise * 18}px)`;
      if (titleSubtitle) titleSubtitle.style.letterSpacing = (0.32 + (1 - rise) * 0.1) + 'em';
    }

    // ---- profile-photo reveal — layered BEHIND the title, sharing
    // its exact IN/OUT window (see PHOTO_IN_*/PHOTO_OUT_* above,
    // aliased directly to TITLE_IN_*/TITLE_OUT_*). Stacking order
    // (behind vs. in front) is handled purely by z-index in style.css;
    // sizing/feathering (Round 4 item 4) is handled purely in CSS too.
    // Round 8: shrinks in sync with the title on the way out (same
    // outScale factor) so the photo recedes together with JUNE/HONG
    // as one visual group, instead of the photo staying full-size
    // while only the title text shrinks around it. ----
    if (photoEl) {
      const po = windowedOpacity(p, PHOTO_IN_START, PHOTO_IN_END, PHOTO_OUT_START, PHOTO_OUT_END);
      photoEl.style.opacity = po;
      const riseP = Math.max(0, Math.min(1, (p - PHOTO_IN_START) / (PHOTO_IN_END - PHOTO_IN_START)));
      const photoOutP = Math.max(0, Math.min(1, (p - PHOTO_OUT_START) / (PHOTO_OUT_END - PHOTO_OUT_START)));
      const photoOutScale = 1 - 0.38 * easeInOut(photoOutP);
      const scale = (0.88 + 0.12 * easeInOut(riseP)) * photoOutScale;
      const rise = (1 - easeInOut(riseP)) * 26;
      photoEl.style.transform = `translateY(${rise}px) scale(${scale})`;
    }

    // ---- opening crawl (3D perspective, continuous recede) ----
    // Y motion runs in two legs — an ENTRY leg (rise from off-screen-
    // bottom to the on-screen resting spot, matched to the opacity
    // fade-in, and per Round 15 now straddling the title's own
    // fade-out window (see CRAWL_LEAD/CRAWL_IN_START above) so there
    // is a real, visible overlap between the two rather than a clean
    // handoff) followed by a RECEDE leg (continue rising all the way
    // past the top edge, well after the title has fully cleared).
    if (crawlViewport && crawlText) {
      const co = windowedOpacity(p, CRAWL_IN_START, CRAWL_IN_END, OUTRO_START, OUTRO_END);
      crawlViewport.style.opacity = co;
      let y;
      if (p < CRAWL_ENTRY_END) {
        const entryP = Math.max(0, Math.min(1, (p - CRAWL_RUN_START) / (CRAWL_ENTRY_END - CRAWL_RUN_START)));
        y = CRAWL_Y_START + (CRAWL_Y_VISIBLE - CRAWL_Y_START) * easeInOut(entryP);
      } else {
        const recedeP = Math.max(0, Math.min(1, (p - CRAWL_ENTRY_END) / (CRAWL_RUN_END - CRAWL_ENTRY_END)));
        y = CRAWL_Y_VISIBLE + (CRAWL_Y_END - CRAWL_Y_VISIBLE) * recedeP;
      }
      crawlText.style.transform = `rotateX(${CRAWL_TILT_DEG}deg) translateY(${y}vh)`;
    }

    // ---- scroll cue fades once the story actually gets going ----
    if (scrollCue) {
      scrollCue.style.opacity = p > 0.06 ? '0' : '1';
    }
  }

  renderAboutHero(0);

  // ROUND 9 FIX ("둘 사이에 갭을 없애줘" — remove the scroll-distance gap
  // between the hero's closing crawl fading out and Chapter 2's title
  // appearing). `end` used to be a PERCENTAGE ('+=620%'), which GSAP
  // resolves against the trigger element's (#section-about-hero) own CSS
  // box height. That box has now been shrunk to ~0 (see #section-about-hero
  // in style.css — it only ever existed to host this pin, its real content
  // is all `position:fixed`), so the percentage basis is gone too. Switched
  // to an explicit PIXEL distance instead, computed once from the viewport
  // height at load time so the animation's own pacing/feel is unchanged
  // from before (620% of a 100vh box = 6.2 * innerHeight).
  // ROUND 14: widened from 6.2 -> 7.4 to give the now fully-separated
  // title / gap / crawl-entry / crawl-hold-and-recede beats enough
  // scroll runway that none of them feel rushed, while keeping the
  // same safety margin below the real #section-about-profile peek-in
  // point that Round 12 established (re-verified via Playwright below
  // after this change).
  const HERO_PIN_DISTANCE = Math.round(window.innerHeight * 7.4);
  ScrollTrigger.create({
    id: 'about-hero-pin',
    trigger: heroSection,
    start: 'top top',
    end: '+=' + HERO_PIN_DISTANCE,
    pin: true,
    scrub: 0.5,
    onUpdate: (self) => renderAboutHero(self.progress),
    onRefresh: (self) => renderAboutHero(self.progress),
  });

  /* ============================================================
     CHAPTERS 2-5 — Selected Works / Education & Skills / Awards /
     Professional Experience.

     ROUND 11 REWRITE ("첫번째 이미지, 제거해줘야지... 두번째 이미지가
     스타워즈 스크롤 스크립트처럼 나와야한다는 거야"). Rounds 9-10 had
     each chapter play a SEPARATE, duplicate title+teaser screen
     (fixed overlay, its own copy of the heading/intro text) driven by
     its own pinned ScrollTrigger, BEFORE the real content scrolled
     into view below it. The user pointed out that whole extra screen
     is unwanted — instead, the REAL heading+intro (the actual content
     shown in .chapter-detail-wrap) should itself play the Star-Wars-
     crawl motion as it scrolls naturally into view.
     setupChapterPin() (the pinned duplicate-overlay approach) and its
     TITLE_ and TEASER_ timing constants are removed entirely, replaced
     by setupChapterCrawlHeading() below: a plain (non-pinned) scrub
     ScrollTrigger attached directly to the real chapter heading/intro
     elements, tied to their own natural top-of-viewport scroll position.
     (Round 12: further replaced by setupChapterTitleCard() — a separately
     pinned rise/hold/shrink title card per chapter — see below.)
     Because there is now only ONE copy of this text in the DOM (no
     fixed duplicate sitting on top of anything), the entire class of
     "duplicate text ghosting through from behind" bug that Rounds 9-10
     were fighting cannot occur here — nothing else can ever render
     underneath this text, because nothing else is drawn twice.
     ============================================================ */
  // ROUND 12 REPLACEMENT ("제목은 세번째 이미지처럼 화면아래서 올라오다,
  // 가운데 고정, 축소되면서 사라지고"): setupChapterCrawlHeading() (the
  // in-place scrub tilt) is replaced by setupChapterTitleCard() — a
  // SHORT, separately-pinned ScrollTrigger (its own small pin host,
  // .chapter-title-pin-host, ~1.4x viewport height of scroll) that
  // drives a fixed, large glowing #ch-*-title-card overlay through a
  // distinct 3-phase beat: (1) IN -- rises up from below the viewport
  // while fading in; (2) HOLD -- sits flat, fully opaque and centered,
  // at full prominent scale; (3) OUT -- shrinks + fades away. Once this
  // pin releases the card is already fully faded out (opacity 0)
  // before the real, plain, always-legible .chapter-detail-panel
  // heading (a separate, smaller, non-fixed copy of the same text)
  // scrolls into view below -- so the two are never on screen at the
  // same time, avoiding the Round 9-10 "duplicate text ghosting" bug.
  function setupChapterTitleCard(cfg) {
    const hostEl = document.getElementById(cfg.hostId);
    const cardEl = document.getElementById(cfg.cardId);
    if (!hostEl || !cardEl) return;

    // ROUND 15 v3 FIX ("첫번째 두번째 이미지 사이의 스크롤 다운 갭이 너무
    // 커" -- the gap between the crawl exiting and this chapter title card
    // reading as "fully there" felt too long): IN_END used to be 0.30,
    // meaning the card didn't reach full opacity until 30% through its own
    // pin. Shortened so the rise+fade-in resolves much faster once this
    // pin starts, without changing the HOLD or OUT phases at all.
    //
    // ROUND 16 FIX ("이렇게 겹치는게 아니구, 뒤에 셀렉티드 워크는 본문이
    // 올라오기 전에 축소되면서 페이드인돼야지" -- at the time, this was
    // read as "the two must NEVER be visible at the same time", so
    // PIN_DISTANCE was widened to 2.4x viewport and FADE_END pulled all
    // the way in to p=0.46, opening a dead, empty scroll gap where
    // NEITHER the card nor the body content was visible.
    //
    // ROUND 17 REVERSAL ("이건 JUNE HONG파트의 제목과 본문같은 효과로
    // 겹쳐야해" -- this must overlap the same way JUNE/HONG's own
    // title-fade-out/crawl-fade-in DOES: a genuine crossfade where both
    // are simultaneously on screen at partial opacity, not a hard split
    // with a dead gap in between). Measured the hero's own reference
    // behavior via Playwright: JUNE/HONG's title opacity is still ~0.94
    // at the exact instant the crawl paragraph underneath has already
    // reached ~0.94 opacity too -- a real, sustained overlap window, not
    // a same-instant coincidence of two barely-visible edges.
    //
    // ROOT CAUSE (unchanged from Round 16's analysis): with `pin:true`,
    // GSAP reserves exactly PIN_DISTANCE of extra scroll room after
    // hostEl, so the panel that follows in the DOM (.chapter-detail-
    // panel) inevitably starts peeking up from the BOTTOM edge of the
    // viewport once the pin's own progress crosses
    // `1 - viewportHeight/PIN_DISTANCE` -- at PIN_DISTANCE=2.4x, that
    // threshold sits at p≈0.583. Round 16 treated that peek-up point as
    // a bug to dodge (fading the card all the way out well BEFORE it);
    // Round 17 instead treats it as the crossfade midpoint to fade
    // THROUGH -- HOLD_END/FADE_END are widened so the card is still
    // partially opaque as the panel/filmography content peeks up and
    // starts its own independent fade-in (setupFilmographyCrawl()'s
    // per-item ScrollTrigger, or setupGroupCrawl()'s group crawl for
    // the other 3 chapters), then finishes dissolving shortly after, mirroring
    // JUNE/HONG's own title-shrinks-away-as-body-text-rises-in beat.
    // Verified via Playwright: at p≈0.62 (just past the peek threshold)
    // the card is still ~0.5 opaque while the first filmography item has
    // already reached ~0.4-0.6 opacity underneath -- a real, visible
    // crossfade, not two disjoint states.
    const IN_END = 0.07;
    const HOLD_END = 0.55;
    const FADE_END = 0.88;
    const RISE_VH = 46;

    function render(p) {
      p = Math.max(0, Math.min(1, p));
      let opacity, y, scale;
      if (p < IN_END) {
        const t = easeInOut(p / IN_END);
        opacity = t;
        y = RISE_VH * (1 - t);
        scale = 1;
      } else if (p < HOLD_END) {
        opacity = 1;
        y = 0;
        scale = 1;
      } else if (p < FADE_END) {
        const t = easeInOut((p - HOLD_END) / (FADE_END - HOLD_END));
        opacity = 1 - t;
        y = 0;
        scale = 1 - 0.42 * t;
      } else {
        opacity = 0;
        y = 0;
        scale = 0.58;
      }
      cardEl.style.opacity = opacity;
      cardEl.style.transform = `translateY(${y}vh) scale(${scale})`;
    }

    render(0);

    const PIN_DISTANCE = Math.round(window.innerHeight * 2.4);
    ScrollTrigger.create({
      id: cfg.hostId + '-pin',
      trigger: hostEl,
      start: 'top top',
      end: '+=' + PIN_DISTANCE,
      pin: true,
      scrub: 0.4,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
  }

  setupChapterTitleCard({ hostId: 'ch-works-title-pin', cardId: 'ch-works-title-card' });
  setupChapterTitleCard({ hostId: 'ch-edu-title-pin', cardId: 'ch-edu-title-card' });
  // Round 19 ("두번째 이미지가 아래서 스크롤되다가 중앙에 멈춰, 사라질때는
  // 축소및 페이드 아웃"): the school-logo lockup reuses this exact same
  // rise -> hold -> shrink-fade beat against its own short pin host
  // (ch-edu-logo-pin), which sits in the DOM right before the Education
  // detail panel/skills grid -- since this pin host also reserves its
  // own PIN_DISTANCE of extra scroll room, the skills grid naturally
  // only scrolls into view (and its own setupGroupCrawl() trigger only
  // starts) once the user has scrolled past this pin's full release
  // point, i.e. after the logo has completely faded away.
  setupChapterTitleCard({ hostId: 'ch-edu-logo-pin', cardId: 'ch-edu-logo-card' });
  setupChapterTitleCard({ hostId: 'ch-awards-title-pin', cardId: 'ch-awards-title-card' });
  setupChapterTitleCard({ hostId: 'ch-career-title-pin', cardId: 'ch-career-title-card' });

  // ROUND 12 ("년도별 작업 내역은... 3디로 공간을 활용해 화면아래서부터
  // 올라와서 화면위로 계속 올라가야지"): filmography list items used to
  // use the same 3D-perspective Star-Wars-crawl treatment as the hero's
  // own crawl text (CRAWL_TILT_DEG-tilted rotateX, receding).
  //
  // ROUND 16 (mis-)fix ("두번째 이미지의 코딩을 확인해서, 이런식으로
  // 글자의 각도가 수정돼야해") had removed the rotateX tilt entirely,
  // reading image 2 (the hero's flat intro paragraph) as a request for a
  // fully frontal, non-tilted look.
  //
  // ROUND 18 REVERSAL ("현재 텍스트 각도를 정면으로 요구한적이 한번도
  // 없어" -- flat was never actually the ask; the user supplied a real
  // Star-Wars-crawl reference: perspective + rotateX that grows steeper
  // as the text rises/recedes and fades, e.g. rotateX(30deg)->rotateX
  // (45deg) while opacity goes 1->0). The tilt is restored here, tuned
  // to the SAME family of angles already used elsewhere in this file
  // (TILT_HOLD reuses CRAWL_TILT_DEG=22, the hero crawl's own resting
  // angle; TILT_EDGE=34 is the deeper "receding into the distance" angle
  // at the far entry/exit ends -- kept short of 55deg, which the hero
  // crawl's own comment above already documents as "far too steep to
  // read" per earlier user feedback). Only `transform` is touched here;
  // no color/text-shadow property is modified anywhere in this function.
  function setupFilmographyCrawl() {
    const list = document.getElementById('filmography-list');
    if (!list) return;
    const items = list.querySelectorAll('.filmography-item-inner');
    if (!items.length) return;

    const TILT_HOLD = CRAWL_TILT_DEG; // 22deg -- legible resting tilt
    const TILT_EDGE = 34; // deeper tilt while entering/receding + faint

    items.forEach((inner) => {
      const li = inner.closest('.filmography-item');

      function render(p) {
        p = Math.max(0, Math.min(1, p));
        // 0 -> 0.18: rising in from below, tilt easing from the steep
        // "distant" angle down to the resting angle as it fades in.
        // 0.18 -> 0.82: sitting at the resting tilt while it crosses the
        // viewport (never fully flat -- keeps the 3D crawl look alive).
        // 0.82 -> 1: rising out near the top, tilt deepening back toward
        // the steep "receding into the distance" angle as it fades out.
        let opacity, y, tilt;
        if (p < 0.18) {
          const t = easeInOut(p / 0.18);
          opacity = t;
          y = 30 * (1 - t);
          tilt = TILT_EDGE - (TILT_EDGE - TILT_HOLD) * t;
        } else if (p < 0.82) {
          opacity = 1;
          y = 0;
          tilt = TILT_HOLD;
        } else {
          const t = easeInOut((p - 0.82) / 0.18);
          opacity = 1 - t;
          y = -18 * t;
          tilt = TILT_HOLD + (TILT_EDGE - TILT_HOLD) * t;
        }
        inner.style.opacity = opacity;
        inner.style.transform = `perspective(1000px) rotateX(${tilt}deg) translateY(${y}px)`;
      }

      gsap.set(inner, { opacity: 0 });
      ScrollTrigger.create({
        trigger: li,
        start: 'top 95%',
        end: 'top 15%',
        scrub: 0.4,
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
      });
    });
  }
  setupFilmographyCrawl();

  // ROUND 20 ("세번째 이미지, 이건 하단에서 올라오다가, 중앙에서 멈춰서
  // 있다가 올라가야지") introduced this rise -> hold -> recede-and-fade
  // group crawl for the Education skills grid, as a distinct beat from
  // the one-way, no-exit generic [data-reveal] fade-in Awards/Career
  // used to share.
  //
  // ROUND 21 ("첫번째/두번째 이미지 영역의 실선을 모두 제거해줘" +
  // "세번째 이미지에서 보이는 것처럼 모든 컨텐츠들이 중앙에 유지되었다
  // 위로 올라가면서 사라지게끔... 3초 정도 유지할 수 있게끔") extends the
  // SAME beat to Awards and Career too (they no longer carry
  // [data-reveal] -- that whole generic block is gone, see below), and
  // widens the hold leg considerably so it reads as a genuine multi-
  // second pause rather than a quick pass-through. Generalized into one
  // reusable setupGroupCrawl() instead of three near-duplicate
  // functions.
  //
  // Windowing is done in ABSOLUTE PIXELS (not vh/vw percentages) so the
  // hold duration stays consistent across viewport heights: percentage-
  // based windows (e.g. 'top 100%' -> 'top -20%') scale their total
  // scroll distance with viewport height, which would make the hold
  // feel shorter on smaller screens. HOLD_PX=2200 is tuned to
  // approximate "3초 정도" at a typical continuous scroll speed.
  function setupGroupCrawl(hostId, innerSelector) {
    const host = document.getElementById(hostId);
    if (!host) return;
    const inner = host.querySelector(innerSelector);
    if (!inner) return;

    const TILT_HOLD = CRAWL_TILT_DEG; // 22deg -- legible resting tilt
    const TILT_EDGE = 34; // deeper tilt while entering/receding + faint
    const ENTRY_PX = 320;
    const HOLD_PX = 2200; // ~3s dwell at a typical continuous scroll speed
    const EXIT_PX = 320;
    const TOTAL_PX = ENTRY_PX + HOLD_PX + EXIT_PX;
    const ENTRY_END = ENTRY_PX / TOTAL_PX;
    const HOLD_END = (ENTRY_PX + HOLD_PX) / TOTAL_PX;

    function render(p) {
      p = Math.max(0, Math.min(1, p));
      let opacity, y, tilt;
      if (p < ENTRY_END) {
        const t = easeInOut(p / ENTRY_END);
        opacity = t;
        y = 60 * (1 - t);
        tilt = TILT_EDGE - (TILT_EDGE - TILT_HOLD) * t;
      } else if (p < HOLD_END) {
        opacity = 1;
        y = 0;
        tilt = TILT_HOLD;
      } else {
        const t = easeInOut((p - HOLD_END) / (1 - HOLD_END));
        opacity = 1 - t;
        y = -36 * t;
        tilt = TILT_HOLD + (TILT_EDGE - TILT_HOLD) * t;
      }
      inner.style.opacity = opacity;
      inner.style.transform = `perspective(1200px) rotateX(${tilt}deg) translateY(${y}px)`;
    }

    gsap.set(inner, { opacity: 0 });
    ScrollTrigger.create({
      trigger: host,
      start: 'top bottom',
      end: '+=' + TOTAL_PX,
      scrub: 0.4,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
  }
  setupGroupCrawl('edu-skills-crawl', '.edu-skills-crawl-inner');
  setupGroupCrawl('awards-crawl', '.awards-crawl-inner');
  setupGroupCrawl('career-crawl', '.career-crawl-inner');

  /* ============================================================
     Education & Skills — interactive skill tiles. Each tile is a
     real <button> that flips on hover (desktop, via CSS :hover) or
     tap/keyboard activation (the click listener below toggles
     .is-flipped, which the CSS also honors — see .skill-tile.is-
     flipped rules in style.css) to reveal its percentage on the
     back face, rather than a static always-visible bar chart
     ("고정된 바 차트 대신, 좀 더 인터랙티브 하게"). The percentage
     count-up and bar-fill animation itself plays once, the first
     time the grid scrolls into view, using each tile's own
     data-skill value rounded down (Math.floor) — so the back face
     is already correct by the time a user flips any given tile. ----
     ============================================================ */
  function setupSkillTiles() {
    const grid = document.getElementById('skills-grid');
    if (!grid) return;
    const tiles = grid.querySelectorAll('.skill-tile');
    if (!tiles.length) return;

    tiles.forEach((tile) => {
      tile.addEventListener('click', () => tile.classList.toggle('is-flipped'));
    });

    let animated = false;
    function animateSkills() {
      if (animated) return;
      animated = true;
      tiles.forEach((tile) => {
        const target = Math.floor(parseFloat(tile.dataset.skill || tile.querySelector('[data-target]')?.dataset.target || '0'));
        const percentEl = tile.querySelector('.skill-percent');
        const fillEl = tile.querySelector('.skill-bar-fill');
        if (fillEl) fillEl.style.width = target + '%';
        if (percentEl) {
          const counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.3,
            ease: 'power2.out',
            onUpdate: () => { percentEl.textContent = Math.floor(counter.v) + '%'; },
          });
        }
      });
    }

    ScrollTrigger.create({
      trigger: grid,
      start: 'top 85%',
      onEnter: animateSkills,
      onEnterBack: animateSkills,
    });
  }
  setupSkillTiles();

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
