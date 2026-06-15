import type { ParsedAbsoluteTime } from "@/lib/time-decision/types";
import {
  formatClock24,
  formatKoreanClock24,
  normalizeTimeFromText,
} from "@/lib/time/normalize-time";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatIsoLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function resolveDateKey(message: string, referenceDate: string): string {
  if (/내일/u.test(message)) {
    const base = new Date(`${referenceDate}T12:00:00+09:00`);
    base.setDate(base.getDate() + 1);
    return base.toISOString().slice(0, 10);
  }
  if (/모레/u.test(message)) {
    const base = new Date(`${referenceDate}T12:00:00+09:00`);
    base.setDate(base.getDate() + 2);
    return base.toISOString().slice(0, 10);
  }
  return referenceDate;
}

/** Parse absolute clock times — normalized to 24h HH:MM before any tool use. */
export function parseAbsoluteTimeFromText(input: {
  message: string;
  referenceDate: string;
  now?: Date;
}): ParsedAbsoluteTime | null {
  const message = input.message.trim();
  const now = input.now ?? new Date();
  const dateKey = resolveDateKey(message, input.referenceDate);

  const normalized = normalizeTimeFromText(message);
  if (!normalized) {
    return null;
  }

  const target = new Date(
    `${dateKey}T${formatClock24(normalized.hour, normalized.minute)}:00`
  );

  return buildParsed(
    target,
    dateKey,
    normalized.hour,
    normalized.minute,
    message,
    now
  );
}

function buildParsed(
  target: Date,
  dateKey: string,
  hour: number,
  minute: number,
  _context: string,
  now: Date
): ParsedAbsoluteTime {
  const isPastToday =
    dateKey === now.toISOString().slice(0, 10) && target.getTime() <= now.getTime();

  return {
    iso: formatIsoLocal(target),
    clockLabel: formatKoreanClock24(hour, minute),
    isPastToday,
    dateKey,
  };
}
