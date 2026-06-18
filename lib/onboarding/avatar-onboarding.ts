const AVATAR_ONBOARDING_KEY = "rimvio.avatar-onboarding.v1";
const DRAW_REDIRECT_SESSION_KEY = "rimvio.draw-redirected";

export type AvatarOnboardingState = {
  /** User finished the one-time color draw. */
  drawComplete: boolean;
  /** User dismissed the feed banner without drawing yet. */
  bannerDismissed: boolean;
};

function readState(): AvatarOnboardingState {
  if (typeof window === "undefined") {
    return { drawComplete: false, bannerDismissed: false };
  }

  try {
    const raw = localStorage.getItem(AVATAR_ONBOARDING_KEY);
    if (!raw) {
      return { drawComplete: false, bannerDismissed: false };
    }

    const parsed = JSON.parse(raw) as Partial<AvatarOnboardingState>;
    return {
      drawComplete: parsed.drawComplete === true,
      bannerDismissed: parsed.bannerDismissed === true,
    };
  } catch {
    return { drawComplete: false, bannerDismissed: false };
  }
}

function writeState(state: AvatarOnboardingState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(AVATAR_ONBOARDING_KEY, JSON.stringify(state));
}

export function markAvatarDrawOnboardingComplete() {
  const current = readState();
  writeState({ ...current, drawComplete: true });
}

export function dismissAvatarDrawBanner() {
  const current = readState();
  writeState({ ...current, bannerDismissed: true });
}

export function shouldShowAvatarDrawBanner(drawn: boolean) {
  if (drawn) {
    return false;
  }

  return !readState().bannerDismissed;
}

export function shouldRedirectToAvatarDraw(drawn: boolean) {
  if (drawn || typeof window === "undefined") {
    return false;
  }

  if (sessionStorage.getItem(DRAW_REDIRECT_SESSION_KEY) === "1") {
    return false;
  }

  return true;
}

export function markAvatarDrawRedirected() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(DRAW_REDIRECT_SESSION_KEY, "1");
}

export function resetAvatarOnboardingForDev() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(AVATAR_ONBOARDING_KEY);
  sessionStorage.removeItem(DRAW_REDIRECT_SESSION_KEY);
}
