import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Capture time for pool tiles — EXIF datetime when available. */
export function formatMediaPoolTimeLabel(
  context: MediaSpacetimeContext,
  locale = "ko-KR",
): string {
  const ms = Date.parse(context.capturedAtIso);
  if (Number.isNaN(ms)) {
    return "시간 미상";
  }
  const date = new Date(ms);
  if (context.resolveSource === "exif_datetime") {
    return date.toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Approximate place — ping fallback only, never EXIF-precise. */
export function formatMediaPoolPlaceLabel(context: MediaSpacetimeContext): string {
  const label = context.placeLabel?.trim();
  if (label) {
    return `대략 · ${label}`;
  }
  if (context.lat != null && context.lng != null) {
    return "대략 · 주변";
  }
  return "위치 없음";
}

export function formatMediaPoolExpiryLabel(
  expiresAtIso: string | null | undefined,
  nowMs = Date.now(),
): string | null {
  const ms = expiresAtIso ? Date.parse(expiresAtIso) : Number.NaN;
  if (Number.isNaN(ms) || ms <= nowMs) {
    return null;
  }
  const daysLeft = Math.ceil((ms - nowMs) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 1) {
    return "오늘까지";
  }
  return `${daysLeft}일 남음`;
}

/** ISO datetime-local value from first selected pool item. */
export function mediaPoolStartIsoFromContext(context: MediaSpacetimeContext): string {
  const ms = Date.parse(context.capturedAtIso);
  if (Number.isNaN(ms)) {
    return "";
  }
  const date = new Date(ms);
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}
