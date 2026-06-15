import * as chrono from "chrono-node";
import type { TemporalPatternMatch, TemporalResolution } from "@/lib/time/temporal-types";
import { detectTemporalPattern } from "@/lib/time/temporal-parsing-protocol";
import { normalizeTimeFromText, formatClock24 } from "@/lib/time/normalize-time";

const KOREAN_NUM: Record<string, number> = {
  한: 1,
  일: 1,
  하루: 1,
  두: 2,
  세: 3,
  네: 4,
  다섯: 5,
  여섯: 6,
  일주: 1,
};

const WEEKDAY: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseCount(raw: string | undefined, fallback = 1): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const trimmed = raw.trim();
  if (KOREAN_NUM[trimmed] != null) {
    return KOREAN_NUM[trimmed]!;
  }
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : fallback;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(base: Date, weeks: number): Date {
  return addDays(base, weeks * 7);
}

function addMonthsSafe(base: Date, months: number): Date {
  const d = new Date(base);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}

function addYearsSafe(base: Date, years: number): Date {
  const d = new Date(base);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function nextWeekday(base: Date, weekday: number): Date {
  const d = new Date(base);
  const current = d.getDay();
  let delta = weekday - current;
  if (delta <= 0) {
    delta += 7;
  }
  return addDays(d, delta);
}

function formatKoreanDateLabel(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${month}월 ${day}일 (${weekdays[date.getDay()]})`;
}

function buildResolution(input: {
  date: Date;
  rawPhrase: string;
  hasClockTime: boolean;
  message: string;
  offsetMinutes?: number;
}): TemporalResolution {
  const clock = normalizeTimeFromText(input.message);
  const target = new Date(input.date);
  if (clock) {
    target.setHours(clock.hour, clock.minute, 0, 0);
  } else if (!input.offsetMinutes) {
    target.setHours(9, 0, 0, 0);
  }

  const dateKey = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
  const iso = `${dateKey}T${formatClock24(target.getHours(), target.getMinutes())}:00`;

  return {
    dateKey,
    iso,
    displayLabel: input.offsetMinutes
      ? `${input.offsetMinutes}분 이내 (${formatClock24(target.getHours(), target.getMinutes())})`
      : clock
        ? `${formatKoreanDateLabel(target)} ${formatClock24(clock.hour, clock.minute)}`
        : formatKoreanDateLabel(target),
    rawPhrase: input.rawPhrase,
    hasClockTime: Boolean(clock) || Boolean(input.offsetMinutes),
    intent: "schedule_calculation",
    offsetMinutes: input.offsetMinutes,
  };
}

function matchKoreanTemporal(message: string, ref: Date): TemporalPatternMatch | null {
  const text = message.trim();

  let m = text.match(/(\d{1,3})\s*분\s*(?:뒤|후|뒤에|후에|안에|이내)/iu);
  if (m) {
    return { rawPhrase: m[0], patternKind: "offset_minutes" };
  }

  m = text.match(/(\d{1,2})\s*시간\s*(?:뒤|후|뒤에|후에|안에|이내)/iu);
  if (m) {
    return { rawPhrase: m[0], patternKind: "offset_hours" };
  }

  m = text.match(
    /(\d+|한|하루|일|두|세|네|다섯|여섯)\s*(?:일|day)\s*(?:뒤|후|이후|후에|뒤에)/iu
  );
  if (m) {
    return { rawPhrase: m[0], patternKind: "offset_days" };
  }

  m = text.match(/(\d+|한|일|두|세|네|다섯|일주)\s*(?:주|week)\s*(?:뒤|후|이후|후에|뒤에)/iu);
  if (m) {
    return { rawPhrase: m[0], patternKind: "offset_weeks" };
  }

  m = text.match(
    /(\d+|한|일|두|세|네|열?\d?)\s*(?:달|개월|month)\s*(?:뒤|후|이후|후에|뒤에)/iu
  );
  if (m) {
    return { rawPhrase: m[0], patternKind: "offset_months" };
  }

  if (/(?:한|일)\s*달\s*(?:뒤|후|이후)/iu.test(text)) {
    return { rawPhrase: text.match(/(?:한|일)\s*달\s*(?:뒤|후|이후)/iu)![0]!, patternKind: "offset_months" };
  }

  m = text.match(/(\d+)\s*(?:년|year)\s*(?:뒤|후|이후|후에|뒤에)/iu);
  if (m) {
    return { rawPhrase: m[0], patternKind: "offset_years" };
  }

  if (/내년/u.test(text)) {
    return { rawPhrase: "내년", patternKind: "next_year" };
  }

  if (/다음\s*달/u.test(text)) {
    return { rawPhrase: text.match(/다음\s*달/u)![0]!, patternKind: "next_month" };
  }

  if (/다음\s*주/u.test(text)) {
    return { rawPhrase: text.match(/다음\s*주(?:\s*[월화수목금토일]요일)?/u)![0]!, patternKind: "next_week" };
  }

  if (/내일/u.test(text)) {
    return { rawPhrase: "내일", patternKind: "offset_days" };
  }

  if (/모레/u.test(text)) {
    return { rawPhrase: "모레", patternKind: "offset_days" };
  }

  return null;
}

function resolveKoreanMatch(match: TemporalPatternMatch, ref: Date): Date | null {
  switch (match.patternKind) {
    case "offset_minutes": {
      const numMatch = match.rawPhrase.match(/^(\d+)/);
      const d = new Date(ref);
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() + parseCount(numMatch?.[1], 1));
      return d;
    }
    case "offset_hours": {
      const numMatch = match.rawPhrase.match(/^(\d+)/);
      const d = new Date(ref);
      d.setSeconds(0, 0);
      d.setHours(d.getHours() + parseCount(numMatch?.[1], 1));
      return d;
    }
    case "offset_days": {
      if (match.rawPhrase === "내일") {
        return addDays(ref, 1);
      }
      if (match.rawPhrase === "모레") {
        return addDays(ref, 2);
      }
      const numMatch = match.rawPhrase.match(/^(\d+|한|하루|일|두|세|네|다섯|여섯)/u);
      return addDays(ref, parseCount(numMatch?.[1], 1));
    }
    case "offset_weeks": {
      const numMatch = match.rawPhrase.match(/^(\d+|한|일|두|세|네|다섯|일주)/u);
      return addWeeks(ref, parseCount(numMatch?.[1], 1));
    }
    case "offset_months": {
      const numMatch = match.rawPhrase.match(/^(\d+|한|일|두|세|네|열?\d?)/u);
      return addMonthsSafe(ref, parseCount(numMatch?.[1], 1));
    }
    case "offset_years": {
      const numMatch = match.rawPhrase.match(/^(\d+)/u);
      return addYearsSafe(ref, parseCount(numMatch?.[1], 1));
    }
    case "next_year":
      return addYearsSafe(ref, 1);
    case "next_month":
      return addMonthsSafe(ref, 1);
    case "next_week": {
      const weekday = match.rawPhrase.match(/([월화수목금토일])요일/u)?.[1];
      if (weekday && WEEKDAY[weekday] != null) {
        const nextWeekStart = addWeeks(ref, 1);
        return nextWeekday(nextWeekStart, WEEKDAY[weekday]!);
      }
      return addWeeks(ref, 1);
    }
    default:
      return null;
  }
}

/**
 * Resolve relative temporal expressions → absolute YYYY-MM-DD.
 * Korean: deterministic date math. English: chrono-node fallback.
 */
export function resolveTemporalExpression(input: {
  message: string;
  referenceDate?: string;
  now?: Date;
}): TemporalResolution | null {
  const message = input.message.trim();
  if (!message || !detectTemporalPattern(message)) {
    return null;
  }

  const ref =
    input.now ??
    new Date(input.referenceDate ? `${input.referenceDate}T12:00:00+09:00` : Date.now());

  const koreanMatch = matchKoreanTemporal(message, ref);
  if (koreanMatch) {
    const date = resolveKoreanMatch(koreanMatch, ref);
    if (date) {
      const offsetMinutes =
        koreanMatch.patternKind === "offset_minutes"
          ? parseCount(koreanMatch.rawPhrase.match(/^(\d+)/)?.[1], 1)
          : koreanMatch.patternKind === "offset_hours"
            ? parseCount(koreanMatch.rawPhrase.match(/^(\d+)/)?.[1], 1) * 60
            : undefined;
      return buildResolution({
        date,
        rawPhrase: koreanMatch.rawPhrase,
        hasClockTime: Boolean(offsetMinutes),
        message,
        offsetMinutes,
      });
    }
  }

  const chronoDate = chrono.parseDate(message, ref, { forwardDate: true });
  if (chronoDate) {
    return buildResolution({
      date: chronoDate,
      rawPhrase: detectTemporalPattern(message) ?? message.slice(0, 24),
      hasClockTime: Boolean(normalizeTimeFromText(message)),
      message,
    });
  }

  return null;
}
