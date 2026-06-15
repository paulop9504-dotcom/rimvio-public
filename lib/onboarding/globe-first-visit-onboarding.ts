const GLOBE_GUIDE_SEEN_KEY = "rimvio.globe-guide.v1";

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

export function hasSeenGlobeGuide(): boolean {
  return readFlag(GLOBE_GUIDE_SEEN_KEY);
}

export function markGlobeGuideSeen(): void {
  writeFlag(GLOBE_GUIDE_SEEN_KEY);
}

/** Settings → 다시 보기 */
export function resetGlobeGuideSeen(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(GLOBE_GUIDE_SEEN_KEY);
  } catch {
    // ignore
  }
}
