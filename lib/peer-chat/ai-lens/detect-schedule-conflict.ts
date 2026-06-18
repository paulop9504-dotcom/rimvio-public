import type { EventCandidate } from "@/lib/events/event-candidate";

export type ScheduleConflictKind = "none" | "overlap" | "duplicate";

export type ScheduleConflict = {
  kind: ScheduleConflictKind;
  existingTitle?: string;
  existingDatetime?: string;
  /** 사용자-facing 한 줄 안내 */
  headline: string;
  detail?: string;
};

const OVERLAP_WINDOW_MS = 90 * 60 * 1000;

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function placesSimilar(left?: string | null, right?: string | null): boolean {
  const a = left?.trim().toLowerCase();
  const b = right?.trim().toLowerCase();
  if (!a || !b) {
    return false;
  }
  return a === b || a.includes(b) || b.includes(a);
}

function titlesSimilar(left: string, right: string): boolean {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) {
    return true;
  }
  return false;
}

function messageIdOf(event: EventCandidate): string {
  const meta = event.metadata ?? {};
  const source =
    typeof meta.sourceMessageId === "string" ? meta.sourceMessageId.trim() : "";
  if (source) {
    return source;
  }
  return typeof meta.messageId === "string" ? meta.messageId.trim() : "";
}

function isOpenSchedule(event: EventCandidate): boolean {
  return (
    event.lifecycle === "scheduled" ||
    event.lifecycle === "confirmed" ||
    event.lifecycle === "active" ||
    event.lifecycle === "mentioned"
  );
}

export function detectScheduleConflict(input: {
  title: string;
  datetime?: string;
  place?: string;
  sourceMessageId?: string;
  events: readonly EventCandidate[];
}): ScheduleConflict {
  const title = input.title.trim() || "일정";
  const proposedMs = input.datetime ? Date.parse(input.datetime) : NaN;
  const sourceMessageId = input.sourceMessageId?.trim();

  for (const event of input.events) {
    if (!isOpenSchedule(event)) {
      continue;
    }

    if (sourceMessageId && messageIdOf(event) === sourceMessageId) {
      return {
        kind: "duplicate",
        existingTitle: event.title,
        existingDatetime: event.datetime,
        headline: "이 대화에서 이미 같은 일정을 저장했어요",
        detail: event.title,
      };
    }
  }

  for (const event of input.events) {
    if (!isOpenSchedule(event) || !event.datetime) {
      continue;
    }
    if (!titlesSimilar(title, event.title)) {
      continue;
    }
    if (
      input.place?.trim() &&
      event.place?.trim() &&
      !placesSimilar(input.place, event.place)
    ) {
      continue;
    }
    const existingMs = Date.parse(event.datetime);
    if (Number.isNaN(existingMs)) {
      continue;
    }
    if (!Number.isNaN(proposedMs)) {
      if (Math.abs(existingMs - proposedMs) <= OVERLAP_WINDOW_MS) {
        return {
          kind: "duplicate",
          existingTitle: event.title,
          existingDatetime: event.datetime,
          headline: "비슷한 일정이 이미 있어요",
          detail: event.title,
        };
      }
    } else {
      return {
        kind: "duplicate",
        existingTitle: event.title,
        existingDatetime: event.datetime,
        headline: "같은 이름의 일정이 있어요",
        detail: event.title,
      };
    }
  }

  if (!Number.isNaN(proposedMs)) {
    for (const event of input.events) {
      if (!isOpenSchedule(event) || !event.datetime) {
        continue;
      }
      const existingMs = Date.parse(event.datetime);
      if (Number.isNaN(existingMs)) {
        continue;
      }
      if (Math.abs(existingMs - proposedMs) <= OVERLAP_WINDOW_MS) {
        return {
          kind: "overlap",
          existingTitle: event.title,
          existingDatetime: event.datetime,
          headline: "그 시간에 다른 일정이 있어요",
          detail: event.title,
        };
      }
    }
  }

  return { kind: "none", headline: "" };
}
