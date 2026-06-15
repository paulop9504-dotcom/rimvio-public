import { formatClock24 } from "@/lib/time/normalize-time";
import { isVitalityTag, type VitalityTag } from "@/lib/vitality/types";

export type ScheduleListItem = {
  time: string;
  task: string;
  vitality?: VitalityTag;
  dateKey: string;
  datetime: string;
};

export type ParsedScheduleListBatch = {
  dateKey: string;
  dateLabel: string;
  items: ScheduleListItem[];
  source: "text" | "json";
};

const DATE_HEADER =
  /^(\d{4}-\d{2}-\d{2})\s*(?:\([^)]+\))?\s*(?:일정|스케줄|일과)?/iu;

const KOREAN_DATE_HEADER =
  /^(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일(?:\s*(?:\([^)]+\))?\s*)?(?:일과|일정|스케줄)?/iu;

const SCHEDULE_LINE =
  /^(\d{1,2}:\d{2})\s+(.+?)(?:\s*\[(Apex|Haven|Nexus|Sentinel)\])?\s*$/iu;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeClock(raw: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1]!, 10);
  const minute = Number.parseInt(match[2]!, 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return formatClock24(hour, minute);
}

function buildItem(input: {
  dateKey: string;
  time: string;
  task: string;
  vitality?: string;
}): ScheduleListItem | null {
  const clock = normalizeClock(input.time);
  const task = input.task.trim().replace(/\s+/g, " ");
  if (!clock || task.length < 2) {
    return null;
  }

  const vitalityRaw = input.vitality?.trim();
  const vitality =
    vitalityRaw && isVitalityTag(vitalityRaw) ? vitalityRaw : undefined;

  return {
    time: clock,
    task: task.slice(0, 120),
    vitality,
    dateKey: input.dateKey,
    datetime: `${input.dateKey}T${clock}:00`,
  };
}

function resolveDateKeyFromHeader(line: string, fallbackDateKey: string): string | null {
  const iso = line.match(DATE_HEADER);
  if (iso?.[1]) {
    return iso[1];
  }

  const korean = line.match(KOREAN_DATE_HEADER);
  if (!korean?.[2] || !korean[3]) {
    return null;
  }

  const year = korean[1]
    ? Number.parseInt(korean[1], 10)
    : Number.parseInt(fallbackDateKey.slice(0, 4), 10);
  const month = Number.parseInt(korean[2], 10);
  const day = Number.parseInt(korean[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function formatDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}

export function parseScheduleListFromJson(
  message: string,
  fallbackDateKey: string
): ParsedScheduleListBatch | null {
  const jsonMatch = message.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]!) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed) || parsed.length < 2) {
      return null;
    }

    const dateKey =
      typeof parsed[0]?.date === "string"
        ? parsed[0].date.slice(0, 10)
        : fallbackDateKey;

    const items = parsed
      .map((row) =>
        buildItem({
          dateKey:
            typeof row.date === "string" ? row.date.slice(0, 10) : dateKey,
          time: String(row.time ?? row.start ?? ""),
          task: String(row.task ?? row.title ?? row.label ?? ""),
          vitality: String(row.category ?? row.vitality ?? ""),
        })
      )
      .filter((item): item is ScheduleListItem => Boolean(item));

    if (items.length < 2) {
      return null;
    }

    const resolvedDateKey = items[0]!.dateKey;
    return {
      dateKey: resolvedDateKey,
      dateLabel: formatDateLabel(resolvedDateKey),
      items,
      source: "json",
    };
  } catch {
    return null;
  }
}

export function parseScheduleListFromText(
  message: string,
  fallbackDateKey: string
): ParsedScheduleListBatch | null {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  let dateKey = fallbackDateKey;
  const scheduleLines: string[] = [];

  for (const line of lines) {
    const resolved = resolveDateKeyFromHeader(line, fallbackDateKey);
    if (resolved) {
      dateKey = resolved;
      continue;
    }
    if (SCHEDULE_LINE.test(line)) {
      scheduleLines.push(line);
    }
  }

  if (scheduleLines.length < 2) {
    return null;
  }

  const items = scheduleLines
    .map((line) => {
      const match = line.match(SCHEDULE_LINE);
      if (!match) {
        return null;
      }
      return buildItem({
        dateKey,
        time: match[1]!,
        task: match[2]!,
        vitality: match[3],
      });
    })
    .filter((item): item is ScheduleListItem => Boolean(item));

  if (items.length < 2) {
    return null;
  }

  return {
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    items,
    source: "text",
  };
}

export function parseScheduleListBatch(
  message: string,
  fallbackDateKey: string
): ParsedScheduleListBatch | null {
  return (
    parseScheduleListFromJson(message, fallbackDateKey) ??
    parseScheduleListFromText(message, fallbackDateKey)
  );
}

export function isScheduleListBatchCandidate(message: string): boolean {
  return parseScheduleListBatch(message, new Date().toISOString().slice(0, 10)) !== null;
}

export function countScheduleLines(message: string): number {
  return message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => SCHEDULE_LINE.test(line)).length;
}
