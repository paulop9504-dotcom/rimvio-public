import type { LinkReminder } from "@/lib/local-links/reminders";
import type {
  EventCandidate,
  EventCandidateCategory,
  EventCandidateUpsertInput,
} from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import {
  commitEventLifecycle,
  commitEventUpsert,
} from "@/lib/source-of-truth/commit-truth";

export const LINK_REMINDER_SOURCE_REF = "link-reminder";

const TRAVEL_SIGNAL = /(?:공항|항공|여행|출장|탑승|비행|체크인)/iu;
const WORK_SIGNAL = /(?:업무|보고|출근|deadline|마감|보고서|미팅)/iu;
const FOOD_SIGNAL = /(?:맛집|식당|카페|치킨|저녁|점심|배달|먹)/u;

export function eventIdForLinkReminder(linkId: string): string {
  return `ec-link-${linkId.trim()}`;
}

function categoryForReminderTitle(title: string): EventCandidateCategory {
  if (TRAVEL_SIGNAL.test(title)) {
    return "travel";
  }
  if (WORK_SIGNAL.test(title)) {
    return "work";
  }
  if (FOOD_SIGNAL.test(title)) {
    return "food";
  }
  return "schedule";
}

export function linkReminderToEventCandidateUpsert(
  reminder: LinkReminder,
): EventCandidateUpsertInput {
  return {
    id: eventIdForLinkReminder(reminder.linkId),
    title: reminder.title.trim() || "저장한 링크",
    category: categoryForReminderTitle(reminder.title),
    source: "system",
    lifecycle: "scheduled",
    datetime: reminder.fireAt,
    confidence: 0.88,
    metadata: {
      sourceRef: LINK_REMINDER_SOURCE_REF,
      linkReminderId: reminder.id,
      linkId: reminder.linkId,
      url: reminder.url,
      sourceMessage: reminder.title,
    },
  };
}

/** Ingest adapter — LinkReminder → commit-truth. */
export function ingestLinkReminderEvent(reminder: LinkReminder): EventCandidate {
  return commitEventUpsert(linkReminderToEventCandidateUpsert(reminder));
}

/** Demote/clear path — archive linked EventCandidate (no physical delete). */
export function archiveLinkReminderEvent(linkId: string): EventCandidate | null {
  const eventId = eventIdForLinkReminder(linkId);
  const existing = findEventCandidate(eventId);
  if (!existing) {
    return null;
  }
  if (existing.lifecycle === "archived") {
    return existing;
  }
  return commitEventLifecycle(eventId, "archived");
}

export function isLinkReminderEvent(event: EventCandidate): boolean {
  return event.metadata?.sourceRef === LINK_REMINDER_SOURCE_REF;
}

/** Lazy migration for reminders persisted before ingest wiring. */
export function migrateLinkRemindersToEventCandidates(
  reminders: readonly LinkReminder[],
): void {
  for (const reminder of reminders) {
    const eventId = eventIdForLinkReminder(reminder.linkId);
    const existing = findEventCandidate(eventId);
    if (existing && existing.lifecycle !== "archived") {
      if (existing.datetime !== reminder.fireAt) {
        ingestLinkReminderEvent(reminder);
      }
      continue;
    }
    if (!existing) {
      ingestLinkReminderEvent(reminder);
    }
  }
}
