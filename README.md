# Be the ONE — Visual Storyteller Portfolio

## Project Overview
- **Name**: Be the ONE (June Hong Portfolio)
- **Goal**: 원본 사이트(`https://3000-ibx6mk155c0w82u8lcaqf-3844e1b6.sandbox.novita.ai/`)를 분석하여 동일한 구조·디자인·인터랙션으로 재구성한 시네마틱 스크롤 인터랙티브 포트폴리오 사이트
- **Features**:
  - GSAP + ScrollTrigger 기반의 풀스크린 스크롤 시퀀스 (핀 고정 애니메이션)
  - 3D 큐브(6면, 12장 이미지) 회전 인트로 + 배경 성냥 영상 scrub 연동
  - "WORK REEL" 구간: 스크롤에 currentTime이 연동되는 매치무비 2편
  - "WORKED WITH" 클라이언트 로고월 (5줄, 좌우 교차 마퀴, 스크롤 연동)
  - PHOTOS / VIDEOS 컨베이어 벨트형 썸네일 캐러셀 (카테고리 자동 하이라이트)
  - `/photos`, `/videos` 정적 상세 페이지 (카테고리 필터 pill)
  - 반응형 레이아웃 (모바일 대응 포함)

## URLs
- **Local/Sandbox Preview**: (GetServiceUrl로 발급되는 프리뷰 URL)
- **원본 참고 사이트**: https://3000-ibx6mk155c0w82u8lcaqf-3844e1b6.sandbox.novita.ai/
- **GitHub**: (미연동)

## Data Architecture
- **Data Models**: 정적 콘텐츠(사진/영상 카테고리, 클라이언트 로고 목록)는 `public/static/media-config.js`(window.SITE_MEDIA)와 각 페이지 HTML(`src/pages/*.html`)에 하드코딩
- **Storage Services**: 별도 DB 없음 — 모든 미디어(영상 mp4, 이미지 jpg/png)는 Cloudflare Pages 정적 자산(`public/`)으로 서빙
- **Data Flow**: Hono가 `/`, `/photos`, `/videos` 세 라우트에서 `?raw` import된 정적 HTML을 그대로 반환 → 클라이언트에서 `app.js`(GSAP)가 `media-config.js`의 URL들을 각 `data-media-slot`에 주입 → ScrollTrigger가 스크롤 위치에 따라 애니메이션/비디오 seek 수행

## Routes
| Path | 설명 |
|---|---|
| `GET /` | 메인 스크롤 인터랙티브 페이지 (큐브 인트로 → 워크릴 → 로고월 → 포토스 → 비디오스) |
| `GET /photos` | 사진 전체 컬렉션 (카테고리 필터: Food/Fashion/Product/Venue/AI) |
| `GET /videos` | 영상 전체 컬렉션 (카테고리 필터: Event Recap/Brand Film/Documentary/Advertisement/Art/Reels) |
| `GET /static/*` | 정적 자산 (style.css, app.js, media-config.js, detail-page.js, 이미지/로고/영상) |
| `GET /reel-video/*` | 인트로·워크릴용 대용량 스크럽 영상 (Range 요청 지원) |

## User Guide
1. 메인 페이지(`/`)에서 마우스 휠/트랙패드로 스크롤하면 섹션이 순서대로 핀 고정되며 애니메이션이 재생됩니다.
2. 우측 점(dot) 네비게이션 또는 상단 헤더(HOME/PHOTOS/VIDEOS/ABOUT ME)로 각 섹션에 바로 이동할 수 있습니다.
3. PHOTOS/VIDEOS 구간에서는 하단에 나타나는 카테고리 목록과 "Details" 버튼을 눌러 `/photos`, `/videos` 상세 페이지로 이동해 카테고리별 필터링이 가능합니다.

## Tech Stack
- **Backend**: Hono (Cloudflare Workers/Pages)
- **Frontend**: Vanilla JS + GSAP 3.12.5 + ScrollTrigger (CDN)
- **Fonts**: Google Fonts(Jost, Fraunces, Playfair Display) + Pretendard(jsdelivr CDN)
- **Build**: Vite + `@hono/vite-build/cloudflare-pages`

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: 로컬 샌드박스 검증 완료 (실제 배포는 별도 진행 필요)
- **Last Updated**: 2026-08-22

## 다음 단계 (Not Yet Implemented)
- 실제 Cloudflare Pages 프로덕션 배포
- `photoCards`, `landscapeVideos`, `reelVideos`, `videosIntroThumb`, `splitPhoto` 등 media-config.js의 빈 슬롯에 실제 콘텐츠 채우기 (현재는 placeholder만 표시됨 — 원본 사이트도 동일 상태)
- ABOUT ME 섹션 콘텐츠 (원본 사이트에도 별도 섹션 마크업은 없고 헤더 링크만 존재, `/#section-2`로 연결됨)
