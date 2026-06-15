import type {
  EventCandidate,
  EventCandidateCategory,
  EventCandidateLifecycle,
  EventCandidateUpsertInput,
} from "@/lib/events/event-candidate";
import { eventIdForChatScheduled } from "@/lib/events/chat-scheduled-ingest";
import {
  eventIdForLinkReminder,
  isLinkReminderEvent,
} from "@/lib/events/link-reminder-ingest";
import {
  findEventCandidate,
  listEventCandidates,
} from "@/lib/events/event-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { NotificationEventInput } from "@/lib/notification-shadow/types";
import { ruleClassifyNotification } from "@/lib/notification-shadow/rule-classify";

export const NOTIFICATION_SHADOW_SOURCE_REF = "notification-shadow";

const TRAVEL_SIGNAL = /(?:공항|항공|여행|출장|탑승|비행|체크인|zoom|meet)/iu;
const WORK_SIGNAL = /(?:업무|보고|출근|deadline|마감|미팅|회의|slack|jira)/iu;

function hashKey(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function resolveNotificationEventId(input: NotificationEventInput): string {
  if (input.link_id?.trim()) {
    return eventIdForLinkReminder(input.link_id);
  }
  if (input.message_id?.trim()) {
    return eventIdForChatScheduled(input.message_id);
  }
  const anchor = input.fire_at ?? input.timestamp;
  const key = `${input.source_app}|${input.title}|${anchor.slice(0, 16)}`;
  return `ec-notif-${hashKey(key)}`;
}

function categoryForNotification(input: NotificationEventInput): EventCandidateCategory {
  const classified = ruleClassifyNotification(input);
  if (classified.category === "WORK" || classified.category === "CRITICAL") {
    return "work";
  }
  if (classified.category === "PERSONAL") {
    return "social";
  }
  const blob = `${input.title} ${input.content}`;
  if (TRAVEL_SIGNAL.test(blob)) {
    return "travel";
  }
  if (WORK_SIGNAL.test(blob)) {
    return "work";
  }
  return "schedule";
}

function lifecycleForNotification(input: NotificationEventInput): EventCandidateLifecycle {
  if (!input.fire_at) {
    return "mentioned";
  }
  const fireMs = new Date(input.fire_at).getTime();
  if (Number.isNaN(fireMs)) {
    return "mentioned";
  }
  return fireMs > Date.now() ? "scheduled" : "mentioned";
}

export function notificationToEventCandidateUpsert(
  input: NotificationEventInput,
  shadowId: string,
  ecId = resolveNotificationEventId(input),
): EventCandidateUpsertInput {
  const classified = ruleClassifyNotification(input);

  return {
    id: ecId,
    title: input.title.trim() || input.content.trim().slice(0, 80) || "알림",
    category: categoryForNotification(input),
    source: "notification",
    lifecycle: lifecycleForNotification(input),
    datetime: input.fire_at ?? undefined,
    confidence: Math.min(0.95, 0.55 + classified.base_urgency / 200),
    metadata: {
      sourceRef: NOTIFICATION_SHADOW_SOURCE_REF,
      shadowId,
      sourceApp: input.source_app,
      notificationSource: input.source,
      internalKind: input.internal_kind ?? null,
      linkId: input.link_id ?? null,
      messageId: input.message_id ?? null,
      shadowCategory: classified.category,
      shadowReason: classified.reason,
      sourceMessage: `${input.title} ${input.content}`.trim().slice(0, 240),
    },
  };
}

/** Write path — notification shadow ingest → EventCandidate SSOT. */
export function ingestNotificationEvent(
  input: NotificationEventInput,
  shadowId: string,
): EventCandidate {
  const ecId = resolveNotificationEventId(input);
  const existing = findEventCandidate(ecId);

  if (existing && isLinkReminderEvent(existing)) {
    return commitEventUpsert({
      id: existing.id,
      title: existing.title,
      category: existing.category,
      source: existing.source,
      lifecycle: existing.lifecycle,
      datetime: existing.datetime,
      confidence: existing.confidence,
      metadata: {
        ...existing.metadata,
        notificationShadowId: shadowId,
        lastNotificationAt: input.timestamp,
      },
    });
  }

  if (existing) {
    const incoming = notificationToEventCandidateUpsert(input, shadowId, ecId);
    return commitEventUpsert({
      ...incoming,
      lifecycle:
        existing.lifecycle === "scheduled" || existing.lifecycle === "active"
          ? existing.lifecycle
          : incoming.lifecycle,
      metadata: {
        ...existing.metadata,
        ...incoming.metadata,
      },
    });
  }

  return commitEventUpsert(notificationToEventCandidateUpsert(input, shadowId, ecId));
}

export function isNotificationShadowEvent(event: EventCandidate): boolean {
  return event.metadata?.sourceRef === NOTIFICATION_SHADOW_SOURCE_REF;
}

export function findEventCandidateByShadowId(shadowId: string): EventCandidate | null {
  const normalized = shadowId.trim();
  if (!normalized) {
    return null;
  }
  return (
    findEventCandidateByMetadata((metadata) => metadata.shadowId === normalized) ??
    findEventCandidateByMetadata(
      (metadata) => metadata.notificationShadowId === normalized,
    )
  );
}

function findEventCandidateByMetadata(
  predicate: (metadata: Record<string, unknown>) => boolean,
): EventCandidate | null {
  return listEventCandidates().find((event) => predicate(event.metadata ?? {})) ?? null;
}

/** Lazy migration for shadow rows ingested before EventCandidate wiring. */
export function migrateShadowRecordsToEventCandidates(
  records: ReadonlyArray<{ id: string; raw: NotificationEventInput; route: string }>,
): void {
  for (const record of records) {
    if (record.route === "drop") {
      continue;
    }
    const ecId = resolveNotificationEventId(record.raw);
    const existing = findEventCandidate(ecId);
    if (!existing) {
      ingestNotificationEvent(record.raw, record.id);
    }
  }
}
