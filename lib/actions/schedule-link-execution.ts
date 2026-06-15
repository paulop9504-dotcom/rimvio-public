import { buildGoogleCalendarTemplateHref } from "@/lib/actions/search-urls";
import { RIMVIO } from "@/lib/brand/rimvio";
import {
  formatReminderDelayLabel,
  requestReminderPermission,
  scheduleLinkReminder,
  showReminderNotification,
} from "@/lib/local-links/reminders";
import {
  readScheduleMedium,
  type ScheduleMedium,
} from "@/lib/preferences/schedule-medium";

export type ScheduleLinkInput = {
  linkId: string;
  title: string;
  url: string;
  payload?: Record<string, unknown>;
  medium?: ScheduleMedium;
};

export type ScheduleLinkResult = {
  medium: ScheduleMedium;
  remindedAt?: string | null;
  copiedText?: string | null;
  openedCalendar?: boolean;
};

function parseRemindAt(payload: Record<string, unknown> | undefined) {
  const at = payload?.at;
  if (typeof at === "string" && /^\d{1,2}:\d{2}$/.test(at.trim())) {
    const [hour, minute] = at.split(":").map(Number);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  const delayMinutes =
    typeof payload?.delayMinutes === "number" && payload.delayMinutes > 0
      ? payload.delayMinutes
      : 120;

  return new Date(Date.now() + delayMinutes * 60_000);
}

function formatCalendarStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarTimedHref(input: {
  title: string;
  details?: string;
  start: Date;
  durationMinutes?: number;
}) {
  const start = input.start;
  const end = new Date(
    start.getTime() + (input.durationMinutes ?? 30) * 60_000
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.details ?? "",
    dates: `${formatCalendarStamp(start)}/${formatCalendarStamp(end)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildCopyScheduleTemplate(input: ScheduleLinkInput, fireAt: Date) {
  const whenLabel = fireAt.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    `⏰ ${RIMVIO.nameKo} 실행 예약`,
    `제목: ${input.title}`,
    `예정: ${whenLabel}`,
    input.url,
  ].join("\n");
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return null;
  }

  try {
    await navigator.clipboard.writeText(text);
    return text;
  } catch {
    return null;
  }
}

export async function executeScheduledLinkReminder(
  input: ScheduleLinkInput
): Promise<ScheduleLinkResult> {
  const medium = input.medium ?? readScheduleMedium();
  const fireAt = parseRemindAt(input.payload);
  const delayLabel = formatReminderDelayLabel(input.payload);

  if (medium === "google_calendar") {
    const href = buildGoogleCalendarTimedHref({
      title: `🔗 ${input.title}`,
      details: `${RIMVIO.nameKo}에서 예약\n${input.url}`,
      start: fireAt,
    });

    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }

    return {
      medium,
      remindedAt: delayLabel,
      openedCalendar: true,
    };
  }

  if (medium === "copy") {
    const copiedText = await copyText(
      buildCopyScheduleTemplate(input, fireAt)
    );

    return {
      medium,
      copiedText,
      remindedAt: delayLabel,
    };
  }

  await requestReminderPermission();

  const reminder = scheduleLinkReminder({
    linkId: input.linkId,
    title: input.title,
    url: input.url,
    payload: input.payload,
  });

  if (Date.now() >= new Date(reminder.fireAt).getTime() - 1000) {
    showReminderNotification(reminder);
  }

  return {
    medium,
    remindedAt: delayLabel,
  };
}
