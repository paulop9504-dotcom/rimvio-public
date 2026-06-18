import { parseAbsoluteTimeFromText } from "@/lib/time-decision/parse-absolute-time";
import { formatClock24, normalizeTimeFromText } from "@/lib/time/normalize-time";
import type {
  OcrEventExtractionResult,
  OcrExtractedEvent,
} from "@/lib/events/ocr-event-extraction-types";

export type { OcrEventExtractionResult, OcrExtractedEvent } from "@/lib/events/ocr-event-extraction-types";

const SCHEDULE_SIGNAL =
  /(?:일정|약속|예약|미팅|회의|면접|수업|강의|치과|병원|세미나|워크샵|점심|저녁|브리핑|미팅|meeting|interview|appointment)/iu;

const NOISE_LINE =
  /^(?:page|\d+\s*\/\s*\d+|www\.|http|©|all rights)/iu;

const DATE_LINE =
  /(?:(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})\s*월\s*(\d{1,2})\s*일)/u;

const TIME_RANGE =
  /(\d{1,2}):(\d{2})\s*[-~–]\s*(\d{1,2}):(\d{2})/u;

const HOUR_RANGE =
  /(\d{1,2})\s*~\s*(\d{1,2})(?!\s*:|\s*\d)/u;

const EVENING_HINT = /(?:저녁|밤|아침|오전|오후)\s*(?:에|중)?/u;

const ISO_LOCAL =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatIsoLocal(dateKey: string, hour: number, minute: number) {
  return `${dateKey}T${pad(hour)}:${pad(minute)}:00`;
}

function clampConfidence(value: number) {
  return Math.min(0.98, Math.max(0.2, Math.round(value * 100) / 100));
}

function parseDateFromLine(line: string, referenceDate: string): string | null {
  const iso = line.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  }

  const slash = line.match(/(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (slash) {
    return `${slash[1]}-${pad(Number(slash[2]))}-${pad(Number(slash[3]))}`;
  }

  const korean = line.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/u);
  if (korean) {
    const year = referenceDate.slice(0, 4);
    return `${year}-${pad(Number(korean[1]))}-${pad(Number(korean[2]))}`;
  }

  if (/내일/u.test(line)) {
    const base = new Date(`${referenceDate}T12:00:00`);
    base.setDate(base.getDate() + 1);
    return base.toISOString().slice(0, 10);
  }

  if (/모레/u.test(line)) {
    const base = new Date(`${referenceDate}T12:00:00`);
    base.setDate(base.getDate() + 2);
    return base.toISOString().slice(0, 10);
  }

  if (/오늘/u.test(line)) {
    return referenceDate;
  }

  return null;
}

function stripTimeTokens(line: string): string {
  return line
    .replace(TIME_RANGE, " ")
    .replace(/\d{1,2}:\d{2}/g, " ")
    .replace(/(?:오전|오후|아침|점심|저녁)?\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?/gu, " ")
    .replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, " ")
    .replace(/(?:월|일|년|요일|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/giu, " ")
    .replace(/[-~–|•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(line: string, fallback: string): string {
  const afterRange = line.replace(TIME_RANGE, " ").trim();
  const cleaned = stripTimeTokens(afterRange)
    .replace(/^(?:일정|약속|예약)\s*/u, "")
    .replace(/^[-–~:.\s]+/u, "")
    .trim();

  if (cleaned.length >= 2 && cleaned.length <= 48) {
    return cleaned;
  }

  return fallback;
}

function parseClockOnDate(
  line: string,
  dateKey: string,
  referenceDate: string
): { start: string; end: string; ambiguous: boolean } | null {
  const range = line.match(TIME_RANGE);
  if (range) {
    return {
      start: formatIsoLocal(dateKey, Number(range[1]), Number(range[2])),
      end: formatIsoLocal(dateKey, Number(range[3]), Number(range[4])),
      ambiguous: false,
    };
  }

  const hourRange = line.match(HOUR_RANGE);
  if (hourRange) {
    return {
      start: formatIsoLocal(dateKey, Number(hourRange[1]), 0),
      end: formatIsoLocal(dateKey, Number(hourRange[2]), 0),
      ambiguous: false,
    };
  }

  const clockMatches = [...line.matchAll(/\d{1,2}:\d{2}/g)];
  if (clockMatches.length >= 2) {
    return null;
  }

  const absolute = parseAbsoluteTimeFromText({
    message: line,
    referenceDate: dateKey || referenceDate,
  });

  if (absolute) {
    const match = ISO_LOCAL.exec(absolute.iso);
    if (!match) {
      return null;
    }
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const ambiguous = /(?:\d{1,2})\s*시/u.test(line) && !/(?:오전|오후|am|pm)/iu.test(line) && hour <= 11;
    return {
      start: formatIsoLocal(match[1] + "-" + match[2] + "-" + match[3], hour, minute),
      end: "",
      ambiguous,
    };
  }

  const normalized = normalizeTimeFromText(line);
  if (!normalized) {
    return null;
  }

  const ambiguous =
    /(?:\d{1,2})\s*시/u.test(line) && !/(?:오전|오후|am|pm)/iu.test(line) && normalized.hour <= 11;

  return {
    start: formatIsoLocal(dateKey, normalized.hour, normalized.minute),
    end: "",
    ambiguous,
  };
}

type ClockTimeOnly = {
  time: string;
  endTime: string;
  ambiguous: boolean;
};

function parseClockTimeOnly(
  line: string,
  referenceDate: string
): ClockTimeOnly | null {
  const range = line.match(TIME_RANGE);
  if (range) {
    return {
      time: formatClock24(Number(range[1]), Number(range[2])),
      endTime: formatClock24(Number(range[3]), Number(range[4])),
      ambiguous: false,
    };
  }

  const hourRange = line.match(HOUR_RANGE);
  if (hourRange) {
    return {
      time: formatClock24(Number(hourRange[1]), 0),
      endTime: formatClock24(Number(hourRange[2]), 0),
      ambiguous: false,
    };
  }

  const absolute = parseAbsoluteTimeFromText({
    message: line,
    referenceDate,
  });

  if (absolute) {
    const match = ISO_LOCAL.exec(absolute.iso);
    if (!match) {
      return null;
    }
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const ambiguous =
      /(?:\d{1,2})\s*시/u.test(line) &&
      !/(?:오전|오후|am|pm)/iu.test(line) &&
      hour <= 11;
    return {
      time: formatClock24(hour, minute),
      endTime: "",
      ambiguous,
    };
  }

  const normalized = normalizeTimeFromText(line);
  if (!normalized) {
    return null;
  }

  const ambiguous =
    /(?:\d{1,2})\s*시/u.test(line) &&
    !/(?:오전|오후|am|pm)/iu.test(line) &&
    normalized.hour <= 11;

  return {
    time: formatClock24(normalized.hour, normalized.minute),
    endTime: "",
    ambiguous,
  };
}

function isoTimeFromStart(start: string): string | null {
  const match = /T(\d{2}):(\d{2})/.exec(start);
  return match ? `${match[1]}:${match[2]}` : null;
}

function isoEndTimeFromEnd(end: string): string | null {
  const match = /T(\d{2}):(\d{2})/.exec(end);
  return match ? `${match[1]}:${match[2]}` : null;
}

function isPlausibleScheduleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3 || NOISE_LINE.test(trimmed)) {
    return false;
  }

  if (TIME_RANGE.test(trimmed) || /\d{1,2}:\d{2}/.test(trimmed)) {
    return true;
  }

  if (/(?:오전|오후)?\s*\d{1,2}\s*시/u.test(trimmed)) {
    return true;
  }

  if (HOUR_RANGE.test(trimmed)) {
    return true;
  }

  if (EVENING_HINT.test(trimmed) && SCHEDULE_SIGNAL.test(trimmed)) {
    return true;
  }

  if (DATE_LINE.test(trimmed) && SCHEDULE_SIGNAL.test(trimmed)) {
    return true;
  }

  return SCHEDULE_SIGNAL.test(trimmed) && /(?:\d|월|일|시)/u.test(trimmed);
}

function scoreEvent(input: {
  title: string;
  start: string;
  end: string;
  time: string | null;
  ambiguous: boolean;
  hadDateContext: boolean;
}): { confidence: number; reason: string } {
  const titleClear = input.title.length >= 2 && input.title !== "일정";

  if (input.end && titleClear) {
    return {
      confidence: clampConfidence(0.92),
      reason: "explicit time range with title",
    };
  }

  if (input.start && titleClear && input.hadDateContext) {
    return {
      confidence: clampConfidence(input.ambiguous ? 0.58 : 0.86),
      reason: input.ambiguous
        ? "tentative: ambiguous period without 오전/오후"
        : "single time with title and date context",
    };
  }

  if (input.start && titleClear) {
    return {
      confidence: clampConfidence(input.ambiguous ? 0.52 : 0.74),
      reason: input.ambiguous
        ? "tentative: ambiguous period without 오전/오후"
        : "tentative: start time and title; no end time",
    };
  }

  if (input.time && titleClear && !input.hadDateContext) {
    return {
      confidence: clampConfidence(input.ambiguous ? 0.55 : 0.62),
      reason: "tentative: time and title; date required before commit",
    };
  }

  if (input.start) {
    return {
      confidence: clampConfidence(0.45),
      reason: "tentative: time detected; title unclear",
    };
  }

  return {
    confidence: clampConfidence(0.35),
    reason: "tentative: weak schedule signal",
  };
}

function eventKey(event: OcrExtractedEvent): string {
  return `${event.date ?? ""}|${event.time ?? ""}|${event.endTime ?? ""}|${event.end}|${event.title}`;
}

/** Split OCR blob into one line per schedule row (handles single-line Tesseract output). */
function normalizeScheduleLines(ocrText: string): string[] {
  const normalized = ocrText.replace(/\r\n/g, "\n").trim();
  const byNewline = normalized
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);

  if (byNewline.length >= 2) {
    return byNewline;
  }

  const inline = normalized
    .split(
      /(?=(?:(?:오전|오후)\s*)?\d{1,2}\s*시|\d{1,2}:\d{2}|\d{1,2}\s*~\s*\d{1,2}|저녁에|아침에|모레\s|내일\s|오늘\s)/u
    )
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);

  if (inline.length >= 2) {
    return inline;
  }

  return byNewline.length > 0 ? byNewline : normalized ? [normalized] : [];
}

/**
 * Event Extraction Engine — OCR text → schedule candidates only.
 * Does NOT create calendar entries or mutate kernel state.
 */
export function extractEventsFromOcr(
  ocrText: string,
  options?: { referenceDate?: string }
): OcrEventExtractionResult {
  const referenceDate =
    options?.referenceDate ?? new Date().toISOString().slice(0, 10);

  const lines = normalizeScheduleLines(ocrText).map((line) =>
    line
      .replace(/^[•·]\s*/u, "")
      .replace(/^\d+[.)]\s+/u, "")
      .trim()
  );

  let activeDate: string | null = null;
  const events: OcrExtractedEvent[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const dateFromLine = parseDateFromLine(line, referenceDate);
    if (dateFromLine) {
      activeDate = dateFromLine;
      if (!TIME_RANGE.test(line) && !/\d{1,2}:\d{2}/.test(line)) {
        continue;
      }
    }

    if (!isPlausibleScheduleLine(line)) {
      continue;
    }

    let start = "";
    let end = "";
    let time: string | null = null;
    let endTime: string | null = null;
    let ambiguous = false;

    if (activeDate) {
      let times = parseClockOnDate(line, activeDate, referenceDate);
      if (!times?.start && EVENING_HINT.test(line) && SCHEDULE_SIGNAL.test(line)) {
        const hour = /(?:아침|오전)/u.test(line)
          ? 9
          : /(?:저녁|밤)/u.test(line)
            ? 19
            : 12;
        times = {
          start: formatIsoLocal(activeDate, hour, 0),
          end: "",
          ambiguous: true,
        };
      }
      if (!times?.start) {
        continue;
      }
      start = times.start;
      end = times.end;
      time = isoTimeFromStart(times.start);
      endTime = times.end ? isoEndTimeFromEnd(times.end) : null;
      ambiguous = times.ambiguous;
    } else {
      let timesOnly = parseClockTimeOnly(line, referenceDate);
      if (!timesOnly?.time && EVENING_HINT.test(line) && SCHEDULE_SIGNAL.test(line)) {
        const hour = /(?:아침|오전)/u.test(line)
          ? 9
          : /(?:저녁|밤)/u.test(line)
            ? 19
            : 12;
        timesOnly = {
          time: formatClock24(hour, 0),
          endTime: "",
          ambiguous: true,
        };
      }
      if (!timesOnly?.time) {
        continue;
      }
      time = timesOnly.time;
      endTime = timesOnly.endTime || null;
      ambiguous = timesOnly.ambiguous;
    }

    const title = extractTitle(line, SCHEDULE_SIGNAL.test(line) ? "일정" : "");
    const scored = scoreEvent({
      title,
      start,
      end,
      time,
      ambiguous,
      hadDateContext: activeDate !== null,
    });

    const candidate: OcrExtractedEvent = {
      title,
      start,
      end,
      date: activeDate,
      time,
      endTime,
      confidence: scored.confidence,
      reason: scored.reason,
    };

    const key = eventKey(candidate);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    events.push(candidate);
  }

  return { events };
}

/** JSON-only output per extraction contract. */
export function formatOcrEventExtractionJson(
  result: OcrEventExtractionResult
): string {
  return JSON.stringify(result, null, 2);
}
