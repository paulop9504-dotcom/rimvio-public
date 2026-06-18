/**
 * CRITICAL: 24-hour time normalization — single source of truth.
 * All tool inputs (calendar, timer, schedule) MUST pass through here first.
 */

export type NormalizedTime = {
  hour: number;
  minute: number;
  /** Always HH:MM 24-hour */
  clock: string;
  raw: string;
};

export const TIME_NORMALIZATION_PROTOCOL = `# [CRITICAL RULE: Time Parsing & Normalization]

1. **24시간제 고정**: "15시 30분" → 내부 처리 **15:30 (HH:MM)** 만 사용.
2. **절대 변환 금지**: 15를 "오전 5시", "3시", "오후 3시"로 바꾸지 마라. 15는 15다.
3. **Parsing Process**: 툴 실행 전 [시간 정규화] 선행 → 정규화된 HH:MM만 매개변수로 전달.
4. **Validation**: 12~24 사이 숫자는 무조건 24시간제(13:00~23:59)로 간주, 변환 없이 그대로 사용.
5. **오후/오전**: 명시적 "오후" + 1~11만 +12. "오전" + 12 → 00:00. 그 외 임의 추론 금지.`;

const KOREAN_CLOCK =
  /(?:오전|오후|아침|점심|저녁)?\s*(\d{1,2})\s*시(?:\s*(?:반|(\d{1,2})\s*분))?(?!\s*간)/u;

export function formatClock24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Display label in 24-hour Korean — never AM/PM conversion. */
export function formatKoreanClock24(hour: number, minute: number): string {
  if (minute === 0) {
    return `${hour}시`;
  }
  if (minute === 30) {
    return `${hour}시 30분`;
  }
  return `${hour}시 ${minute}분`;
}

/**
 * Normalize hour/minute from Korean colloquial + explicit period hints.
 * Rule: hours 12–24 → 24h literal. No silent 15→3 conversion.
 */
export function normalizeKoreanHour(input: {
  hour: number;
  minute?: number;
  context: string;
  /** Narrow slice around the match for period disambiguation */
  localContext?: string;
}): { hour: number; minute: number } {
  let hour = input.hour;
  const minute = input.minute ?? 0;
  const ctx = input.localContext ?? input.context;

  if (hour === 24) {
    return { hour: 0, minute };
  }

  if (hour >= 13 && hour <= 23) {
    return { hour, minute };
  }

  if (hour === 12) {
    if (/오전|아침|am/i.test(ctx)) {
      return { hour: 0, minute };
    }
    return { hour: 12, minute };
  }

  if (/오후|점심|저녁|pm/i.test(ctx) && hour >= 1 && hour <= 11) {
    return { hour: hour + 12, minute };
  }

  if (/오전|아침|am/i.test(ctx)) {
    return { hour, minute };
  }

  return { hour, minute };
}

/** Extract and normalize the first clock time in text → HH:MM. */
export function normalizeTimeFromText(text: string): NormalizedTime | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const colon = trimmed.match(/(\d{1,2}):(\d{2})/u);
  if (colon?.index != null) {
    const hour = Number.parseInt(colon[1]!, 10);
    const minute = Number.parseInt(colon[2]!, 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return {
      hour,
      minute,
      clock: formatClock24(hour, minute),
      raw: colon[0]!,
    };
  }

  const korean = trimmed.match(KOREAN_CLOCK);
  if (korean) {
    const raw = korean[0]!;
    const localStart = Math.max(0, (korean.index ?? 0) - 8);
    const localContext = trimmed.slice(localStart, (korean.index ?? 0) + raw.length + 4);
    const hourRaw = Number.parseInt(korean[1]!, 10);
    const minuteRaw = korean[2]
      ? Number.parseInt(korean[2], 10)
      : /반/u.test(raw)
        ? 30
        : 0;

    const { hour, minute } = normalizeKoreanHour({
      hour: hourRaw,
      minute: minuteRaw,
      context: trimmed,
      localContext,
    });

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return {
      hour,
      minute,
      clock: formatClock24(hour, minute),
      raw,
    };
  }

  return null;
}

export function clockToMinutes(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

export function minutesToClock24(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return formatClock24(hour, minute);
}
