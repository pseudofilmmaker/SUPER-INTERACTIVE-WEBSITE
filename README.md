# Be the ONE — Visual Storyteller Portfolio

## Project Overview
- **Name**: Be the ONE (June Hong Portfolio)
- **Goal**: 원본 사이트(`https://3000-ibx6mk155c0w82u8lcaqf-3844e1b6.sandbox.novita.ai/`)를 분석하여 동일한 구조·디자인·인터랙션으로 재구성한 시네마틱 스크롤 인터랙티브 포트폴리오 사이트
- **Features**:
  - GSAP + ScrollTrigger 기반의 풀스크린 스크롤 시퀀스 (핀 고정 애니메이션)
  - 3D 큐브(6면, 12장 이미지) 회전 인트로 + 배경 성냥 영상 scrub 연동 (사용자 업로드 실사 영상 3편으로 교체: 성냥 낙하→정착→손이 집어 듦, 정적 홀드샷, 점화)
  - 배경 영상은 `#fixed-bg-video` 한 레이어에 `position:fixed`로 고정되어 인트로(큐브)→WORK REEL(태그라인)→WORKED WITH 로고월 구간 전체에서 화면에 계속 떠 있는 "미디어 플레이어"처럼 동작하며(스크롤에 반응해 스스로 올라가지 않음), 오직 전경 콘텐츠(히어로 텍스트, 태그라인, 로고월)만 스크롤에 반응해 위로 올라감. 영상 4편(1a 성냥 낙하/손이 집음 → 1b 정적 홀드샷 → 2 점화 → 4 불붙은 성냥이 횃불에 다가감)이 하나의 체인으로 하드컷 전환되며, "Be the ONE" 텍스트 상승은 1a→1b 전환과 정확히 동시에 시작되고, 전체 체인은 WORKED WITH 섹션이 시작되기 전에 반드시 끝나도록 WORK REEL 핀의 진행률(0→1)을 3등분해 구성함
  - "WORKED WITH" 클라이언트 로고월 (5줄, 좌우 교차 마퀴, 스크롤 연동)
  - PHOTOS / VIDEOS 컨베이어 벨트형 썸네일 캐러셀 (카테고리 자동 하이라이트)
  - `/photos`, `/videos` 정적 상세 페이지 (카테고리 필터 pill)
  - 반응형 레이아웃 (모바일 대응 포함)

## URLs
- **Local/Sandbox Preview**: (GetServiceUrl로 발급되는 프리뷰 URL)
- **원본 참고 사이트**: https://3000-ibx6mk155c0w82u8lcaqf-3844e1b6.sandbox.novita.ai/
- **GitHub 저장소**: https://github.com/pseudofilmmaker/SUPER-INTERACTIVE-WEBSITE (branch: `main` — Hono/Cloudflare 소스 전체)
- **GitHub Pages 임시 미리보기**: https://pseudofilmmaker.github.io/SUPER-INTERACTIVE-WEBSITE/ (branch: `gh-pages` — 정적 HTML/CSS/JS/미디어로 재빌드한 데모. Hono 서버 라우팅 없이 순수 정적 파일로 서빙되므로, Cloudflare Pages 배포판과 100% 동일하지 않을 수 있음 — 실제 배포는 Cloudflare Pages 기준)
- **전체 소스 다운로드**: https://www.genspark.ai/api/files/s/YYx21kBf (`webapp-source.tar.gz`, node_modules/dist 제외 약 31MB)

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

## 섹션 1-2 배경 영상 (사용자 업로드 실사 영상으로 교체 완료)
사용자가 첨부한 3개 원본 영상(4K, 총 36MB)을 프레임 단위로 분석하여 각각의 역할을 파악하고, 웹 최적화(1080p 재인코딩 + 오디오 제거 + 스크럽 전용 GOP 구조)를 적용해 반영했습니다.

| 업로드 파일 | 실제 내용(프레임 분석 결과) | 적용된 역할 | 최적화 후 크기 |
|---|---|---|---|
| `0_FIXED.mp4` (8.0s) | 성냥 낙하→정착(0-4.5s)→손이 들어와 집음(4.5-6.5s)→프레임 밖으로 들어올림(6.5-8s) | `bg-video-1a` (section1-matches-scrub-01.mp4) | 10.9MB → 3.97MB |
| `1.mp4` (6.0s) | 불 붙지 않은 성냥이 정적으로 유지 (변화 없음) | `bg-video-1b` (section1-matches-scrub-02.mp4, 손짓 이후 정적 홀드샷) | 8.4MB → 0.46MB |
| `2.mp4` (6.0s) | 정적 성냥이 약 1.5-2s 지점에서 점화되어 계속 타오름 | `bg-video-2` (section2-match-ignite.mp4, 기존 "torch-loop"를 대체 — 자동재생 루프 대신 로고월 스크롤 진행률에 currentTime을 1:1로 연동하는 스크럽 방식으로 전환) | 10.9MB → 0.97MB |

**최적화 내역**:
- 4K(3840×2160) → 1080p(1920×1080) 다운스케일 (원본 사이트도 1080p 기준)
- 오디오 트랙 완전 제거 (어차피 `muted` 재생이라 불필요한 페이로드)
- `libx264 -crf 23 -preset slow`로 재인코딩, `-movflags +faststart`로 스트리밍 시작 지연 최소화
- section1 배경 2편은 스크롤 스크러빙 부드러움을 위해 GOP=6(짧은 키프레임 간격) 유지, section2는 스크럽 특성상 표준 GOP=48 적용해 추가 압축
- 총 페이로드: 36MB(원본 업로드) → 약 5.4MB(최적화본), 기존 재구성본 대비도 약 30% 경량화

**코드 변경**: `bg-video-2`가 실제로는 "루프 가능한 토치 영상"이 아니라 한 번만 점화되는 논-루프 영상이므로, `autoplay+loop` 속성을 제거하고 section-2 스크롤 진행률에 맞춰 `currentTime`을 직접 seek하도록 변경 — 로고월이 스크롤로 나타나는 시점과 성냥이 불붙는 시점이 항상 정확히 일치합니다.

**추가 개선 (연속 재생 체이닝)**: 애초 구현은 `bg-video-1b`(정적 홀드샷)가 인트로 핀이 끝나는 순간의 프레임에서 멈춰버리고, `bg-video-2`(점화)는 section-2가 화면에 "들어오는" 짧은 구간에서만 반응하는 구조였습니다. 이를 미디어 플레이어의 연속재생(플레이리스트)처럼 동작하도록 재구성했습니다:
- `bg-video-1b`: section-1 인트로 핀이 끝나는 시점(=work-reel 섹션 진입) → work-reel 섹션 전체 → section-2 진행률의 55% 지점까지, 하나의 연속된 ScrollTrigger로 처음부터 끝까지(0→duration) 스크럽되어, 섹션1→2 전환 구간 내내 스크롤에 반응합니다.
- `bg-video-2`: section-2 진행률 55% 지점(위 트리거와 정확히 동일한 경계값 사용, 갭/오버랩 없음)에서 하드컷으로 전환된 후, section-2가 끝나고 section-3(PHOTOS)가 시작되기 직전까지 처음부터 끝까지(0→duration) 스크럽됩니다.
- 두 구간의 경계(`HANDOFF = '55% top'`)를 정확히 동일한 앵커 값으로 양쪽 트리거에 사용해, 한 클립이 끝나는 지점과 다음 클립이 시작하는 지점이 스크롤 픽셀 단위로 완전히 일치하도록 보장했습니다 — 미디어 플레이어에서 트랙이 끊김 없이 다음 트랙으로 넘어가는 것과 동일한 사용자 경험입니다.

## 다음 단계 (Not Yet Implemented)
- 실제 Cloudflare Pages 프로덕션 배포
- `photoCards`, `landscapeVideos`, `reelVideos`, `videosIntroThumb`, `splitPhoto` 등 media-config.js의 빈 슬롯에 실제 콘텐츠 채우기 (현재는 placeholder만 표시됨 — 원본 사이트도 동일 상태)
- ABOUT ME 섹션 콘텐츠 (원본 사이트에도 별도 섹션 마크업은 없고 헤더 링크만 존재, `/#section-2`로 연결됨)
