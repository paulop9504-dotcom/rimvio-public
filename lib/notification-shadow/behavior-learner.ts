import type { BehaviorProfile, BehaviorSignal } from "@/lib/notification-shadow/types";
import { findShadowRecord } from "@/lib/notification-shadow/shadow-store";

const BEHAVIOR_KEY = "rimvio.shadow-behavior.v1";

let memoryProfile: BehaviorProfile = {};

function readProfile(): BehaviorProfile {
  if (typeof window === "undefined") {
    return { ...memoryProfile };
  }
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as BehaviorProfile;
  } catch {
    return {};
  }
}

function writeProfile(profile: BehaviorProfile) {
  if (typeof window === "undefined") {
    memoryProfile = profile;
    return;
  }
  localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(profile));
}

export function resetBehaviorProfileForTests(profile: BehaviorProfile = {}) {
  memoryProfile = profile;
  if (typeof window !== "undefined") {
    localStorage.removeItem(BEHAVIOR_KEY);
  }
}

export function readBehaviorProfile(): BehaviorProfile {
  return readProfile();
}

/** Stage B — learn only from user events, never from notification text alone */
export function recordBehaviorEvent(input: {
  shadow_id: string;
  event: "opened" | "ignored" | "clicked_action" | "opened_container";
  response_ms?: number;
}): BehaviorSignal {
  const record = findShadowRecord(input.shadow_id);
  const profile = readProfile();
  const app = record?.source_app?.toLowerCase() ?? "unknown";
  const container = record?.container ?? "UNKNOWN";

  profile.appAffinity ??= {};
  profile.containerAffinity ??= {};
  profile.categoryEngagement ??= {};

  let signal: BehaviorSignal = "UNKNOWN";

  if (input.event === "ignored") {
    profile.appAffinity[app] = Math.max(0, (profile.appAffinity[app] ?? 0) - 2);
    signal = "LOW_ENGAGEMENT";
  }

  if (input.event === "opened" || input.event === "clicked_action") {
    const fast = typeof input.response_ms === "number" && input.response_ms <= 60_000;
    profile.appAffinity[app] = Math.min(20, (profile.appAffinity[app] ?? 0) + (fast ? 4 : 2));
    if (container !== "UNKNOWN") {
      profile.containerAffinity[container] = Math.min(
        20,
        (profile.containerAffinity[container] ?? 0) + (fast ? 3 : 1)
      );
    }
    signal = fast ? "HIGH_ENGAGEMENT" : "REPEATED_PATTERN";
  }

  if (input.event === "opened_container" && container !== "UNKNOWN") {
    profile.containerAffinity[container] = Math.min(
      20,
      (profile.containerAffinity[container] ?? 0) + 4
    );
    signal = "REPEATED_PATTERN";
  }

  writeProfile(profile);
  return signal;
}
