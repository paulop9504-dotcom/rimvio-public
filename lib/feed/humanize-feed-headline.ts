import { formatScheduleConfirmWhen } from "@/lib/peer-chat/ai-lens/resolve-schedule-datetime";

const ISO_IN_TEXT =
  /예정:\s*(\d{4}-\d{2}-\d{2}T[\d:.+-]+)/u;

/** Replace raw ISO timestamps in feed headlines with Korean labels. */
export function humanizeFeedHeadline(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }

  const scheduled = trimmed.match(ISO_IN_TEXT);
  if (scheduled?.[1]) {
    return formatScheduleConfirmWhen(scheduled[1]);
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return formatScheduleConfirmWhen(trimmed);
  }

  return trimmed;
}
