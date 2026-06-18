import { ingestExternalNotification } from "@/lib/notification-shadow/ingest-adapters";
import type { NativeNotificationPayload } from "@/lib/native-bridge/rimvio-native-bridge.types";
import { RimvioNativeBridge, isAndroidShell } from "@/lib/native-bridge/rimvio-native-bridge";

/** Map Android package id → readable app label for shadow ingest. */
function resolveSourceAppLabel(sourceApp: string): string {
  const normalized = sourceApp.toLowerCase();
  if (normalized.includes("kakao") || normalized.includes("katalk")) {
    return "KakaoTalk";
  }
  if (normalized.includes("gmail")) {
    return "Gmail";
  }
  if (normalized.includes("outlook")) {
    return "Outlook";
  }
  if (normalized.includes("slack")) {
    return "Slack";
  }
  return sourceApp;
}

export function ingestNativeNotificationPayload(payload: NativeNotificationPayload) {
  ingestExternalNotification({
    source_app: resolveSourceAppLabel(payload.source_app),
    title: payload.title,
    content: payload.content,
    timestamp: payload.timestamp,
  });
}

let booted = false;

/** Wire NotificationListener → notification-shadow (client only). */
export async function bootNativeNotificationBridge() {
  if (typeof window === "undefined" || booted) {
    return;
  }
  booted = true;

  if (!isAndroidShell()) {
    return;
  }

  await RimvioNativeBridge.addListener("notificationPosted", (payload) => {
    ingestNativeNotificationPayload(payload);
  });
}

export async function readNotificationAccessEnabled(): Promise<boolean> {
  if (!isAndroidShell()) {
    return false;
  }
  const result = await RimvioNativeBridge.isNotificationAccessEnabled();
  return result.enabled;
}

/** @집중 시작 시 — 맥락적 알림 접근 권한 안내 */
export async function openNotificationAccessSettings() {
  if (!isAndroidShell()) {
    return;
  }
  await RimvioNativeBridge.openNotificationAccessSettings();
}

export async function ensureNotificationAccessForFocus(
  onNeedsPermission?: () => void,
): Promise<boolean> {
  if (!isAndroidShell()) {
    return true;
  }
  const enabled = await readNotificationAccessEnabled();
  if (!enabled) {
    onNeedsPermission?.();
    return false;
  }
  return true;
}
