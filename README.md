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
- **Last Updated**: 2026-08-26

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

## VIDEOS 아웃트로(section-8) 배경 영상 체인 확장 (5편 추가 완료)
사용자가 첨부한 5개 원본 영상(4K, 총 150.7MB)을 프레임 단위(각 클립의 첫/끝 프레임 밝기·시각 대조)로 분석하여, 기존 VIDEOS 배경 체인(`videos-bg-9/10/11.mp4`)이 끝나는 지점(스크린샷: 어두운 화면 + 우측 작은 횃불)에 정확히 이어붙였습니다.

| 업로드 파일 | 프레임 분석 결과 | 적용된 역할 | 최적화 후 크기 |
|---|---|---|---|
| `12.mp4` (6.0s) | 꺼진 횃불(video-11 종료 프레임과 밝기 연속) → 완전히 타오름 | `videos-bg-12.mp4` | 17.1MB → 2.17MB |
| `13.mp4` (6.0s) | 활활 타는 횃불(video-12 종료 프레임과 거의 동일) → 카메라 풀백, 사파리룩 남성(사진작가) 등장 | `videos-bg-13.mp4` | 15.7MB → 2.05MB |
| `14.mp4` (6.0s) | 동일 리빌 샷 연속 → 모닥불 전경 완성 | `videos-bg-14.mp4` | 23.0MB → 4.10MB |
| `15_1.mp4` (6.0s) | 모닥불(video-14 종료 프레임과 거의 동일) → 카메라 풀백, 밤하늘·은하수·숲 전경 | `videos-bg-15.mp4` | 34.9MB → 6.04MB |
| `16.mp4` (6.0s) | 동일 밤하늘 전경 연속 → 은하수 클로즈업 피날레 | `videos-bg-16.mp4` | 60.1MB → 8.60MB |

**최적화 내역** (기존 섹션 1-2 작업과 동일 파이프라인):
- 4K(3840×2160) → 1080p(1920×1080) Lanczos 다운스케일
- 오디오 트랙 완전 제거 (`-an`, 어차피 `muted` 재생이라 불필요한 페이로드 — 원본은 AAC 256kbps 포함)
- `libx264 -crf 23 -preset slow -profile:v high -pix_fmt yuv420p -g 48 -movflags +faststart`로 재인코딩, 기존 `videos-bg-9/10/11.mp4`와 완전히 동일한 스펙(1920×1080/h264/24fps/6.000000s)으로 통일
- 총 페이로드: 150.7MB(원본 4K 업로드 5편) → 약 23.0MB(최적화본), 약 85% 경량화

**코드 변경 (`setupVideosBgVideo()` in `app.js`, `.videos-outro` in `style.css`)**:
- `#videos-bg-video-layer`에 5개 `<video>` 요소(`videos-bg-video-12`~`16`) 추가, 기존 9/10/11과 동일하게 `blobifySeekableVideo()`(디코더 동시초기화 크로스토크 방지, 250ms 스태거) + `prewarmSeek()`(첫 노출 시 콜드시크 블랙플래시 방지) 적용
- 하드컷 체인을 9→10→11→12→13→14→15→16 8단계로 확장 — **투명도 조절(디졸브/크로스페이드) 전혀 없이** 매 스크롤 틱마다 정확히 하나의 클립만 opacity:1, 나머지는 전부 opacity:0인 제로폭(zero-width) 하드컷 방식을 그대로 유지 (기존 9/10/11 전환과 동일 패턴, 사용자의 "투명도 조절없이 원본 그대로" 요청 그대로 반영)
- 구간 경계(`PHASE_V*_END`)는 8개 클립 균등분할이 아니라 실제 스크롤 거리 가중치로 계산: section-5(v9)=100vh, section-6 핀(v10)=308vh, section-7 핀(v11)=330vh(기존 3편 합계 838vh, 변경 없음) + 신규 5편은 각각 100vh씩(section-8 확장분) — 새 전체 합계 1338vh 기준으로 각 클립이 균일한 스크럽 속도를 유지하도록 비율 계산
- `#section-8`(`.videos-outro`)의 `min-height`를 기존 100vh(기본 `.panel` 높이)에서 600vh로 확장 — 신규 5클립(각 100vh)이 뭉개지지 않고 기존 클립들과 동일한 페이스로 스크럽될 수 있도록 스크롤 공간 확보. 여전히 완전 투명(`background: transparent`)이며 전경 콘텐츠는 없음(section-7에서 이미 모든 VIDEOS UI가 화면 위로 사라진 이후 구간)

## 점화 게이트(IGNITE GATE) + "You are now connected with my work" 인터랙션
사용자 요청("횃불에 불이 붙기 전에 재생을 스크롤다운에도 반응없이, 고정된 화면에서 ... 점멸하는 원 옆에 불을 붙여주세요를 영어로 점멸하게끔 ... 원을 클릭하는 순간 불이 붙은 장면에서 다시 멈춤. 거기서 다시 스크롤다운에 반응하는 영상으로 전환 ... 두번째 첨부이미지가 나오는 시점에서, '당신은 나의 작업물과 연결되었습니다.'를 영어로 인터랙티브하게")에 따라, VIDEOS 배경 체인(`videos-bg-12`~`13`) 구간에 두 가지 신규 인터랙션을 추가했습니다.

**1) 점화 게이트 (클릭-투-이그나이트)** — `videos-bg-12.mp4` 시작 지점(t=0, 완전히 꺼진 횃불)에서:
- 사용자가 첨부한 참고 이미지(횃불 머리 위 흰색 발광 원 + 얇은 외곽 링)를 `understand_images`로 분석해 정확한 좌표 비율(원 중심 49.6%/30.6%, 내부 원 반지름 ~32px, 외곽 링 반지름 ~60px)을 확보
- 실제 `videos-bg-12.mp4`(1920x1080) 프레임에서 PIL+scipy 블롭 분석으로 횃불 머리의 실제 화면 좌표(x=49.74%, y=18.94%, t=0~1.3s 구간 고정)를 별도로 확인해 오버레이 위치에 반영
- 스크롤이 이 지점(`PHASE_V11_END`=0.626308)에 처음 도달하면: (a) wheel/touchmove/방향키를 가로채 스크롤을 물리적으로 잠그고, (b) 실제 스크롤 위치도 정확히 이 지점으로 스냅해 "고정된 화면"을 만들고, (c) 점멸하는 흰색 원 + 얇은 링 + "LIGHT THE TORCH" 텍스트(둘 다 CSS `@keyframes` 점멸 애니메이션)를 페이드인
- 원을 클릭하면 GSAP 타임 기반 트윈(스크롤 기반이 아님)으로 영상이 t=0→2.35s까지 재생되어 점화 후 안정적으로 타오르는 프레임에서 다시 정지 — 밝기 포렌식(ffmpeg/PIL mean-gray 0.1초 단위 샘플링: t=1.9s에서 피크 33.25 확인)으로 가장 밝은 "점화 섬광" 프레임이 아니라 그 이후 안정적으로 타오르는 프레임(t=2.3~2.5s, 밝기 ~20-25)을 목표 지점으로 선정
- 트윈 완료 시 스크롤 잠금 해제 + 실제 스크롤 위치를 목표 지점으로 동기화 → 이후 남은 체인(v12 나머지→v13→...→v16)은 다시 완전히 스크롤 스크럽 방식으로 재생됨
- 스크롤을 다시 게이트 지점 위로 올리면 상태가 초기화되어, 다시 내려오면 게이트가 재작동함(무한 반복 가능)

**1-1) 횃불 상승 진입(rise-up entrance) — 개정 (사용자 피드백: "첫번째 이미지, 컷 투로 바로 붙는 게 아니고, 토치도 화면 아래서부터 스크롤다운에 반응하면서 올라와야지")**:
- 기존에는 v11→v12 전환이 순수 opacity 하드컷(v12가 이미 최종 위치에 놓인 채 opacity 0→1로 즉시 등장)이라 "컷 투로 바로 붙는" 느낌이 있었음
- v11의 스크롤 구간 꼬리(`RISE_START` = `GATE_PROGRESS - 0.03`)부터 게이트가 실제로 arm되는 지점(`RISE_END` = `GATE_PROGRESS` = `PHASE_V11_END`)까지, v12를 v11 위에 stack(z-index로만 겹침, opacity 블렌딩 없음)한 뒤 `translateY(yPercent)`를 100%(화면 완전 아래)→0%(제자리)로 스크롤 진행률의 연속 함수로 애니메이션 — 횃불이 실제로 화면 아래에서 스크롤다운에 반응하며 솟아오르는 것처럼 보임
- v12는 이 구간 내내 완전 불투명(opacity:1)이며, 아직 덮지 못한 부분은 그 아래 v11의 프레임이 그대로 보임(알파 블렌딩 없음 → "디졸브 아님" 원칙 유지, 두 클립 사이 크로스페이드가 아니라 위치 이동에 의한 자연스러운 가림)
- 스크롤을 다시 올리면 `yPercent`가 그대로 역산되어 횃불이 화면 아래로 다시 가라앉음(완전히 가역적) — 이 상승 애니메이션이 끝나야만(= `RISE_END` 도달) 게이트 arm(스크롤 잠금 + 점멸 원/CTA 표시)이 실행됨

**2) "You are now connected with my work" 인터랙티브 리빌** — `videos-bg-13.mp4`(사진작가 리빌 장면, 사용자의 두번째 첨부 스크린샷과 일치)의 로컬 진행률(`local13`)에 직접 연동:
- 밝기 포렌식(t=0-1s 평탄 ~16 → t=1.5s부터 상승 → t=2.0s에서 피크 24.16, 사진작가가 완전히 선명하게 드러나는 지점)을 바탕으로 `local13` 0.25→0.4167(t=1.5s→2.5s) 구간에서 텍스트가 나타나고, 0.82→0.96 구간에서 다시 사라짐
- 고정 타이머가 아니라 **스크롤 진행률(p)의 연속 함수**로 opacity/transform을 계산하므로, 스크롤을 위아래로 오가면 텍스트도 실시간으로 나타났다 사라졌다 반응함(진짜 "인터랙티브" 리빌 — 다른 모든 스크롤 연동 효과와 동일한 원칙)

**2-1) 개정 (사용자 피드백: "두번째 이미지, 문장 마지막에 마침표를 없애주고, 더 인터랙티브하게 만들어줘")**:
- 문장 끝의 마침표 제거: "You are now connected with my work." → "You are now connected with my work" (마침표 없음)
- 기존에는 문단 전체가 하나의 블록으로 페이드인/아웃(opacity + translateY 26px)했으나, 이를 단어별 스태거 리빌로 교체 — `work-reel` 섹션의 `.wr-word` 패턴과 동일한 구조(`.vc-word` span 7개)를 적용
- 각 단어는 `co`(전체 in/out envelope, 0..1) 위에서 자신만의 겹치는 서브구간(band)을 가지며, blur(6px→0) + translateY(22px→0) + scale(0.94→1) + opacity(0→1)를 동시에 애니메이션 — 왼쪽부터 순서대로 하나씩 선명해지며 문장이 "조립"되고, exit 구간에서는 동일한 순서로 다시 "해체"됨. 여전히 스크롤 진행률의 순수 함수라 스크롤을 위아래로 오가면 실시간으로 반응/역재생됨

**3) "This is where my stories catch fire" 인터랙티브 리빌** — `videos-bg-14.mp4`(모닥불이 격렬하게 타오르는 장면, 사용자의 세번째 첨부 스크린샷과 일치)의 로컬 진행률(`local14`)에 직접 연동. 사용자 요청("이때부터 Have a story worth filming? Let's make it real 를 인터랙티브 요소를 많이 가미해서 넣으려고해. 근데 이 문구말고, 포트폴리오와 포트폴리오 분위기에 맞는 다른 문구가 있을까?")에 따라, 원래 제안된 문구는 광고/CTA 톤이라 이 사이트의 조용한 1인칭 내레이션 톤("You are now connected with my work")과 맞지 않는다고 판단해 5개의 대안 문구를 제시했고, 그중 실제 화면의 불(fire)을 직접적인 은유로 활용할 수 있는 "This is where stories catch fire"를 1차로 추천 — 문법/자연스러움을 재확인("이게 문법에 맞고, 북미에서 쓰는 말이야?")했으나, 이후 사용자 피드백("공간보다는 내가 중점이 돼야 될 거 같은데" → "공간보다는 내가 중점이 돼어 불과 관련시켜야될 거 같은데")에 따라 화자(1인칭 "나")가 문장에서 더 뚜렷하게 드러나야 한다는 방향으로 재조정. "I catch fire here" / "Here, I catch fire" / "I am the fire in every story" 등 주어를 "I"로 세운 대안도 제시했으나, 최종적으로 사용자가 **"This is where my stories catch fire"**(기존 문구에 소유격 "my" 추가, 앞 문장 "my work"와의 1인칭 연결성 유지)로 확정:
- 정밀 프레임 포렌식(ffmpeg으로 `videos-bg-14.mp4`의 144프레임 중 12프레임 간격 샘플링 + 그리드 비교)으로, 사진작가→모닥불 전환 시 발생하는 모션 블러 구간(`local14` 0~약 0.17)이 끝나고 안정적으로 타오르는 고립된 모닥불 장면(숲/밤하늘 요소 없음, 사용자 스크린샷과 정확히 일치)이 유지되는 구간(`local14` 약 0.22~0.90, `videos-bg-15.mp4`에서 숲/은하수가 드러나기 전)을 확인
- `local14` 0.22→0.40 구간에서 단어별로 순차 등장(assemble), 0.78→0.92 구간에서 역순으로 사라짐(disassemble) — "connected" 텍스트와 동일한 `.vc-word`/`.wr-word` 구조 원칙을 따르는 신규 `.cf-word` span 7개(`#videos-catchfire-text`, "This/is/where/my/stories/catch/fire")
- **"더 인터랙티브하게" 추가 요소**: 마지막 단어 "fire"가 완전히 조립되면(스크롤 진행률 기반 boolean, 타이머 아님) `.cf-word--ember` + `is-ablaze` 클래스가 토글되어 흰색 텍스트가 불꽃색(주황)으로 은은하게 발광(`text-shadow` pulse `@keyframes`)하기 시작 — 실제 화면 속 불과 시각적으로 공명하는 디테일. 스크롤을 다시 올려 "fire" 단어가 다시 흐려지면 즉시 클래스가 제거되어 발광도 꺼짐(완전히 가역적)
- 역시 고정 타이머가 아니라 스크롤 진행률(`local14`)의 순수 연속 함수이므로 스크롤을 위아래로 오가면 실시간으로 반응/역재생됨 (Playwright로 순방향/역방향 각 17개 지점 샘플링해 완전 일치 확인, 단어별 opacity가 IN 구간에서 단조 비감소함도 확인, 기존 게이트/rise-up/connected-text 로직과의 상호 간섭 없음도 별도 확인)

**4) "JUNE HONG" 레터 스태거 인터랙티브 리빌** — `videos-bg-15.mp4`(모닥불 카메라가 풀백되어 숲과 은하수 전경이 완전히 드러나는 장면, 사용자의 네번째 첨부 스크린샷과 일치)의 로컬 진행률(`local15`)에 직접 연동. 사용자 요청("첨부한 이미지를 분석해, 이 구간부터 JUNE HONG을 인터랙티브 요소를 가미해 넣어보자")에 따라, 헤더에 항상 고정 표시되는 정적 브랜드 링크(`<a class="brand">JUNE HONG</a>`)와 별개로, 이 와이드 뷰 구간에서 이름 자체가 화면 전체를 덮는 극적인 "타이틀 카드" 순간으로 다시 한 번 등장하도록 새 오버레이를 추가:
- 정밀 프레임 포렌식(ffmpeg으로 `videos-bg-15.mp4`의 144프레임을 12프레임 간격 → 이후 전환 구간(프레임 55~110)을 5프레임 간격으로, 최종적으로 전환 경계 프레임 56~66을 1프레임 단위로 3단계에 걸쳐 정밀 샘플링)으로 확인한 결과: `local15` 0~0.42는 아직 어두운 배경 위 모닥불만 보이는 기존 catchfire-text 구간의 연장이고, 0.42~0.46 사이에서 숲 실루엣이 먼저 드러난 뒤 은하수가 이어서 나타나며, **0.46부터 클립이 끝날 때까지(1.0)는 모닥불+숲+은하수가 안정적으로 고정된 채 유지**됨(카메라 거의 정지, 사용자 스크린샷과 정확히 일치). `videos-bg-15.mp4` 끝과 `videos-bg-16.mp4` 시작(`local16` 0~0.17)이 같은 장면의 연속임도 확인했으나, `local16` 0.25~0.33부터 카메라가 모닥불에서 멀어져 은하수만 남는 별도의 "피날레" 장면으로 전환되므로, 새 리빌은 `local15` 쪽에 배치
- `local15` 0.46→0.62 구간에서 글자별로 순차 등장, 0.82→0.94 구간(v15→v16 컷 직전 여유 마진 포함)에서 역순으로 사라짐
- 사용자가 명시적으로 선택한 방식("레터 스태거로 가줘")에 따라, 기존 두 텍스트(`.vc-word`/`.cf-word`, 단어 단위)와 달리 **"J-U-N-E(space)H-O-N-G" 9글자 각각을 별도의 `.jh-letter` span으로 분리**해 한 글자씩 순서대로 나타나는 방식 적용(`#videos-junehong-text`) — 이름을 강조하는 "서명/타이틀 카드"에 어울리는 톤
- 헤더 브랜드 로고와 동일한 서체(`--font-clean`, Jost 계열)와 대문자 표기를 그대로 사용하되, 화면 전체를 덮는 대형 사이즈(`clamp(36px, 8vw, 108px)`)와 넓은 자간(`0.34em`)으로 확대 — 두 개의 세리프(Fraunces) 문장형 텍스트와는 톤을 구분해 "이름"임이 시각적으로 명확하게 구분됨
- 각 글자가 완전히 조립되면(`is-lit` 클래스, 스크롤 진행률 기반 boolean) 은은한 골드 계열(`rgba(255,201,77,...)`) 글로우가 더해져 별빛/모닥불과 시각적으로 공명 — 스크롤을 올려 다시 흐려지면 즉시 클래스 제거(완전히 가역적)
- 역시 고정 타이머가 아니라 스크롤 진행률(`local15`)의 순수 연속 함수이므로 스크롤을 위아래로 오가면 실시간으로 반응/역재생됨(Playwright로 순방향/역방향 각 11개 지점 샘플링해 완전 일치 확인, 글자별 opacity가 IN 구간에서 단조 비감소함도 확인, 기존 게이트/connected-text/catchfire-text 로직과의 상호 간섭 없음도 별도 확인 — `local15=0.6` 샘플 시점에 catchfire/connected 오버레이 opacity가 모두 0임을 검증)

**코드 변경**:
- `src/pages/home.html`: `#ignite-gate`(원+링+CTA 텍스트), `#videos-connected-text`(단어별 `.vc-word` span 7개, 마침표 없음), `#videos-catchfire-text`(단어별 `.cf-word` span 7개, 마지막 단어에 `.cf-word--ember` 클래스), `#videos-junehong-text`(글자별 `.jh-letter` span 9개, 공백 span에 `.jh-space` 클래스) 오버레이 마크업 추가 (`#videos-bg-video-layer` 바로 뒤, `<main>` 앞)
- `public/static/style.css`: `#ignite-gate`/`.ignite-gate-ring`/`.ignite-gate-orb`/`#ignite-gate-cta`(+ `igniteGateFlicker` keyframes), `#videos-connected-text`/`.vc-word` 스타일, `#videos-catchfire-text`/`.cf-word`/`.cf-word--ember`(+ `catchfireEmberPulse` keyframes) 스타일, `#videos-junehong-text`/`.jh-letter`/`.jh-space`(+ `.is-lit` 글로우) 스타일, `.videos-bg-video-el`에 `transform` will-change 추가
- `public/static/app.js`: `setupVideosBgVideo()` 내부에 게이트 상태 머신(`armGate`/`igniteTorch`/`handleVideosProgress`, `idle→armed→igniting→released` 상태), `RISE_START`/`RISE_END` 기반 v12 상승 진입 transform 로직, `renderVideosChain()`에 "connected" 텍스트/"catch fire" 텍스트 단어별 스태거 리빌 계산 로직(+ ember 발광 클래스 토글) 및 "JUNE HONG" 글자별 스태거 리빌 계산 로직(+ `is-lit` 글로우 클래스 토글) 추가. 기존 하드컷 렌더링 로직(`seek()`, opacity 바이너리 전환)은 전혀 변경하지 않음 — 게이트/상승 진입/텍스트 리빌은 어디까지나 오버레이 상태로만 개입, 비디오 체인 자체의 하드컷 원칙은 그대로 유지

**5) 마지막 프레임 홀드 버그 수정 + 클로징 Footer(라인 스태거) 추가** — 사용자가 첫번째 첨부 이미지(모닥불 없이 은하수만 가득한 순수 야경, `videos-bg-16.mp4`의 실제 피날레 프레임과 일치)와 함께 "마지막 영상에서 마지막 프레임을 홀드해줘 ... © 2026. JUNE HONG - HONG JOONSEONG / pseudofilmmaker@gmail.com / +1 236 866 6081 / About June Hong, VIDEO and PHOTO, Vancouver, CANADA 해서 이걸 footer로 박아줘. 마지막 프레임에 닿기 전에, 스크롤에 반응하면서 나오게끔해줘"라고 요청한 내용을 반영:

- **프레임 포렌식**: ffmpeg 다단계 샘플링(`-sseof`로 마지막 0.3s, 전체 0-6s 균등 샘플링, 전환 구간 정밀 재샘플링)으로 `videos-bg-16.mp4`의 콘텐츠 타임라인을 확인 — 모닥불+숲(t=0-1s) → 숲 실루엣+은하수 전환(t=1.5-2s) → **모닥불 없이 은하수만 안정적으로 유지되는 순수 야경 피날레(t≈2.0-2.5s부터 클립 끝 t=6.0s까지)**가 사용자의 첫번째 첨부 이미지와 정확히 일치함을 확인. Footer 리빌 타이밍(`local16` 0.72~0.88 → t=4.32~5.28s)을 이 안정 구간 안쪽에 배치.

- **마지막 프레임 홀드 버그 원인 및 수정**: 스크롤이 문서 최하단(진행률=1.0)에 도달하면 배경 영상 레이어가 얼어붙은 마지막 프레임이 아니라 완전히 까맣게(opacity:0) 꺼지는 버그를 발견. 원인은 영상 엘리먼트 자체가 아니라(격리 테스트로 `currentTime`/`ended`/`readyState`가 duration 이상 seek 시 모두 올바르게 클램프됨을 확인), VIDEOS 체인 전체를 구동하는 단일 `mainST` ScrollTrigger의 `onUpdate`/`onRefresh`/`onLeave` 콜백이 레이어 표시 여부를 `self.isActive` 하나에만 의존했기 때문 — GSAP은 이 트리거의 **시작 이전(progress=0)** 과 **종료 이후(progress=1, 즉 진짜 문서 맨 끝)** 를 모두 동일하게 `isActive:false`로 보고해 구분이 안 됨. `self.progress >= 1`(종료 이후) 케이스를 별도로 체크해 이때도 레이어를 계속 표시하도록 수정하고, `onLeave`의 무조건적 `opacity:0` 강제도 제거(`onLeaveBack`는 섹션-5 진입 이전으로 스크롤을 올릴 때의 정상적인 리셋 동작이므로 변경하지 않음).

- **클로징 Footer**: `#videos-footer-text`(z-index 18, `#videos-junehong-text` 바로 다음 신규 오버레이)에 4줄(`.vf-line`) 마크업 추가 — ①`© 2026 JUNE HONG — HONG JOONSEONG`(브랜드 라인, 강조 스타일), ②`mailto:pseudofilmmaker@gmail.com` 링크, ③`tel:+12368666081` 링크, ④`About June Hong, VIDEO and PHOTO, Vancouver, CANADA`. 기존 4개 스태거 오버레이(`.wr-word`/`.vc-word`/`.cf-word`/`.jh-letter`)와 동일한 "envelope + 아이템별 band" 수학 패턴을 **라인 단위**로 적용(`.vf-line` 4개), `local16` 0.72→0.88 구간에서 순차 등장. 단, 나머지 오버레이들은 모두 등장(IN) 후 다시 사라지는(OUT) "일시적 순간" 연출인 반면, Footer는 **영구적인 연락처 정보**이므로 의도적으로 OUT 구간 없이 한 번 나타나면 `local16=1`(문서 맨 끝) 이후까지도 계속 유지됨. 이메일/전화 `<a>` 태그에만 `pointer-events: auto`를 되살려(부모 오버레이 및 나머지 `.vf-line`은 기존 관례대로 `pointer-events: none` 유지) 리빌된 후 실제로 클릭 가능하게 함.

- **코드 변경**:
  - `src/pages/home.html`: `#videos-footer-text`(4개 `.vf-line`) 오버레이 마크업을 `#videos-junehong-text` 바로 뒤에 추가
  - `public/static/style.css`: `#videos-footer-text`/`.vf-inner`/`.vf-line`/`.vf-line[data-line="0"]`/`.vf-line a`(+ hover) 스타일 및 모바일 미디어쿼리 추가
  - `public/static/app.js`: `footerEl`/`footerLines` 엘리먼트 참조 추가, `renderVideosChain()`에 `local16` 기반 footer 라인 스태거 렌더 블록 추가(OUT 구간 없음), `mainST`의 `onUpdate`/`onRefresh`를 `self.isActive || self.progress >= 1`로 수정하고 `onLeave`의 강제 `opacity:0` 제거(마지막 프레임 홀드 버그 근본 수정)
- **검증**: Playwright로 순방향/역방향 각 13개 지점 스윕(진행률 0.9→1.0) — 마지막 프레임 홀드(진행률=1.0에서 `layerOpacity`="1", `v16CurrentTime`=6, 더 이상 블랙 화면 아님), footer 라인별 스태거 타이밍, 완전한 가역성(정방향/역방향 완전히 대칭), 기존 `junehongEl`/`catchfireEl`과의 상호 간섭 없음, 콘솔 에러 없음을 모두 확인. 스크린샷 3장(진행률 0.96/0.985/1.0)으로 footer 미노출→부분 리빌(라인별 순차)→완전 리빌+마지막 프레임 홀드를 시각적으로도 재확인.

## 헤더 페더링 + 점화 게이트 불씨 제거 + 역스크롤 대칭성 수정 (완료)
사용자가 스크린샷 2장과 함께 지적한 3가지 문제를 진단·수정:

1. **상단 고정 헤더에 feather(페더링)가 없어 어색함**: `#site-header`의 기존 그라디언트가 헤더 자체 높이(76px) 안에 압축되어 있어, 밝고 대비가 강한 별이 총총한 은하수 배경 위에서는 부드러운 페더링이 아니라 뚝 끊기는 경계선처럼 보임(understand_images 분석 + 직접 픽셀 샘플링으로 확인). **1차 수정(반려됨)**: 헤더 바로 아래에 `#header-feather`라는 별도의 넓은 페이드 레이어(18vh, 최소 130px)를 추가해봤으나, 사용자가 스크린샷으로 재확인한 결과 이 페이드 레이어 자체가 밝은 횃불/불씨 장면 위에서 회색으로 뜬 어색한 띠처럼 보임을 지적("차라리 그냥 투명하게 처리하는 게 나을 거 같은데?"). **최종 수정**: `#header-feather` 레이어를 완전히 제거하고, `#site-header` 자체의 배경(그라디언트)과 `backdrop-filter`를 모두 없애 완전 투명하게 처리 — 대신 브랜드 로고/내비 링크 텍스트에 `text-shadow`(이 사이트에서 이미 `#ignite-gate-cta`에 쓰던 것과 동일한 기법)를 적용해, 어떤 배경(어두운 히어로/밝은 불꽃/별이 총총한 은하수) 위에서도 가독성을 확보. 오버레이 자체가 없으므로 어색한 띠가 생길 여지가 사라짐.
2. **점화 게이트(LIGHT THE TORCH) 화면 좌측 하단의 불씨**: ffmpeg/PIL로 원본 소스 영상 `videos-bg-12.mp4`를 프레임 단위로 정밀 분석한 결과, 정확히 t=0.0 지점에만 존재하는 렌즈/센서 결함(빨간/분홍 대각선 스트릭)을 발견 — t=0.05부터 t=1.45까지는 완전히 사라짐. 게이트가 정확히 `local12=0`(=t=0.0) 프레임에서 화면을 고정(hold)하고 있었기 때문에 이 결함 프레임이 그대로 노출된 것. **수정**: `renderVideosChain()`에서 `local12`에 최소값(t=0.1s 상당)을 두어, 체인 전체(일반 스크롤·게이트 고정·점화 트윈 시작 순간 포함)에서 절대 t=0.0 프레임이 렌더링되지 않도록 함 — 토치의 시각적 모습은 t=0.1s에서도 동일(완전히 꺼진 상태 유지)하므로 부작용 없음.
3. **스크롤 업(되감기) 시 스크롤 다운의 역순으로 나오지 않는 문제**: Playwright로 정방향/역방향 진행률 스윕 테스트를 실행해 근본 원인을 확정 — `igniteTorch()`가 추가한 `is-igniting` CSS 클래스가 `gateState`가 `'released'`에서 `'idle'`로 리셋될 때(스크롤을 게이트 지점 위로 다시 올렸을 때) 전혀 제거되지 않아, 사용자가 위로 스크롤해도 게이트 요소가 계속 점화 후 모습(투명도 0, `is-igniting` 클래스)으로 DOM에 남아있었음(다음번에 다시 아래로 스크롤해 `armGate()`가 호출될 때만 우연히 정리됨). **수정**: `handleVideosProgress()`의 `'released'→'idle'` 리셋 분기에서 `gateEl`의 클래스(`is-igniting`, `is-armed`)와 투명도(0)를 명시적으로 초기화하도록 추가 — 이제 스크롤 업 시 게이트가 정확히 "한 번도 도달한 적 없는" 원래 모습(완전히 보이지 않음)으로 즉시 되돌아감.

- **코드 변경**:
  - `src/pages/home.html`: (1차 시도였던 `<div id="header-feather">`는 추가 후 제거) 최종적으로 헤더 마크업 자체는 원본과 동일하게 유지
  - `public/static/style.css`: `#header-feather` 규칙은 도입 후 완전히 삭제; `#site-header`를 `background: transparent`로 변경하고 `backdrop-filter` 제거, `#site-header .brand`/`.main-nav a`에 `text-shadow: 0 1px 4px rgba(0,0,0,.85), 0 0 16px rgba(0,0,0,.6)` 추가
  - `public/static/app.js`: `renderVideosChain()` 내부에 `GATE_HOLD_LOCAL12`(=0.1s 상당) 플로어를 도입해 `local12`가 절대 결함 프레임(t=0)에 닿지 않도록 수정; `handleVideosProgress()`의 게이트 리셋 분기에 `gateEl.classList.remove('is-igniting','is-armed')` + `gsap.set(gateEl,{opacity:0})` 추가
- **검증**: Playwright로 실제 마우스 휠 스크롤을 시뮬레이션해 게이트 진입(armed) → 클릭 점화 → 역스크롤까지 전 과정을 샘플링. 결과: armed 상태에서 `v12Time`이 기존 `0.000`(불씨 노출)에서 `0.1`(불씨 없음)로 확인; 점화 후 역스크롤 완료 시점에 `gateClasses`가 기존 `"is-igniting"`(고착)에서 `""`(완전 초기화), `gateOpacity`가 `"0"`으로 정상 확인. 투명 헤더는 어두운 히어로(페이지 최상단)/밝은 불꽃 장면(스크롤 2200px)/별이 총총한 은하수 파이널(진행률 0.95) 세 지점 모두에서 스크린샷으로 재확인 — 어떤 배경에서도 헤더 텍스트가 또렷이 읽히고, 회색 띠나 경계선이 전혀 보이지 않음을 시각적으로 확인. 토치 장면(진행률 0.88/0.96)에서 투명 헤더와 불씨 제거 수정이 동시에 정상 동작함도 재확인.

## 워크릴(work-reel) 태그라인 가독성 수정 (완료)
사용자가 매치 헤드/불꽃 장면 스크린샷과 함께 지적: "글씨가 좀 더 잘 보여야될 거 같아. 다른 방법으로 부탁해" — SECTION 1과 SECTION 2 사이의 태그라인("directs, shoots, and edits brand films...")이 매치 헤드의 밝은 나무색/불꽃 배경 위에서 얇은 세리프체 + 낮은 투명도로만 표시되어 거의 안 보이는 문제.

- **원인**: `.wr-word`에 텍스트 그림자나 어두운 배경 처리가 전혀 없어, 배경이 밝을 때(매치 나무, 불꽃 중심부) 글자가 거의 완전히 묻힘 — 반면 배경이 상대적으로 어두운 부분("concept", "final color")만 조금 더 읽힘 (understand_images 분석으로 확인).
- **수정**: 헤더 투명화 때와 동일한 원칙(별도의 어두운 오버레이/스크림 레이어를 추가하면 밝은 배경 위에서 그 자체가 어색한 띠로 보일 위험 — 이 프로젝트에서 사용자가 이미 `#header-feather`를 반려한 전례) 아래, 오버레이 레이어 대신 각 단어에 `text-shadow`(`0 1px 5px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.7)`)를 직접 적용 — `#site-header`/`#ignite-gate-cta`와 동일한 기법. 기존의 "읽기 스포트라이트"(단어별 opacity/color/scale 스윕) 애니메이션 로직은 그대로 유지.
- **코드 변경**: `public/static/style.css`의 `.wr-word` 규칙에 `text-shadow` 한 줄 추가 (app.js/home.html 변경 없음).
- **검증**: Playwright로 work-reel 핀 구간의 3개 지점(진행률 0.15/0.3/0.45)에서 스크린샷 확인 — 밝은 매치 나무, 불꽃 한가운데, 어두운 배경 등 모든 배경 밝기에서 텍스트가 또렷이 읽힘을 시각적으로 확인.

## 은하수 피날레 스크롤 홀드 + Footer 마지막 줄 텍스트 축약 (완료, 홀드 지점 1차 수정 반영)
사용자가 스크린샷 2장과 함께 요청: "첫번째 첨부한 이미지에서 홀드를 걸어줘. 두번째 이미지, 푸터에서 About June. Hong, VIDEO and PHOTO,를 제거해줘."

1. **스크롤 홀드 (수정됨 — 최종 기준: "카메라가 좌측으로 꺾이기 직전")**: 최초 구현은 "JUNE HONG 레터 리빌과 footer 사이의 텍스트-없는 빈 구간"을 기준으로 `t≈2.4s`(`local16≈0.4648`)에 홀드를 걸었으나, 사용자가 "카메라 앵글이 좌측으로 꺾여서, 꺾이기 전에 끝내자는 말이었다"고 정정 — 실제 의도는 `videos-bg-16.mp4`에서 카메라가 좌측으로 팬(pan)하기 **직전**의 프레임에서 멈추는 것이었습니다.
   - **재분석**: `ffmpeg`로 원본 6초 클립을 24fps 전체(144프레임) 추출한 뒤, (a) 지평선 발광점(orange glow)의 프레임별 x좌표 추적 — `t≈1.75s~3.29s` 구간은 화면 폭의 약 53.7~54.5%에서 완전히 고정되어 있다가 `t≈3.33s`부터 급격히 우측으로 이동(56%→62%→72%→96%, `t=5.5s`까지) — 발광점이 화면 안에서 우측으로 흐르는 것은 카메라가 좌측으로 팬할 때 나타나는 전형적 시각 신호, (b) 은하수 코어를 템플릿 매칭으로 추적한 결과도 `t≈3.0s` 부근부터 좌측 드리프트 시작으로 일치, (c) `analyze_media_content`(AI 영상 분석)에도 독립적으로 "좌측 팬 시작 시점 ≈00:03.1"이라는 결과를 받아 교차검증. 세 방법 모두 카메라가 `t≈1.75s~3.29s` 동안 완전히 고정되어 있다가 `t≈3.3s` 전후로 좌측 팬이 시작됨을 일관되게 가리켜, 안정 구간 안쪽이면서 팬 시작 직전인 **`t=3.0s`(`local16=0.5`)**를 최종 홀드 지점으로 확정했습니다.
   - **구현**: `renderVideosChain()`의 `local16` 클램프 로직(`GATE_HOLD_LOCAL12`와 동일한 "clamp, don't truncate" 패턴) 자체는 그대로 두고, 경계값만 수정 — `SCENE_HOLD_START`를 `0.40`→`0.5`(`t=2.4s`→`t=3.0s`), `SCENE_HOLD_END`를 `0.62`→`0.7`(`t=3.72s`→`t=4.2s`)로 변경. 홀드 구간 동안 `local16`을 진입 시점 값(`SCENE_HOLD_START`)에 고정하고, 이후 나머지 진행률을 (`SCENE_HOLD_START`→1.0) 범위로 리매핑해 footer 리빌까지 끊김 없이 이어지는 동작은 이전과 동일합니다.
   - **빌드 상태**: 코드 수정 및 `npm run build`/PM2 재시작까지 완료, 로컬 개발 서버에 반영됨. **주의**: 이번 세그먼트에서 Playwright 자동 검증(게이트 점화 → 스크롤 진행률별 프레임 확인)을 재시도했으나, headless 환경에서 점화 인터랙션이 안정적으로 완료되지 않아 자동화 스크립트로는 최종 시각 확인을 마치지 못했습니다. 실제 브라우저에서 직접 스크롤해 홀드 지점의 화면이 첨부 이미지(치조 낮고 얇은 실루엣, 대각선 은하수, 중앙 부근 발광)와 일치하는지 확인이 필요합니다.
2. **Footer 마지막 줄 텍스트 축약**: 두번째 첨부 이미지에서 지적된 대로, `#videos-footer-text`의 4번째 줄(`data-line="3"`)에서 "About June Hong, VIDEO and PHOTO," 부분을 제거하고 "Vancouver, CANADA"만 남기도록 `src/pages/home.html` 마크업을 수정 — 이 부분은 이번 수정과 무관하게 그대로 유지됩니다.
- **코드 변경**:
  - `public/static/app.js`: `renderVideosChain()`의 `local16` 계산에서 `SCENE_HOLD_START`(0.40→0.5)/`SCENE_HOLD_END`(0.62→0.7) 값과 설명 주석을 "좌측 팬 직전 지점" 기준으로 수정 (클램프 메커니즘 자체는 변경 없음)
  - `src/pages/home.html`: `#videos-footer-text`의 `data-line="3"` 텍스트를 `About June Hong, VIDEO and PHOTO, Vancouver, CANADA` → `Vancouver, CANADA`로 축약 (이전 세그먼트에서 완료, 변경 없음)

## 다음 단계 (Not Yet Implemented)
- 실제 Cloudflare Pages 프로덕션 배포
- `photoCards`, `landscapeVideos`, `reelVideos`, `videosIntroThumb`, `splitPhoto` 등 media-config.js의 빈 슬롯에 실제 콘텐츠 채우기 (현재는 placeholder만 표시됨 — 원본 사이트도 동일 상태)
- ABOUT ME 섹션 콘텐츠 (원본 사이트에도 별도 섹션 마크업은 없고 헤더 링크만 존재, `/#section-2`로 연결됨)
