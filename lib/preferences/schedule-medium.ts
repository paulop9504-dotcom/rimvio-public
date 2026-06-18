import { isIOS, isStandalonePwa } from "@/lib/platform/device";

export const SCHEDULE_MEDIUM_STORAGE_KEY = "rimvio.schedule-medium.v1";
export const SCHEDULE_MEDIUM_UPDATED = "rimvio-schedule-medium-updated";

/** Where deferred link execution is routed when user taps remind / schedule actions. */
export type ScheduleMedium = "rimvio" | "google_calendar" | "copy";

export type ScheduleMediumOption = {
  id: ScheduleMedium;
  label: string;
  emoji: string;
  hint: string;
  badge?: string;
};

export const SCHEDULE_MEDIUM_OPTIONS: ScheduleMediumOption[] = [
  {
    id: "rimvio",
    label: "Rimvio 알림",
    emoji: "🔔",
    hint: "정해진 시간에 이 기기로 알림 · PWA 설치 시 가장 편해요",
    badge: "추천",
  },
  {
    id: "google_calendar",
    label: "Google Calendar",
    emoji: "📅",
    hint: "캘린더 앱에서 일정 저장 · iPhone에서도 잘 맞아요",
  },
  {
    id: "copy",
    label: "복사해서 저장",
    emoji: "📋",
    hint: "메모·카톡·Notion에 붙여넣기 · 어디든 쓸 수 있어요",
  },
];

const MEDIUM_SET = new Set<ScheduleMedium>(
  SCHEDULE_MEDIUM_OPTIONS.map((option) => option.id)
);

function isScheduleMedium(value: string): value is ScheduleMedium {
  return MEDIUM_SET.has(value as ScheduleMedium);
}

export function defaultScheduleMedium(): ScheduleMedium {
  if (typeof window === "undefined") {
    return "rimvio";
  }

  if (isIOS() && !isStandalonePwa()) {
    return "google_calendar";
  }

  return "rimvio";
}

export function readScheduleMedium(): ScheduleMedium {
  if (typeof window === "undefined") {
    return "rimvio";
  }

  try {
    const raw = localStorage.getItem(SCHEDULE_MEDIUM_STORAGE_KEY);
    if (!raw) {
      return defaultScheduleMedium();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string" && isScheduleMedium(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "medium" in parsed &&
      typeof (parsed as { medium: string }).medium === "string" &&
      isScheduleMedium((parsed as { medium: string }).medium)
    ) {
      return (parsed as { medium: ScheduleMedium }).medium;
    }
  } catch {
    // ignore
  }

  return defaultScheduleMedium();
}

export function writeScheduleMedium(medium: ScheduleMedium): ScheduleMedium {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        SCHEDULE_MEDIUM_STORAGE_KEY,
        JSON.stringify({ medium, updatedAt: new Date().toISOString() })
      );
      window.dispatchEvent(new CustomEvent(SCHEDULE_MEDIUM_UPDATED));
    } catch {
      // ignore quota / private mode
    }
  }

  return medium;
}

export function labelForScheduleMedium(medium: ScheduleMedium) {
  const match = SCHEDULE_MEDIUM_OPTIONS.find((option) => option.id === medium);
  return match ? `${match.emoji} ${match.label}` : medium;
}
