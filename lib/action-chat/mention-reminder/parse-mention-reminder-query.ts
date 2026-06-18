import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { normalizeTimeFromText } from "@/lib/time/normalize-time";

const DELAY_MINUTE =
  /(\d+)\s*(?:분|min(?:ute)?s?|m)\s*(?:뒤|후|뒤에|후에)?/iu;
const DELAY_HOUR =
  /(\d+)\s*(?:시간|hour?s?|h)\s*(?:뒤|후|뒤에|후에)?/iu;

const TIME_STRIP_PATTERNS: RegExp[] = [
  /\d{4}-\d{2}-\d{2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?)?/u,
  /(?:내일|모레|오늘).*?(?:\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?|\d{1,2}:\d{2})/u,
  /(?:\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?|\d{1,2}:\d{2})/u,
  DELAY_MINUTE,
  DELAY_HOUR,
];

export const DEFAULT_MENTION_REMINDER_DELAY_MS = 120 * 60_000;

export function parseMentionReminderFireAt(
  query: string,
  referenceDate: string,
): string | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const relative = parseRelativeDateTimeFromText(trimmed, referenceDate);
  if (relative) {
    return new Date(relative).toISOString();
  }

  const delayMinutes = trimmed.match(DELAY_MINUTE);
  if (delayMinutes) {
    const minutes = Number.parseInt(delayMinutes[1] ?? "", 10);
    if (Number.isFinite(minutes) && minutes > 0) {
      return new Date(Date.now() + minutes * 60_000).toISOString();
    }
  }

  const delayHours = trimmed.match(DELAY_HOUR);
  if (delayHours) {
    const hours = Number.parseInt(delayHours[1] ?? "", 10);
    if (Number.isFinite(hours) && hours > 0) {
      return new Date(Date.now() + hours * 3600_000).toISOString();
    }
  }

  const clock = normalizeTimeFromText(trimmed);
  if (clock) {
    const target = new Date(`${referenceDate}T12:00:00`);
    target.setHours(clock.hour, clock.minute, 0, 0);
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  return null;
}

function stripTimeFromReminderTitle(query: string): string {
  let title = query.trim();
  for (const pattern of TIME_STRIP_PATTERNS) {
    title = title.replace(pattern, " ");
  }
  return title
    .replace(/(?:내일|모레|오늘|오전|오후)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMentionReminderQuery(
  query: string,
  referenceDate: string,
): { title: string; fireAtIso: string | null } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { title: "", fireAtIso: null };
  }

  const fireAtIso = parseMentionReminderFireAt(trimmed, referenceDate);
  const title = fireAtIso ? stripTimeFromReminderTitle(trimmed) : trimmed;

  return { title, fireAtIso };
}

export function formatMentionReminderWhen(fireAtIso: string): string {
  const date = new Date(fireAtIso);
  if (Number.isNaN(date.getTime())) {
    return fireAtIso;
  }
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
