/** Deterministic Korean date phrases — referenceDate = local "today". */

export type ParsedLensDate = {
  dateKey: string;
  label: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function atLocalMidnight(reference: Date): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function weekdayIndexKo(token: string): number | null {
  const map: Record<string, number> = {
    일: 0,
    월: 1,
    화: 2,
    수: 3,
    목: 4,
    금: 5,
    토: 6,
    일요일: 0,
    월요일: 1,
    화요일: 2,
    수요일: 3,
    목요일: 4,
    금요일: 5,
    토요일: 6,
  };
  return map[token] ?? null;
}

function parseWeekdayPhrase(
  text: string,
  reference: Date,
): ParsedLensDate | null {
  const weekMatch =
    /(이번\s*주|다음\s*주)\s*(일|월|화|수|목|금|토|일요일|월요일|화요일|수요일|목요일|금요일|토요일)/iu.exec(
      text,
    );
  if (!weekMatch) {
    const bare =
      /(^|[\s,])(일|월|화|수|목|금|토|일요일|월요일|화요일|수요일|목요일|금요일|토요일)(?:요일)?(?=[\s,]|$)/iu.exec(
        text,
      );
    if (!bare) {
      return null;
    }
    const dow = weekdayIndexKo(bare[2]!);
    if (dow === null) {
      return null;
    }
    const today = atLocalMidnight(reference);
    const current = today.getDay();
    let delta = (dow - current + 7) % 7;
    if (delta === 0) {
      delta = 7;
    }
    return {
      dateKey: toDateKey(addDays(today, delta)),
      label: bare[2]!,
    };
  }

  const weekToken = weekMatch[1]!.replace(/\s/g, "");
  const dow = weekdayIndexKo(weekMatch[2]!);
  if (dow === null) {
    return null;
  }

  const today = atLocalMidnight(reference);
  const current = today.getDay();
  let delta = (dow - current + 7) % 7;
  if (delta === 0) {
    delta = 7;
  }
  if (weekToken === "다음주") {
    delta += 7;
  }

  return {
    dateKey: toDateKey(addDays(today, delta)),
    label: weekMatch[0].trim(),
  };
}

function parseRelativeDay(text: string, reference: Date): ParsedLensDate | null {
  const today = atLocalMidnight(reference);
  if (/(?:오늘|금일)/u.test(text)) {
    return { dateKey: toDateKey(today), label: "오늘" };
  }
  if (/(?:내일|명일)/u.test(text)) {
    const d = addDays(today, 1);
    return { dateKey: toDateKey(d), label: "내일" };
  }
  if (/모레/u.test(text)) {
    const d = addDays(today, 2);
    return { dateKey: toDateKey(d), label: "모레" };
  }
  return null;
}

function parseMonthDay(text: string, reference: Date): ParsedLensDate | null {
  const m = /(\d{1,2})\s*월\s*(\d{1,2})\s*일?/u.exec(text);
  if (!m) {
    return null;
  }
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  let year = reference.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate.getTime() < atLocalMidnight(reference).getTime() - 86_400_000) {
    year += 1;
  }
  const resolved = new Date(year, month - 1, day);
  return {
    dateKey: toDateKey(resolved),
    label: `${month}월 ${day}일`,
  };
}

/** Best-effort date from DM text (1차). */
export function parseLensDateFromText(
  text: string,
  referenceDate: Date = new Date(),
): ParsedLensDate | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return (
    parseRelativeDay(normalized, referenceDate) ??
    parseWeekdayPhrase(normalized, referenceDate) ??
    parseMonthDay(normalized, referenceDate)
  );
}

export function combineLensDateAndTime(
  dateKey: string,
  timeHm: string,
  referenceDate: Date = new Date(),
): string {
  const [y, mo, d] = dateKey.split("-").map((part) => Number(part));
  const [h, mi] = timeHm.split(":").map((part) => Number(part));
  const resolved = new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 12, mi ?? 0, 0, 0);
  if (resolved.getTime() < referenceDate.getTime() - 60_000 && !dateKey) {
    resolved.setDate(resolved.getDate() + 1);
  }
  return resolved.toISOString();
}
