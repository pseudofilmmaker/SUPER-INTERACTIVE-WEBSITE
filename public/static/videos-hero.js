/* ============================================================
   /videos page video-hero backdrop (ROUND 10, user request: "비디오
   페이지도 포토 페이지처럼 영상을 활용해, 비디오 포트폴리오 진입을 똑같이
   만들어줘" -- give /videos the same video-based scroll-scrubbed
   entry /photos already has; ROUND 11, user supplied the actual
   footage: "비디오스에 들어갈 영상이야"). Direct structural port of
   photos-hero.js's setupHeroVideo() (PART 1 only -- /videos has no
   conveyor, so there is no PART 2 equivalent here): video-1 (a
   campfire that tilts up into a starry Milky Way sky, fading to a
   sparse starfield) is scroll-scrubbed across the pinned
   #videos-hero-panel; once the scrub reaches its own end, it
   hard-cuts to video-2 (a seamless-looping animated starfield that
   breathes/flares), which then plays/loops forever as this page's
   persistent fixed backdrop, decoupled from scroll from that point
   on -- exactly mirroring /photos' campfire->starfield hand-off,
   just re-namespaced videos-hero-* / with its own dedicated media
   files (see videos.html's own comment block for asset provenance).
   ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  function setVH() {
    document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);

  (function setupHeroVideo() {
    const panel = document.getElementById('videos-hero-panel');
    const video1 = document.getElementById('videos-hero-video-1');
    const video2 = document.getElementById('videos-hero-video-2');
    if (!panel || !video1 || !video2) return;

    /* Root-cause fix for scroll-scrubbed <video> seeking (same as
       photos-hero.js/app.js's blobifySeekableVideo) -- this server
       serves video files as a single non-range-seekable 200 OK
       response, so `seekable` stays a degenerate [[0,0]] and any
       `currentTime` assignment silently clamps back to 0 unless the
       <video> is pointed at a local Blob URL instead. */
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

    const scrollCue = document.getElementById('videos-scroll-cue');

    let handedOff = false;
    let broken = false;

    function handToVideo2(isBroken) {
      if (handedOff) return;
      handedOff = true;
      if (isBroken) broken = true;
      gsap.set(video1, { opacity: 0 });
      gsap.set(video2, { opacity: 1 });
      video2.currentTime = 0;
      video2.play().catch(() => {});
      if (scrollCue) scrollCue.style.opacity = '0';
    }

    function handBackToVideo1(p) {
      if (!handedOff || broken) return;
      handedOff = false;
      video2.pause();
      gsap.set(video2, { opacity: 0 });
      gsap.set(video1, { opacity: 1 });
      renderHeroScrub(p);
    }

    function renderHeroScrub(p) {
      if (handedOff) return;
      const t = Math.max(0, Math.min(1, p)) * dur1;
      if (video1.readyState > 0 && Number.isFinite(t)) {
        video1.currentTime = t;
      }
      if (scrollCue) scrollCue.style.opacity = p > 0.06 ? '0' : '1';
    }
    renderHeroScrub(0);

    ScrollTrigger.create({
      id: 'videos-hero-scrub',
      trigger: panel,
      start: 'top top',
      end: '+=140%',
      pin: true,
      pinSpacing: true,
      scrub: 0.3,
      onUpdate: (self) => renderHeroScrub(self.progress),
      onRefresh: (self) => renderHeroScrub(self.progress),
      onLeave: () => handToVideo2(),
      onEnterBack: (self) => handBackToVideo1(self.progress),
      onLeaveBack: () => {
        if (handedOff) return;
        renderHeroScrub(0);
        if (scrollCue) scrollCue.style.opacity = '1';
      },
    });

    video1.addEventListener('error', () => handToVideo2(true));
    setTimeout(() => { if (!handedOff && video1.readyState === 0) handToVideo2(true); }, 12000);
  })();
})();
