const STORAGE_KEY = "rimvio-globe-map-media-card-width";

export const GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT = 256;
export const GLOBE_MAP_MEDIA_CARD_WIDTH_MIN = 220;
export const GLOBE_MAP_MEDIA_CARD_WIDTH_MAX = 480;

export function clampGlobeMapMediaCardWidth(
  widthPx: number,
  viewportWidth?: number,
): number {
  const viewport = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 390);
  const max = Math.min(GLOBE_MAP_MEDIA_CARD_WIDTH_MAX, viewport - 24);
  return Math.round(
    Math.max(GLOBE_MAP_MEDIA_CARD_WIDTH_MIN, Math.min(max, widthPx)),
  );
}

export function readGlobeMapMediaCardWidth(): number {
  if (typeof window === "undefined") {
    return GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed)) {
      return clampGlobeMapMediaCardWidth(GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT);
    }
    return clampGlobeMapMediaCardWidth(parsed);
  } catch {
    return clampGlobeMapMediaCardWidth(GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT);
  }
}

export function writeGlobeMapMediaCardWidth(widthPx: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(clampGlobeMapMediaCardWidth(widthPx)));
  } catch {
    /* ignore */
  }
}

export function touchPairDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}
