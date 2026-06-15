const PINNED_URL_KEY = "blink-pinned-url";

export function normalizeLinkUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.href.replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

export function setPinnedUrl(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(PINNED_URL_KEY, normalizeLinkUrl(url));
}

export function readPinnedUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem(PINNED_URL_KEY);
  } catch {
    return null;
  }
}

export function clearPinnedUrl() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(PINNED_URL_KEY);
}

export function isPinnedLinkUrl(url: string) {
  const pinned = readPinnedUrl();
  if (!pinned) {
    return false;
  }

  return normalizeLinkUrl(url) === pinned;
}
