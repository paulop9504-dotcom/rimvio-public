import fs from "node:fs";
import path from "node:path";
import {
  publicRoot,
  resolveCapacitorServerUrl,
  resolvePrivacyUrl,
  STORE_LAUNCH,
} from "@/lib/mobile/store-launch-config";

export type { StoreLaunchCheck } from "@/lib/mobile/store-launch-config";

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function publicExists(relativePath: string): boolean {
  return fs.existsSync(path.join(publicRoot(), relativePath.replace(/^\//, "")));
}

export function runSharedStoreLaunchChecks(): StoreLaunchCheck[] {
  const checks: StoreLaunchCheck[] = [];
  const serverUrl = resolveCapacitorServerUrl();

  checks.push({
    id: "capacitor-config",
    ok: fileExists(STORE_LAUNCH.capacitorConfigPath),
    detail: STORE_LAUNCH.capacitorConfigPath,
  });

  checks.push({
    id: "server-url",
    ok: serverUrl.startsWith("https://") && !serverUrl.includes("localhost"),
    detail: serverUrl,
  });

  checks.push({
    id: "privacy-route",
    ok: fileExists("app/privacy/page.tsx"),
    detail: resolvePrivacyUrl(serverUrl),
  });

  for (const icon of STORE_LAUNCH.storeAssets.icons) {
    checks.push({
      id: `icon:${icon}`,
      ok: publicExists(icon),
      detail: icon,
    });
  }

  for (const shot of STORE_LAUNCH.storeAssets.screenshots) {
    checks.push({
      id: `screenshot:${shot}`,
      ok: publicExists(shot),
      detail: shot,
    });
  }

  const capacitorSource = fileExists(STORE_LAUNCH.capacitorConfigPath)
    ? fs.readFileSync(
        path.join(process.cwd(), STORE_LAUNCH.capacitorConfigPath),
        "utf8",
      )
    : "";

  checks.push({
    id: "capacitor-app-id",
    ok: capacitorSource.includes(`appId: "${STORE_LAUNCH.appId}"`),
    detail: STORE_LAUNCH.appId,
  });

  return checks;
}

export function runIosStoreLaunchChecks(): StoreLaunchCheck[] {
  const checks = runSharedStoreLaunchChecks();

  for (const relative of [
    STORE_LAUNCH.ios.projectDir,
    STORE_LAUNCH.ios.xcodeProject,
    STORE_LAUNCH.ios.infoPlist,
    STORE_LAUNCH.ios.reviewNotes,
  ]) {
    checks.push({
      id: `ios:${relative}`,
      ok: fileExists(relative),
      detail: relative,
    });
  }

  const plist = fileExists(STORE_LAUNCH.ios.infoPlist)
    ? fs.readFileSync(
        path.join(process.cwd(), STORE_LAUNCH.ios.infoPlist),
        "utf8",
      )
    : "";

  checks.push({
    id: "ios:photo-usage-string",
    ok: plist.includes("NSPhotoLibraryUsageDescription"),
    detail: "NSPhotoLibraryUsageDescription in Info.plist",
  });

  checks.push({
    id: "ios:live-activities-enabled",
    ok: plist.includes("NSSupportsLiveActivities"),
    detail: "NSSupportsLiveActivities in Info.plist",
  });

  const widget = STORE_LAUNCH.ios.liveActivityWidget;
  for (const [key, relative] of Object.entries({
    "live-activity-widget-swift": widget.swift,
    "live-activity-widget-plist": widget.plist,
    "live-activity-shared-attributes": widget.sharedAttributes,
    "live-activity-controller": widget.controller,
  })) {
    checks.push({
      id: `ios:${key}`,
      ok: fileExists(relative),
      detail: relative,
    });
  }

  const pbxprojPath = path.join(
    process.cwd(),
    STORE_LAUNCH.ios.xcodeProject,
    "project.pbxproj",
  );
  const pbxproj = fileExists(`${STORE_LAUNCH.ios.xcodeProject}/project.pbxproj`)
    ? fs.readFileSync(pbxprojPath, "utf8")
    : "";

  checks.push({
    id: "ios:live-activity-widget-target",
    ok: pbxproj.includes(`PBXNativeTarget "${widget.pbxTargetName}"`),
    detail: `${widget.pbxTargetName} in project.pbxproj`,
  });

  checks.push({
    id: "ios:live-activity-widget-embed",
    ok: pbxproj.includes("Embed Foundation Extensions"),
    detail: "Widget appex embedded in App target",
  });

  checks.push({
    id: "ios:live-activity-widget-bundle-id",
    ok: pbxproj.includes(widget.extensionBundleId),
    detail: widget.extensionBundleId,
  });

  return checks;
}

export function runAndroidStoreLaunchChecks(): StoreLaunchCheck[] {
  const checks = runSharedStoreLaunchChecks();

  for (const relative of [
    STORE_LAUNCH.android.projectDir,
    STORE_LAUNCH.android.manifest,
    STORE_LAUNCH.android.appBuildGradle,
  ]) {
    checks.push({
      id: `android:${relative}`,
      ok: fileExists(relative),
      detail: relative,
    });
  }

  const manifest = fileExists(STORE_LAUNCH.android.manifest)
    ? fs.readFileSync(
        path.join(process.cwd(), STORE_LAUNCH.android.manifest),
        "utf8",
      )
    : "";

  checks.push({
    id: "android:internet-permission",
    ok: manifest.includes("android.permission.INTERNET"),
    detail: "INTERNET permission",
  });

  checks.push({
    id: "android:share-intent",
    ok: manifest.includes("android.intent.action.SEND"),
    detail: "SEND share intent on MainActivity",
  });

  checks.push({
    id: "android:no-notification-listener-v1",
    ok: !manifest.includes("RimvioNotificationListenerService"),
    detail: "NotificationListener excluded from Play v1 manifest",
  });

  return checks;
}

export function printStoreLaunchReport(input: {
  platform: "ios" | "android";
  checks: StoreLaunchCheck[];
}): number {
  const requiredFailed = input.checks.filter((row) => !row.ok && !row.optional);
  const optionalPending = input.checks.filter((row) => !row.ok && row.optional);
  const serverUrl = resolveCapacitorServerUrl();

  console.log(`\nRimvio ${input.platform.toUpperCase()} store prepare\n`);
  console.log(`  CAPACITOR_SERVER_URL → ${serverUrl}`);
  console.log(`  Privacy URL          → ${resolvePrivacyUrl(serverUrl)}`);
  console.log(
    `  Doc                  → ${input.platform === "ios" ? STORE_LAUNCH.ios.doc : STORE_LAUNCH.android.doc}\n`,
  );

  for (const row of input.checks) {
    const mark = row.ok ? "✓" : row.optional ? "○" : "✗";
    console.log(`  ${mark} ${row.id}: ${row.detail}`);
  }

  if (optionalPending.length > 0) {
    console.log(`\n${optionalPending.length} optional item(s) for a later slice.\n`);
  }

  if (requiredFailed.length > 0) {
    console.log(`${requiredFailed.length} required check(s) failed.\n`);
    return 1;
  }

  console.log("\nAll required scaffold checks passed.\n");
  return 0;
}
