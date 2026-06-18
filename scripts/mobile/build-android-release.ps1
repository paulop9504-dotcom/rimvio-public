# Play Store v1 — release AAB on Windows

> **클릭 순서:** [PLAY_CONSOLE_INTERNAL_TEST.md](../docs/PLAY_CONSOLE_INTERNAL_TEST.md)  
> **리스팅 복붙:** `npm run store:export:play`

## 1. Prepare

```powershell
cd c:\Users\userguest\Desktop\new-project
npm run store:icons
npm run store:screenshots
$env:CAPACITOR_SERVER_URL="https://rimvio.app"
npm run store:prepare:android -- --sync
```

## 2. Keystore (first time only)

Android Studio → **Build → Generate Signed App Bundle or APK** → create `rimvio-release.jks`

Copy `android/keystore.properties.example` → `android/keystore.properties` and fill paths/passwords.

## 3. Release bundle

**Option A — Android Studio (recommended)**

```powershell
npm run mobile:android
```

→ **Build → Generate Signed Bundle / APK** → **Android App Bundle** → release

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Option B — CLI** (after `keystore.properties` exists)

```powershell
cd android
.\gradlew.bat bundleRelease
```

## 4. Play Console

1. [Play Console](https://play.google.com/console) → Create app → `com.rimvio.app`
2. **Internal testing** → upload AAB
3. Data safety + privacy `https://rimvio.app/privacy`
4. Store listing copy from `lib/pwa/store-meta.ts`

Full checklist: [docs/STORE_LAUNCH_ANDROID.md](../docs/STORE_LAUNCH_ANDROID.md) · [docs/PLAY_CONSOLE_INTERNAL_TEST.md](../docs/PLAY_CONSOLE_INTERNAL_TEST.md)
