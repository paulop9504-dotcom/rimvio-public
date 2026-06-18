# Rimvio App Store (iOS) 출시

> **플랫폼:** Capacitor 6 · WebView → `CAPACITOR_SERVER_URL`  
> **번들 ID:** `com.rimvio.app`  
> **공통:** [LAUNCH.md](./LAUNCH.md) (Vercel · Supabase) · [STORE_LAUNCH_ANDROID.md](./STORE_LAUNCH_ANDROID.md)  
> **SSOT:** `lib/mobile/store-launch-config.ts` · `lib/pwa/store-meta.ts`

---

## 0. 준비 명령 (Mac)

```bash
cd c:/Users/userguest/Desktop/new-project   # 또는 repo root
npm run store:icons
npm run store:screenshots
export CAPACITOR_SERVER_URL=https://rimvio.app
npm run store:prepare:ios -- --sync
npm run mobile:ios
```

Windows에서는 **체크만** 가능:

```powershell
npm run store:prepare:ios
```

Xcode Archive / TestFlight는 **Mac 필수**.

---

## 1. Apple Developer

| 항목 | 값 |
|------|-----|
| 프로그램 | [Apple Developer Program](https://developer.apple.com/programs/) · $99/년 |
| Bundle ID | `com.rimvio.app` |
| 앱 이름 | Rimvio |
| 카테고리 | Productivity |

App Store Connect → **My Apps** → **+** → New App.

---

## 2. Xcode 서명

1. `npm run mobile:ios` → `App.xcworkspace` 열기
2. **Signing & Capabilities** → Team 선택
3. **General**
   - Display Name: `Rimvio`
   - Version: `1.0.0` (`MARKETING_VERSION`)
   - Build: `1` (`CURRENT_PROJECT_VERSION`)
4. **Product → Archive** → **Distribute App** → App Store Connect

프로젝트 경로: `ios/App/App.xcodeproj`

---

## 3. 스토어 등록정보

| 필드 | 소스 |
|------|------|
| 부제 / 설명 | `lib/pwa/store-meta.ts` → `shortDescription`, `longDescription` |
| 키워드 | `STORE_META.keywords` |
| 개인정보 URL | `https://<prod>/privacy` |
| 스크린샷 | `public/store/peers-mobile.png`, `feed-mobile.png`, `welcome-mobile.png` |
| 앱 아이콘 | `public/icons/icon-1024.png` |

스크린샷 없으면: `npm run store:screenshots`

---

## 4. App Review (심사 메모)

**Review Notes**에 아래 파일 내용 붙여넣기:

`ios/APP_STORE_REVIEW_NOTES.txt`

핵심:

- 사진첩 접근은 **설정 opt-in** 후에만
- 맥락(날짜·장소)에 맞는 사진만 **기기 로컬**에서 매칭
- 전체 사진첩 업로드 **하지 않음**

Info.plist 권한 문구 (`NSPhotoLibraryUsageDescription`) — 이미 `ios/App/App/Info.plist`에 있음.

---

## 5. TestFlight → 프로덕션

```
내부 테스트 (본인)
  → TestFlight (지인 5~10명, 1주)
  → App Store 심사 제출
  → 승인 후 출시
```

실기기 QA: [PHONE_QA.md](./PHONE_QA.md) + Globe 동영상 소리 · Share → Now.

---

## 6. v1 범위 (심사 통과용)

| 포함 | v1.1 이후 |
|------|-----------|
| Feed · Now · Globe personal pin | External discovery pins |
| Bridge 기본 · peer chat | Scope AI 확장 |
| 사진 opt-in import | iOS Share Extension (다른 앱 → Rimvio) |

iOS **Share Extension**은 PWA `share_target`과 별도 — v1.1 slice.

---

## 7. 업데이트

| 변경 종류 | 방법 |
|-----------|------|
| UI / 웹 로직 | Vercel 배포만 (WebView가 prod URL 로드) |
| 네이티브 플러그인 · 권한 | Xcode Archive → TestFlight → 심사 |
| 버전 올리기 | `MARKETING_VERSION` + `CURRENT_PROJECT_VERSION` |

---

## 8. Dynamic Island · Live Activity (Phase 3)

> **Spec:** `docs/GLOBE_HUB_RESOURCE.md` §8  
> **L3:** `lib/globe/resource/main-native-surface.ts` · `build-main-native-surface-payload.ts`

MAIN (Resource rank #1 — ticket QR at gate time) → **ActivityKit** compact/expanded + Lock Screen Live Activity. Same payload as web carousel index 0; Hub does not start activities.

**Ship order:** Capacitor shell on TestFlight → Widget Extension (see `ios/RimvioLiveActivityWidget/`) → `RimvioMainSurface.syncMainSurface` → QR brightness via `setScanBrightnessEnabled` while viewer open.

WebView/PWA alone cannot show Dynamic Island — reject any PR that tries from JS-only.

---

## 9. 체크리스트

- [ ] `npm run store:prepare:ios` 전부 ✓
- [ ] Apple Developer 계정
- [ ] Mac + Xcode + `pod install` (ios/App)
- [ ] TestFlight 실기기 QA
- [ ] `/privacy` URL 등록
- [ ] Review Notes 붙여넣기

---

## 10. 롤백

- **웹:** Vercel 이전 deployment Promote
- **앱:** App Store Connect → 이전 버전 선택 · 또는 긴급 제출 중단
