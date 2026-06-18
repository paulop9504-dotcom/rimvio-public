# Rimvio 브랜드 · 상표 가이드

> **Rimvio** (발음: 림비오) — *glance*에서, 한 번 훑어보고 바로 행동한다는 뜻.
>
> **2026-06 리브랜드:** 제품명 **Glango** → **Rimvio** (표기 **림비오**).

## 로고 에셋

| 파일 | 용도 |
|------|------|
| `public/rimvio-icon.svg` | PWA 아이콘, 앱 스플래시, 소셜 프로필 |
| `public/rimvio-wordmark.svg` | 가로형 로고 (눈 + Rimvio + 림비오 · glance) |
| `public/rimvio-mark.svg` | 상표 등록용 심볼 마크 (스마일) |
| `lib/brand/rimvio-smiley-mark.tsx` | **통일 SVG 소스** (모든 로고의 기준) |
| `components/rimvio-logo.tsx` | 앱 UI React 로고 |

### 디자인 특징 (통일 스마일 마크)

- **원형 얼굴** — 흰 배경 + 짙은 회색 테두리
- **동공형 눈** — 보라 링 + 진보라 동공 (이중 원)
- **아치 스마일** — 라이트 퍼플 곡선
- 단일 `RimvioSmileyMark` — UI·PWA·네비·워드마크 공통

## 컬러

| 역할 | 값 |
|------|-----|
| Primary gradient | `#8B5CF6` → `#D946EF` → `#6366F1` |
| Iris | `#7C3AED` / `#DDD6FE` |
| Background (아이콘) | `#0F172A` |
| Wordmark text | violet–fuchsia gradient |

## 타이포

- UI 워드마크: **Rimvio** — bold, tight tracking, gradient clip
- 한국어 애칭: **림비오** — caption 크기, muted

## 모바일 UI 목업 (Apple-style)

Feed·마케팅용 **iOS형 모바일 웹 스크린샷** 프롬프트:

- 가이드: [`APPLE_MOBILE_WEB_UI_PROMPT.md`](./APPLE_MOBILE_WEB_UI_PROMPT.md)
- 코드: `lib/design/apple-mobile-web-ui-prompt.ts` — `buildAppleMobileWebCardPrompt`, 프리셋 `rimvioAction`

## 사용 규칙

- ✅ 눈 마크 + **Rimvio** 워드마크 조합
- ✅ 단독 눈 아이콘 (favicon, 헤더 pill)
- ❌ Blink 명칭 혼용 (레거시 코드·스토리지 키 제외)
- ❌ 로고 비율 찌그러뜨리기, 그라데이션 임의 변경

## 상표 · 도메인 (출시 전 체크)

- **표장:** Rimvio + 눈 형태 로고 (오리지널 SVG, 외부 로고 복제 아님)
- **권장 검색:** KIPRIS · USPTO — "Rimvio" + Class 9/42 (앱·소프트웨어)
- **도메인:** `rimvio.app` (Beam URL·공유 기본값)
- **Beam URL:** `https://rimvio.app/s/{slug}`

## 앱 내 표기

- 영문: **Rimvio**
- 한국어 UI: **림비오** (필요 시 Rimvio · 림비오)
- 슬로건 (North Star): **Your Life, Operable.** / *당신의 모든 일상을 OS로 만듭니다*
- Ingress 카피: *링크·사진 공유로도 시작할 수 있어요*

## 코드

```ts
import { RIMVIO } from "@/lib/brand/rimvio";
// RIMVIO.name, RIMVIO.nameKo, RIMVIO.domain
```
