/** Deterministic Korean time phrases — bare `N시` uses social/evening heuristics (2차). */

const TIME_MATCH_RE =
  /(?:오후|pm)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?|(?:오전|am)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?|(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?|(\d{1,2}):(\d{2})/iu;

const MORNING_CUE_RE =
  /(?:오전|am|아침|새벽|브런치|모닝|출근|등교|조회|아침\s*회의)/iu;

const EVENING_CUE_RE =
  /(?:오후|pm|저녁|밤|야식|야간|술|회식|저녁\s*약속)/iu;

const SOCIAL_MEETING_RE =
  /(?:보자|만나|약속|일정|모이|갈래|가자|예약|미팅|회의|식사|밥|술자리)/iu;

const SOCIAL_PLACE_RE =
  /(?:CGV|메가박스|롯데시네마|치킨|카페|식당|맛집|멕시카나|스타벅스|영화|상영)/iu;

function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Bare 1–11시 + 약속/저녁 맥락 → 오후로 보정 (한국어 DM 관습). */
export function inferPmHourForBareTime(hour: number, text: string): number {
  if (hour < 1 || hour > 11) {
    return hour;
  }
  if (MORNING_CUE_RE.test(text)) {
    return hour;
  }
  if (EVENING_CUE_RE.test(text)) {
    return hour + 12;
  }
  if (SOCIAL_MEETING_RE.test(text) || SOCIAL_PLACE_RE.test(text)) {
    return hour + 12;
  }
  return hour;
}

/**
 * Best-effort time from DM text.
 * - `오전/오후`, `am/pm` respected
 * - bare `7시` + CGV·보자 등 → `19:00`
 */
export function parseLensTimeFromText(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const match = TIME_MATCH_RE.exec(normalized);
  if (!match) {
    return null;
  }

  const hasPmMarker = Boolean(match[1]);
  const hasAmMarker = Boolean(match[3]);
  const bareHourMatch = match[5];
  const colonHourMatch = match[7];

  let hour = Number(
    match[1] ?? match[3] ?? match[5] ?? match[7],
  );
  const minute = Number(match[2] ?? match[4] ?? match[6] ?? match[8] ?? 0);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  if (hasPmMarker && hour < 12) {
    hour += 12;
  } else if (hasAmMarker) {
    if (hour === 12) {
      hour = 0;
    }
  } else if (bareHourMatch !== undefined) {
    hour = inferPmHourForBareTime(hour, normalized);
  } else if (colonHourMatch !== undefined && hour >= 1 && hour <= 11) {
    if (!MORNING_CUE_RE.test(normalized) && (EVENING_CUE_RE.test(normalized) || SOCIAL_MEETING_RE.test(normalized))) {
      hour += 12;
    }
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return formatHm(hour, minute);
}
