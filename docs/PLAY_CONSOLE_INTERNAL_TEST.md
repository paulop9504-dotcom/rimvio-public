# Google Play — 내부 테스트 1차 출시 (클릭 순서)

> **전제:** `npm run store:prepare:android` 전부 ✓  
> **리스팅 복붙:** `npm run store:export:play` → `docs/generated/play-store-listing-ko.txt`

---

## A. PC 준비 (Windows, 1회)

### 1. JDK 17

[Adoptium Temurin 17](https://adoptium.net/) 설치 후 PowerShell:

```powershell
java -version
# openjdk 17.x 확인
```

### 2. Android Studio

1. [developer.android.com/studio](https://developer.android.com/studio) 설치
2. **SDK Manager** → Android SDK 34 · Build-Tools · Platform-Tools
3. **환경 변수** (선택): `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`

### 3. Keystore

```powershell
cd c:\Users\userguest\Desktop\new-project
copy android\keystore.properties.example android\keystore.properties
```

Android Studio → **Build → Generate Signed App Bundle** → `rimvio-release.jks` 생성  
→ `keystore.properties`에 경로·비밀번호 입력

### 4. AAB 빌드

```powershell
$env:CAPACITOR_SERVER_URL="https://rimvio.vercel.app"
npm run store:prepare:android -- --sync
npm run mobile:android
```

Android Studio: **Build → Generate Signed Bundle / APK** → **Android App Bundle** → **release**

출력: `android\app\build\outputs\bundle\release\app-release.aab`

CLI (keystore 설정 후):

```powershell
cd android
.\gradlew.bat bundleRelease
```

---

## B. Play Console (브라우저)

### 1. 계정

1. [play.google.com/console](https://play.google.com/console) → 개발자 등록 ($25)
2. **Create app**
   - App name: **Rimvio**
   - Default language: **Korean**
   - App / Game: **App**
   - Free

### 2. 대시보드 필수 항목 (왼쪽 메뉴)

| 메뉴 | 입력 |
|------|------|
| **App content → Privacy policy** | `https://rimvio.vercel.app/privacy` (또는 rimvio.app) |
| **App content → Ads** | No ads (v1) |
| **App content → Content rating** | 설문 (보통 Everyone / 3+) |
| **App content → Target audience** | 13+ 또는 18+ (정책에 맞게) |
| **App content → Data safety** | `play-store-listing-ko.txt` Data safety 표 참고 |
| **Main store listing** | 짧은/전체 설명 · 스크린샷 3장 · 512 아이콘 |

스크린샷 파일:

```
public/store/peers-mobile.png
public/store/feed-mobile.png
public/store/welcome-mobile.png
```

아이콘: `public/icons/icon-512.png`

### 3. 내부 테스트 트랙

1. **Testing → Internal testing** → **Create new release**
2. **Upload** → `app-release.aab`
3. Release name: `1.0.0 (1)`  
4. Release notes (KO):

```
첫 내부 테스트 — 링크 공유, Globe 흔적, Bridge 미디어
```

5. **Save** → **Review release** → **Start rollout to Internal testing**

### 4. 테스터 추가

**Internal testing → Testers** → 이메일 목록 (본인 Gmail)  
→ **opt-in link** 로 폰에서 설치

---

## C. 폰에서 확인

- [ ] 앱 설치 · 실행 → Feed 로드
- [ ] Chrome에서 링크 **공유 → Rimvio** → `/now` 액션
- [ ] Globe · 로그인(선택)
- [ ] `docs/PHONE_QA.md` 핵심 10항

---

## D. 다음 단계

```
내부 테스트 OK
  → Closed testing (지인 20명)
  → Production (단계적 10% → 100%)
```

iOS는 Mac 친구 + `docs/STORE_LAUNCH_IOS.md`

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| `JAVA_HOME is not set` | JDK 17 설치 · PATH |
| Signing failed | `keystore.properties` 경로 확인 |
| 앱 빈 화면 | `CAPACITOR_SERVER_URL` HTTPS URL 확인 |
| 공유 안 됨 | Rimvio가 공유 대상 목록에 있는지 · text/plain 링크 테스트 |
