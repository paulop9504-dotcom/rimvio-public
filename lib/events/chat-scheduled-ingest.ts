import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import type {
  EventCandidate,
  EventCandidateCategory,
} from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import {
  commitEventLifecycle,
  commitEventUpsert,
} from "@/lib/source-of-truth/commit-truth";

export const CHAT_SCHEDULED_SOURCE_REF = "chat-scheduled";

const TRAVEL_SIGNAL = /(?:공항|항공|여행|출장|탑승|비행|체크인)/iu;
const WORK_SIGNAL = /(?:업무|보고|출근|deadline|마감|미팅|회의)/iu;

export function eventIdForChatScheduled(messageId: string): string {
  return `ec-chat-${messageId.trim()}`;
}

function categoryForScheduledTitle(title: string): EventCandidateCategory {
  if (TRAVEL_SIGNAL.test(title)) {
    return "travel";
  }
  if (WORK_SIGNAL.test(title)) {
    return "work";
  }
  return "schedule";
}

export function ingestChatScheduledEvent(input: {
  messageId: string;
  extracted: ConfirmationExtractedData;
  sourceMessage?: string;
  scopeId?: string;
  peerThreadId?: string | null;
  peerDisplayName?: string | null;
}): EventCandidate | null {
  const datetime = input.extracted.datetime?.trim();
  if (!datetime) {
    return null;
  }

  const title =
    input.extracted.place_name?.trim() ||
    input.extracted.schedule_note?.trim() ||
    input.extracted.address?.trim() ||
    "일정";
  const place =
    input.extracted.place_name?.trim() ||
    input.extracted.address?.trim() ||
    undefined;

  return commitEventUpsert({
    id: eventIdForChatScheduled(input.messageId),
    title,
    category: categoryForScheduledTitle(title),
    source: "message",
    lifecycle: "scheduled",
    datetime,
    place,
    confidence: 0.86,
    metadata: {
      sourceRef: CHAT_SCHEDULED_SOURCE_REF,
      sourceMessageId: input.messageId,
      messageId: input.messageId,
      scopeId: input.scopeId ?? null,
      peerThreadId: input.peerThreadId?.trim() || null,
      peerDisplayName: input.peerDisplayName?.trim() || null,
      sourceMessage: input.sourceMessage?.trim() || title,
      scheduleNote: input.extracted.schedule_note ?? null,
      url: input.extracted.url ?? null,
      phone: input.extracted.phone ?? null,
    },
  });
}

export function archiveChatScheduledEvent(messageId: string): EventCandidate | null {
  const eventId = eventIdForChatScheduled(messageId);
  const existing = findEventCandidate(eventId);
  if (!existing) {
    return null;
  }
  if (existing.lifecycle === "archived") {
    return existing;
  }
  return commitEventLifecycle(eventId, "archived");
}

export function completeChatScheduledEvent(messageId: string): EventCandidate | null {
  const eventId = eventIdForChatScheduled(messageId);
  const existing = findEventCandidate(eventId);
  if (!existing) {
    return null;
  }
  if (existing.lifecycle === "completed" || existing.lifecycle === "archived") {
    return existing;
  }
  return commitEventLifecycle(eventId, "completed");
}

export function isChatScheduledEvent(event: EventCandidate): boolean {
  return event.metadata?.sourceRef === CHAT_SCHEDULED_SOURCE_REF;
}

export function migratePendingChatScheduledToEventCandidates(
  records: ReadonlyArray<{
    messageId: string;
    extracted: ConfirmationExtractedData;
    scopeId: string;
  }>,
): void {
  for (const record of records) {
    const eventId = eventIdForChatScheduled(record.messageId);
    const existing = findEventCandidate(eventId);
    if (!existing || existing.lifecycle === "archived") {
      ingestChatScheduledEvent({
        messageId: record.messageId,
        extracted: record.extracted,
        scopeId: record.scopeId,
      });
    }
  }
}
