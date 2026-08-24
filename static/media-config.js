/**
 * ============================================================
 *  SITE MEDIA CONFIG
 *  실제 영상/이미지 파일이 도착하면 아래 빈 문자열('') 자리에
 *  URL(또는 /static/media/xxx.mp4 같은 로컬 경로)만 채워 넣으면
 *  자동으로 반영됩니다. 코드(app.js)는 건드릴 필요 없습니다.
 *
 *  이미지: .jpg .jpeg .png .webp .gif
 *  영상  : .mp4 .webm .mov  (자동 muted/loop/autoplay 배경 재생)
 * ============================================================
 */
window.SITE_MEDIA = {

  // ── 1. 인트로 큐브 (정육면체 6면, 12장) ─────────────────────
  // 순서: [정면, 우측면, 배면, 좌측면, 윗면, 아랫면] × 2세트(lap1, lap2)
  // 큐브가 1바퀴째 돌 때는 앞 6장(0~5), 2바퀴째 돌 때는 뒤 6장(6~11)이
  // 각 면에 크로스페이드로 나타나 총 12장이 최소 2바퀴 동안 모두 노출됨.
  cube: [
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-03.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-04.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-05.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-06.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-07.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-08.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-09.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-10.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-11.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/cube/cube-12.jpg'
  ],

  // ── 2. 로고월(WORKED WITH) 배경 영상 -- 이제 #fixed-bg-video의 bg-video-2로
  //      하드코딩되어 고정 배경으로 재생됨 (index.tsx 참고). 더 이상 이
  //      media-slot 주입 방식을 쓰지 않으므로 아래 키는 사용되지 않음.

  // ── 3. 인물 사진(포트레이트) ─────────────────────────────
  splitPhoto: '',

  // ── 4. PHOTOS 인트로 배경 영상 -- 제거됨 (요청: "현재 포토스의 배경
  //      영상은 제거해주고") -- 빈 문자열이면 title-bg-media는 자신의
  //      CSS 그라디언트 배경(linear-gradient 160deg #1c0f06->#05050a)만
  //      보여주고, 그 위에 완전 투명 배경의 PHOTOS 타이틀 텍스트가
  //      스크롤 연동으로 하단에서 올라와 고정된다 (see .group-title /
  //      setupGroupTitleFrameIn() in app.js).
  photosIntroImage: '',

  // ── 5. PHOTOS 카드 컨베이어 (10장, 카테고리당 2장 연속 배치) ──
  // 순서: Food x2, Fashion x2, Product x2, Places x2, AI x2
  // (VIDEOS 랜드스케이프 캐러셀과 동일한 패턴 -- 카테고리당 여러 장을
  // 컨베이어에 연속 배치하고 categoryForIndex: idx => Math.floor(idx/2)
  // 로 카테고리 리스트 하이라이트에 매핑한다.)
  photoCards: [
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/food/food-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/food/food-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/fashion/fashion-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/fashion/fashion-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/product/product-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/product/product-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/places/places-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/places/places-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/ai/ai-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/photos/ai/ai-02.jpg'
  ],

  // ── 6. VIDEOS 인트로 썸네일 -- 이제 #videos-bg-video-layer(bg-video-9)가
  //      section-5 배경을 담당하므로 비워둠 (PHOTOS의 photosIntroImage와
  //      동일한 패턴, see #section-5 .title-bg-media { background:
  //      transparent } in style.css).
  videosIntroThumb: '',

  // ── 7. VIDEOS 랜드스케이프 (가로, 14개) ──────────────────────
  // 실제 구글드라이브 자료 개수에 맞춘 불균등 분포:
  // EVENTS x3, BRAND FILMS x4, DOCUMENTARY x2, COMMERCIALS x4, ART x1
  // (카테고리 리스트 순서 EVENTS/BRAND FILMS/DOCUMENTARY/COMMERCIALS/ART와
  // 일치하도록 배치 -- app.js의 categoryForIndex 매핑과 반드시 동기화)
  landscapeVideos: [
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/events-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/events-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/events-03.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/brand-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/brand-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/brand-03.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/brand-04.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/documentary-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/documentary-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/commercials-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/commercials-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/commercials-03.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/commercials-04.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/landscape/art-01.jpg'
  ],

  // ── 8. VIDEOS 릴스 (세로, 11개) ───────────────────────────────
  reelVideos: [
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-01.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-02.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-03.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-04.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-05.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-06.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-07.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-08.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-09.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-10.jpg',
    '/SUPER-INTERACTIVE-WEBSITE/static/media/videos/reels/reel-11.jpg'
  ]
};
