# Rimvio Google Play (Android) 출시

> **플랫폼:** Capacitor 6 · WebView → `CAPACITOR_SERVER_URL`  
> **Application ID:** `com.rimvio.app`  
> **공통:** [LAUNCH.md](./LAUNCH.md) · [STORE_LAUNCH_IOS.md](./STORE_LAUNCH_IOS.md)  
> **SSOT:** `lib/mobile/store-launch-config.ts` · `lib/pwa/store-meta.ts`

---

## 0. 준비 명령 (Windows OK)

```powershell
cd c:\Users\userguest\Desktop\new-project
npm run store:icons
npm run store:screenshots
$env:CAPACITOR_SERVER_URL="https://rimvio.app"
npm run store:prepare:android -- --sync
npm run mobile:android
```

---

## 1. Google Play Console

| 항목 | 값 |
|------|-----|
| 등록비 | $25 (1회) |
| Application ID | `com.rimvio.app` |
| 앱 이름 | Rimvio |
| 카테고리 | Productivity |

[Play Console](https://play.google.com/console) → Create app.

---

## 2. 서명 키스토어 (최초 1회)

`android/keystore.properties.example` → `android/keystore.properties` (gitignored)

```properties
storeFile=../rimvio-release.jks
storePassword=...
keyAlias=rimvio
keyPassword=...
```

Android Studio → **Build → Generate Signed App Bundle or APK** — 또는:

```powershell
npm run store:build:android
```

예상 경로: `android/app/build/outputs/bundle/release/app-release.aab`

`android/app/build.gradle` 버전:

```gradle
versionCode 1      // 매 업로드 +1
versionName "1.0.0"
```

---

## 3. Capacitor 동기화

`capacitor.config.ts`는 prod URL을 WebView로 로드:

```powershell
$env:CAPACITOR_SERVER_URL="https://rimvio.app"
npm run store:prepare:android -- --sync
```

로컬 디버그만 할 때:

```powershell
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"   # emulator → host
```

---

## 4. 스토어 등록정보

| 필드 | 소스 |
|------|------|
| 짧은 설명 | `STORE_META.shortDescription` |
| 전체 설명 | `STORE_META.longDescription` |
| 스크린샷 | `public/store/*.png` |
| 아이콘 | `public/icons/icon-512.png` |
| 개인정보 URL | `https://<prod>/privacy` |

---

## 5. 데이터 안전성 · 권한

Play Console **Data safety** + **App content** 설문 정직하게 작성.

현재 `AndroidManifest.xml` 권한:

| 권한 | 용도 | v1 심사 |
|------|------|---------|
| `INTERNET` | Vercel WebView | ✅ 필수 |
| `READ_MEDIA_IMAGES/VIDEO` | 경험 맥락 사진 매칭 | ✅ opt-in 설명 |
| `NotificationListenerService` | 알림 → 맥락 (실험) | ❌ v1 manifest에서 제외 |

알림 리스너를 v1에 넣지 않으면 심사·설명 부담이 크게 줄어듭니다.

---

## 6. 공유하기 (Share Target) — v1 ✅

`MainActivity` intent-filter + `AndroidShareIntentRouter.java`:

| MIME | 동작 |
|------|------|
| `text/plain` | `/share?url=…` → `/now` |
| `image/*` · `video/*` | `/globe` (맥락 ingest) |

예시 스캐폴드: `android/STORE_SHARE_INTENT.example.xml` (참고용 — manifest에 반영됨)

---

## 7. 출시 트랙

```
내부 테스트 (본인 기기)
  → 비공개 테스트 (지인)
  → 프로덕션 심사
  → 단계적 출시 (10% → 100%)
```

실기기 QA: [PHONE_QA.md](./PHONE_QA.md)

---

## 8. v1 범위

| 포함 | v1.1 |
|------|------|
| Capacitor + prod WebView | Android share intent |
| Feed · Globe · Bridge | NotificationListener |
| 사진·동영상 read (opt-in) | TWA 대신 full native shell polish |

---

## 9. 업데이트

| 변경 | 방법 |
|------|------|
| UI / API (웹) | Vercel 배포 → 앱 재설치 없이 반영 |
| 네이티브 · 권한 · versionCode | 새 AAB 업로드 |

---

## 10. 체크리스트

- [ ] `npm run store:prepare:android` 전부 ✓ (share-intent는 v1.1 optional ✗ OK)
- [ ] Play Console 앱 생성
- [ ] Keystore 백업
- [ ] Signed AAB 내부 테스트 업로드
- [ ] Data safety 설문
- [ ] `/privacy` URL

---

## 11. 롤백

- **웹:** Vercel Promote
- **Play:** Console → Release → 이전 AAB로 promote (versionCode 규칙 준수)
