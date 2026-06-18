const LENS_FIRST_COACH_KEY = "rimvio.lens-first-coach.v1";

export function shouldShowLensFirstCoach(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(LENS_FIRST_COACH_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markLensFirstCoachShown(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(LENS_FIRST_COACH_KEY, "1");
  } catch {
    // ignore
  }
}

export function resetLensFirstCoachForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(LENS_FIRST_COACH_KEY);
  } catch {
    // ignore
  }
}
