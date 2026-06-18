# Rimvio 브랜드 에셋

## 재생성

```powershell
npm run brand:all
```

- `brand:svgs` — 가벼운 SVG (아이콘·마크·워드마크 **Rimvio / 림비오**)
- `brand:transparent-logo` — UI용 투명 PNG
- `generate-pwa-icons` — PWA·Android·iOS PNG 아이콘

## 파일

| 경로 | 용도 |
|------|------|
| `public/rimvio-icon.svg` | PWA fallback |
| `public/rimvio-wordmark.svg` | 가로 로고 + **림비오 · glance** |
| `public/brand/rimvio-logo-source.png` | 마스터 (손/신경 마크) |
| `public/icons/icon-*.png` | 설치 아이콘 |

## 스토어 스크린샷

`public/store/*.png`는 **캡처 시점 UI**가 박혀 있습니다. Glango/블링크 문구가 보이면 앱 실행 후 화면을 다시 캡처해 교체하세요.

레거시 `glang-*.svg`, `blink-eye.svg`는 제거됨 — `rimvio-*`만 사용.
