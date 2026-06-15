import type { MyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { updateRoomGuest } from "@/lib/rooms/guest-session";

export const PROFILE_SETUP_DONE_KEY = "rimvio.profile-setup.v1";

export type ProfileSetupAssessment = {
  needsSetup: boolean;
  missingRimvioId: boolean;
  missingDisplayName: boolean;
};

export function assessProfileSetup(
  profile: Pick<MyAccountProfile, "rimvioId" | "displayName"> | null,
): ProfileSetupAssessment {
  const missingRimvioId = !profile?.rimvioId?.trim();
  const missingDisplayName = !profile?.displayName?.trim();
  return {
    needsSetup: missingRimvioId || missingDisplayName,
    missingRimvioId,
    missingDisplayName,
  };
}

export function hasCompletedProfileSetupLocal(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return localStorage.getItem(PROFILE_SETUP_DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markProfileSetupCompleteLocal(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PROFILE_SETUP_DONE_KEY, "1");
  } catch {
    // ignore
  }
}

/** 기본 표시 이름·게스트 라벨 동기화 */
export function applyProfileSetupDefaults(input: {
  displayName: string;
  rimvioId: string;
}): void {
  const name = input.displayName.trim();
  if (name) {
    updateRoomGuest({ label: name });
  }
}

export const PROFILE_SETUP_BYPASS_PREFIXES = [
  "/onboarding",
  "/auth/callback",
  "/welcome",
  "/feed",
  "/globe",
  "/search",
] as const;

export function isProfileSetupBypassPath(pathname: string): boolean {
  return PROFILE_SETUP_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
