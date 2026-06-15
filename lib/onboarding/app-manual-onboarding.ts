const INTRO_SEEN_KEY = "rimvio.manual-intro.v1";
const GUIDE_OPENED_KEY = "rimvio.manual-guide-opened.v1";
const FEED_BANNER_DISMISSED_KEY = "rimvio.manual-feed-banner-dismissed.v1";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

export function hasSeenManualIntro(): boolean {
  return readFlag(INTRO_SEEN_KEY);
}

export function markManualIntroSeen(): void {
  writeFlag(INTRO_SEEN_KEY);
}

export function hasOpenedManualGuide(): boolean {
  return readFlag(GUIDE_OPENED_KEY);
}

export function markManualGuideOpened(): void {
  writeFlag(GUIDE_OPENED_KEY);
  markManualIntroSeen();
}

export function hasDismissedManualFeedBanner(): boolean {
  return readFlag(FEED_BANNER_DISMISSED_KEY);
}

export function dismissManualFeedBanner(): void {
  writeFlag(FEED_BANNER_DISMISSED_KEY);
}

export function shouldShowManualFeedBanner(): boolean {
  return !hasOpenedManualGuide() && !hasDismissedManualFeedBanner();
}
