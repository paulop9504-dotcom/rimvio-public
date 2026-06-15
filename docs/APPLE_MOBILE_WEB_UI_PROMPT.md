# Apple-style 모바일 웹 UI 디자인 프롬프트

Rimvio·마케팅·디자인 레퍼런스용 **모바일 웹 스크린샷** 생성 가이드.  
코드: `lib/design/apple-mobile-web-ui-prompt.ts`

---

## 핵심 스타일 및 레이아웃

- **스타일:** 현대적·미니멀 모바일 웹 UI 스크린샷. 흰 배경, 둥근 모서리 대형 콘텐츠 카드, 굵고 선명한 산세리프 한국어.
- **레이아웃:** 상단 고정 헤더 → 대형 캐러셀 카드(둥근 모서리) → 하단 탐색 바.

---

## 공통 요소 (고정)

| 요소 | 내용 |
|------|------|
| 상태 바 | iOS 표준 (시간 15:19, 신호, Wi-Fi, 배터리 85%) |
| 헤더 | 한국어 태그라인 (Apple 예: *Apple 경험. Apple 제품 및 서비스로…* / Rimvio: *Rimvio 경험. 링크 한 번으로…*) |
| 아바타 | 카드 **우하단** — `image_0.png`와 동일한 미소 남성 프로필 |
| 하단 내비 | 왼쪽 `<` 원형 버튼 · 중앙 URL 바 · 오른쪽 `…` 원형 버튼 |

레퍼런스 시트: `image_0.png` … `image_4.png`

---

## 프롬프트 구성

1. **구조** — 모바일 UI 스크린샷, 공통 요소 위치 고정  
2. **카드** — 흰 배경, 대형 둥근 카드  
3. **텍스트** — 카테고리(작·회색) → 제목(크·굵게) → 본문(작게), 모두 한국어  
4. **그래픽** — 제품 스택 / 앱 아이콘 / 실사용 장면 중 주제에 맞게 선택  
5. **디테일** — 제목 일부 그라데이션(blue→green), 부드러운 조명·파티클  

---

## 예시 1: 「창의성」 카드

```
Mimicking the UI of image_0.png to image_4.png. Below the standard header is a single
large rounded-corner card on a white background. Inside this card, at the top in smaller
grey text, is the category "창의성". Below it, the large, bold Korean main title reads
"당신의 상상력을 현실로." The title '상상력' uses a subtle blue-to-green gradient.
Below the title is a brief paragraph: "최고의 도구로 아이디어를 스케치하고 완성하세요."
The graphic is a close-up of a hand using Apple Pencil to draw a stylized tree of
lightbulbs on an iPad, with soft light particles. At the bottom right corner of the card
is the male avatar from the reference images. Below the card is the full standard
navigation bar with 'apple.com'.
```

TypeScript:

```ts
import { buildPresetAppleMobileWebPrompt } from "@/lib/design/apple-mobile-web-ui-prompt";

buildPresetAppleMobileWebPrompt("creativity"); // brand: "apple" (default)
buildPresetAppleMobileWebPrompt("rimvioAction", { brand: "rimvio" });
```

---

## 나만의 카드 만들기

| 단계 | 수정 |
|------|------|
| 1. 카테고리 | 창의성 → 연결성 · 생산성 · 엔터테인먼트 · 실행 |
| 2. 제목·본문 | 주제에 맞는 한국어 카피 |
| 3. 그래픽 | 예: AirPods+악보, iPhone 촬영, Mac 타임라인 편집 |

```ts
import { buildAppleMobileWebCardPrompt } from "@/lib/design/apple-mobile-web-ui-prompt";

buildAppleMobileWebCardPrompt({
  category: "연결성",
  title: "세상과 더 가깝게.",
  titleGradientWord: "가깝게",
  body: "메시지와 영상이 한 흐름으로 이어집니다.",
  graphic: "iPhone showing a video call with soft bokeh and floating bubbles.",
  urlBar: "rimvio.app",
}, { brand: "rimvio" });
```

---

## 프리셋 목록

| 키 | 카테고리 | 용도 |
|----|----------|------|
| `creativity` | 창의성 | Apple Pencil / iPad |
| `connectivity` | 연결성 | 영상 통화·메시지 |
| `productivity` | 생산성 | Mac + iPhone 작업 |
| `entertainment` | 엔터테인먼트 | AirPods·공간 음향 |
| `rimvioAction` | 실행 | Rimvio Feed / Action Card |
| `foodPhoto` | 맛집 | 음식 사진이 카드 하단 그래픽 |

---

## 음식 사진 카드에 쓸 때

**결론: 카드 구조만 가져오면 깔끔해집니다.** 브라우저 크롬(상태 바·`apple.com` 바·아바타)은 마케팅 목업용이고, 앱 안 맛집 카드에는 **흰 둥근 카드 + 타이포 위계 + 안쪽 음식 사진**만 쓰는 게 좋습니다.

| 지금 (Instagram형) | Apple형으로 바꿀 때 |
|--------------------|---------------------|
| 어두운 정사각 풀블리드 | 흰 카드 안에 사진 inset |
| 오버레이 화살표·검은 뱃지 | 카드 아래 점·얇은 캡션 |
| 장소명이 사진 아래만 | 카테고리 → 제목 → 한 줄 설명 → 사진 |

```ts
import { buildFoodPhotoCardUiPrompt } from "@/lib/design/apple-mobile-web-ui-prompt";

buildFoodPhotoCardUiPrompt({
  placeName: "쿠우쿠우 도안점",
  category: "뷔페",
  dishDescription: "랍스터 구이 · 샐러드 바",
  photoCount: 6,
});
```

주의: 원본 사진 품질·조명이 들쭉날쭉하면 흰 카드 + 얇은 border(`border-black/6`)로 정리하는 편이 낫습니다.

---

## 연동 위치

- **디자인 Smart Suite** — Action Card 「📱 모바일 UI 목업」
- **Cursor** — `.cursor/rules/apple-mobile-ui-prompt.mdc`
- **브랜드** — `docs/RIMVIO_BRAND.md` (시각 레퍼런스 링크)
