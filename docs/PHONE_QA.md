# Rimvio 실기기 QA 체크리스트

> **대상:** iPhone Safari PWA · Android Chrome (홈 화면 추가)  
> **마지막 갱신:** 2026-05-25  
> **앱:** [rimvio.app](https://rimvio.app) 또는 Vercel preview URL

## 사전 준비

- [ ] iPhone: Safari → 공유 → **홈 화면에 추가** (standalone PWA)
- [ ] Android: Chrome → 메뉴 → **홈 화면에 추가**
- [ ] 테스트 링크 3개 준비: YouTube, 카카오맵/네이버지도, 쇼핑몰
- [ ] (선택) Supabase `.env` 연결 시 로그인·동기화도 함께 확인

---

## 1. 홈 피드 (`/`)

| # | 확인 | iPhone | Android | 메모 |
|---|------|--------|---------|------|
| 1 | 세로 스냅 — 위/아래로 다음·이전 카드 | ☐ | ☐ | |
| 2 | 첫 카드에만 카테고리 스토리 링 표시, 2번째부터 숨김 | ☐ | ☐ | |
| 3 | 카드 우측 액션 레일(공유·다음) 잘림 없음 | ☐ | ☐ | |
| 4 | Primary CTA (#007AFF / YouTube #FF0033) 탭 반응 | ☐ | ☐ | |
| 5 | 보조 pill 가로 스크롤 | ☐ | ☐ | |
| 6 | 비슷한 링크 **옆으로** 스와이프 (세로 스와이프와 충돌 없음) | ☐ | ☐ | |
| 7 | **← 밀어 삭제** + 3초 undo 바 | ☐ | ☐ | |
| 8 | 첫 실행 **제스처 가이드** 3단 (↑↓ / ← / ↔) | ☐ | ☐ | localStorage `rimvio.gesture-coach.v1` |
| 9 | 하단 IG 스타일 4탭 네비 (홈·방·받은함·프로필) | ☐ | ☐ | |
| 10 | safe-area (노치·홈 인디케이터) 여백 | ☐ | ☐ | |

---

## 2. 받은함 (`/inbox`)

| # | 확인 | iPhone | Android | 메모 |
|---|------|--------|---------|------|
| 1 | 배경 `#f2f2f7` + 흰 그룹드 리스트 | ☐ | ☐ | |
| 2 | 링크 붙여넣기 → `/now` 이동 | ☐ | ☐ | `?paste=1` 자동 붙여넣기 (iOS) |
| 3 | 카테고리 필터 pill (#007AFF active) | ☐ | ☐ | |
| 4 | 행 탭 → primary action 실행 | ☐ | ☐ | |

---

## 3. 함께방 (`/r`, `/r/[slug]`)

| # | 확인 | iPhone | Android | 메모 |
|---|------|--------|---------|------|
| 1 | 방 목록 iOS 카드 스타일 | ☐ | ☐ | |
| 2 | 방 피드 세로 스냅 + 흰 카드 | ☐ | ☐ | |
| 3 | Done 버튼 + 다음 링크 토스트 | ☐ | ☐ | |
| 4 | 초대 시트 URL 복사 | ☐ | ☐ | |

---

## 4. 웰컴 / 프로필 (`/welcome`)

| # | 확인 | iPhone | Android | 메모 |
|---|------|--------|---------|------|
| 1 | iOS 그룹드 섹션 카드 | ☐ | ☐ | |
| 2 | 플랫폼별 안내 (iOS 붙여넣기 / Android 공유) | ☐ | ☐ | |
| 3 | PWA 설치됨 표시 (standalone) | ☐ | ☐ | |

---

## 5. PWA · 공유

| # | 확인 | iPhone | Android | 메모 |
|---|------|--------|---------|------|
| 1 | `rimvio-icon.svg` 홈 화면 아이콘 (스마일 마크) | ☐ | ☐ | 재설치 필요할 수 있음 |
| 2 | Share Target — 다른 앱 → Rimvio 공유 | ☐ | ☐ | Android 우선 |
| 3 | 오프라인/느린망 — localStorage fallback | ☐ | ☐ | |

---

## 알려진 제한

- iOS Safari: Share Target API 미지원 → **붙여넣기** 워크플로 (`/inbox?paste=1`)
- 제스처 가이드는 **피드에 링크 1개 이상**일 때만 표시
- 가이드 재확인: DevTools → Application → localStorage → `rimvio.gesture-coach.v1` 삭제

---

## 회귀 명령 (데스크톱)

```bash
npm run verify:release
npm run experiment:url
```
