const LEGACY_STORAGE_KEYS = ["glang.gesture-coach.v1", "glango.gesture-coach.v1"] as const;
const STORAGE_KEY = "rimvio.gesture-coach.v1";

export function hasSeenGestureCoach(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return (
      localStorage.getItem(STORAGE_KEY) === "1" ||
      LEGACY_STORAGE_KEYS.some((k) => localStorage.getItem(k) === "1")
    );
  } catch {
    return true;
  }
}

export function markGestureCoachSeen(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
