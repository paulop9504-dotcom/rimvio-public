import path from "node:path";
import { RIMVIO } from "@/lib/brand/rimvio";
import { STORE_META } from "@/lib/pwa/store-meta";

/** Capacitor + Play / App Store launch SSOT — paths, ids, asset gates. */
export const STORE_LAUNCH = {
  appId: "com.rimvio.app",
  appName: "Rimvio",
  displayNameKo: RIMVIO.nameKo,
  privacyPath: "/privacy",
  storeMeta: STORE_META,
  capacitorConfigPath: "capacitor.config.ts",
  ios: {
    doc: "docs/STORE_LAUNCH_IOS.md",
    reviewNotes: "ios/APP_STORE_REVIEW_NOTES.txt",
    projectDir: "ios/App",
    xcodeProject: "ios/App/App.xcodeproj",
    workspace: "ios/App/App.xcworkspace",
    infoPlist: "ios/App/App/Info.plist",
    bundleId: "com.rimvio.app",
    marketingVersion: "1.0.0",
    buildNumber: "1",
    minMacTools: ["Xcode", "CocoaPods (pod install in ios/App)"],
  },
  android: {
    doc: "docs/STORE_LAUNCH_ANDROID.md",
    projectDir: "android",
    manifest: "android/app/src/main/AndroidManifest.xml",
    appBuildGradle: "android/app/build.gradle",
    applicationId: "com.rimvio.app",
    versionCode: 1,
    versionName: "1.0.0",
    minTools: ["Android Studio", "JDK 17+"],
    releaseArtifact: "android/app/build/outputs/bundle/release/app-release.aab",
  },
  storeAssets: {
    icons: [
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-1024.png",
    ],
    screenshots: [
      STORE_META.screenshots.peers.path,
      STORE_META.screenshots.feed.path,
      STORE_META.screenshots.welcome.path,
    ],
    og: STORE_META.ogImage,
  },
} as const;

export type StoreLaunchCheck = {
  id: string;
  ok: boolean;
  detail: string;
  /** v1.1 — does not fail prepare script */
  optional?: boolean;
};

export function resolveCapacitorServerUrl(): string {
  const fromCap = process.env.CAPACITOR_SERVER_URL?.trim();
  if (fromCap) {
    return fromCap.replace(/\/$/, "");
  }
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) {
    return fromApp.replace(/\/$/, "");
  }
  return `https://${RIMVIO.domain}`;
}

export function resolvePrivacyUrl(serverUrl: string): string {
  return `${serverUrl.replace(/\/$/, "")}${STORE_LAUNCH.privacyPath}`;
}

export function publicRoot(): string {
  return path.join(process.cwd(), "public");
}
