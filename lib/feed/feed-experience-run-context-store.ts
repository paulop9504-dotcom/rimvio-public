const STORAGE_KEY = "rimvio:feed-experience-run-context";

export type FeedExperienceRunContext = {
  eventId: string;
  featureId: string;
  place: string | null;
  headline: string | null;
  savedAtIso: string;
};

export function writeFeedExperienceRunContext(
  context: Omit<FeedExperienceRunContext, "savedAtIso">,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload: FeedExperienceRunContext = {
    ...context,
    savedAtIso: new Date().toISOString(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readFeedExperienceRunContext(): FeedExperienceRunContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as FeedExperienceRunContext;
    if (!parsed?.eventId?.trim() || !parsed?.featureId?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearFeedExperienceRunContext(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
