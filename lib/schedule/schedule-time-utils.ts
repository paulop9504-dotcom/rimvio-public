import {
  clockToMinutes,
  formatClock24,
  formatKoreanClock24,
  minutesToClock24,
  normalizeKoreanHour,
  normalizeTimeFromText,
} from "@/lib/time/normalize-time";

/** Parse HH:MM or H:MM to minutes from midnight. */
export function parseClockToMinutes(time: string): number | null {
  return clockToMinutes(time);
}

export function minutesToClock(minutes: number): string {
  return minutesToClock24(minutes);
}

export function formatKoreanTimeLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return formatKoreanClock24(hour, minute);
}

/** @deprecated Use normalizeKoreanHour from @/lib/time/normalize-time */
export function disambiguateKoreanHour(hour: number, context: string): number {
  return normalizeKoreanHour({ hour, context }).hour;
}

export function parseKoreanTimeFromText(
  text: string,
  index: number,
  context = ""
): { minutes: number; raw: string } | null {
  const slice = text.slice(Math.max(0, index - 8), index + 24);
  const normalized = normalizeTimeFromText(slice);
  if (!normalized) {
    return null;
  }
  const minutes = parseClockToMinutes(normalized.clock);
  if (minutes == null) {
    return null;
  }
  return { minutes, raw: normalized.raw };
}

export function blocksOverlap(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number
): number {
  const aEnd = aStart + aDuration;
  const bEnd = bStart + bDuration;
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  return Math.max(0, overlapEnd - overlapStart);
}

export { formatClock24, normalizeTimeFromText };
