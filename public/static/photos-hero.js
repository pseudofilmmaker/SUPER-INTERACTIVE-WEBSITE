/* ============================================================
   /photos video-hero intro:
   video-1 (campfire -> Milky Way pull-back) autoplays once ->
   on 'ended' hard-cuts to video-2 (starfield loop), which then
   loops forever as the persistent backdrop -> at that same
   handoff instant the real page content (#photos-real-content)
   fades/rises in on top.

   Deliberately NOT scroll-scrubbed (unlike app.js/about.js's
   pinned ScrollTrigger chains): the user's own spec describes a
   straight sequential "video1 ends -> video2 loops -> content
   appears" handoff, not a scroll-driven scrub, and scroll is
   locked (body.photos-hero-locked) until that handoff fires so
   there is nothing to scroll through during the hero anyway.
   ============================================================ */
(function () {
  'use strict';

  const layer = document.getElementById('photos-hero-video-layer');
  const video1 = document.getElementById('photos-hero-video-1');
  const video2 = document.getElementById('photos-hero-video-2');
  const content = document.getElementById('photos-real-content');
  if (!layer || !video1 || !video2 || !content) return;

  /* ------------------------------------------------------------
     Same byte-range/206 workaround used by app.js/about.js on this
     server (blobifySeekableVideo). Not strictly required for a
     straight-through autoplay (no seeking happens here), but kept
     for consistency/robustness in case a browser's <video> element
     stalls trying to buffer via range requests the server can't
     serve; blobbing guarantees a normal in-memory playback source.
     ------------------------------------------------------------ */
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

  // Lock scroll while the hero plays so the gated content below
  // can't be scrolled into view early.
  document.body.classList.add('photos-hero-locked');

  gsap.set([video1, video2], { opacity: 0 });
  gsap.set(video1, { opacity: 1 });
  gsap.set(content, { opacity: 0, y: 28 });

  let revealed = false;
  function revealPhotosPage() {
    if (revealed) return;
    revealed = true;

    // Hard-cut video1 -> video2 (this site's established no-crossfade
    // convention -- see setupVideosBgVideo() in app.js).
    gsap.set(video1, { opacity: 0 });
    gsap.set(video2, { opacity: 1 });
    video2.currentTime = 0;
    video2.play().catch(() => {});

    document.body.classList.remove('photos-hero-locked');
    document.body.classList.add('photos-hero-revealed');

    gsap.to(content, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' });
  }

  video1.addEventListener('ended', revealPhotosPage);

  // Safety net: if video1 fails to load/play at all (autoplay block,
  // network error, etc.) don't leave the real page permanently gated
  // behind a frozen hero -- fall through after a generous timeout.
  video1.addEventListener('error', revealPhotosPage);
  setTimeout(() => { if (!revealed) revealPhotosPage(); }, 12000);
})();
