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
    '/static/media/cube/cube-01.jpg',
    '/static/media/cube/cube-02.jpg',
    '/static/media/cube/cube-03.jpg',
    '/static/media/cube/cube-04.jpg',
    '/static/media/cube/cube-05.jpg',
    '/static/media/cube/cube-06.jpg',
    '/static/media/cube/cube-07.jpg',
    '/static/media/cube/cube-08.jpg',
    '/static/media/cube/cube-09.jpg',
    '/static/media/cube/cube-10.jpg',
    '/static/media/cube/cube-11.jpg',
    '/static/media/cube/cube-12.jpg'
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

  // ── 5. PHOTOS 카드 스택 (5장, 순서: Food/Fashion/Product/Places/AI) ──
  photoCards: [
    '/static/media/photos/food/food-01.jpg',
    '/static/media/photos/fashion/fashion-02.jpg',
    '/static/media/photos/product/product-01.jpg',
    '/static/media/photos/places/places-01.jpg',
    '/static/media/photos/ai/ai-01.jpg'
  ],

  // ── 6. VIDEOS 인트로 썸네일 ─────────────────────────────────
  videosIntroThumb: '',

  // ── 7. VIDEOS 랜드스케이프 (가로, 10개) ──────────────────────
  landscapeVideos: ['', '', '', '', '', '', '', '', '', ''],

  // ── 8. VIDEOS 릴스 (세로, 6개) ───────────────────────────────
  reelVideos: ['', '', '', '', '', '']
};
