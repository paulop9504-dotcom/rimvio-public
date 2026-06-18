import type { EventCandidate, EventCandidateCategory } from "@/lib/events/event-candidate";
import {
  findEventBySourceMessage,
  findEventCandidate,
  findEventCandidateByMessageId,
} from "@/lib/events/event-store";
import {
  commitEventLifecycle,
  commitEventUpsert,
} from "@/lib/source-of-truth/commit-truth";
import { normalizeAnchorId } from "@/lib/events/normalize-anchor-id";

/** Upstream input signal — message layer is NOT source of truth. */
export type EventIngestSignal = {
  sourceMessage?: string | null;
  sourceMessageId?: string | null;
  eventId?: string | null;
  datetime?: string | null;
  place?: string | null;
  title?: string | null;
  category?: EventCandidateCategory;
};

function mergeMetadata(
  signal: EventIngestSignal,
  existing?: EventCandidate
): Record<string, unknown> {
  const metadata: Record<string, unknown> = { ...existing?.metadata };
  const sourceMessage = signal.sourceMessage?.trim();
  if (sourceMessage) {
    metadata.sourceMessage = sourceMessage;
  }
  const sourceMessageId = signal.sourceMessageId?.trim();
  if (sourceMessageId) {
    metadata.sourceMessageId = sourceMessageId;
  }
  return metadata;
}

function resolveEventForSignal(signal: EventIngestSignal): EventCandidate | null {
  const eventId = signal.eventId?.trim();
  if (eventId) {
    return findEventCandidate(eventId);
  }

  const sourceMessageId = signal.sourceMessageId?.trim();
  if (sourceMessageId) {
    const byMessageId = findEventCandidateByMessageId(sourceMessageId);
    if (byMessageId) {
      return byMessageId;
    }
  }

  const sourceMessage = signal.sourceMessage?.trim();
  if (sourceMessage) {
    const byMessage = findEventBySourceMessage(sourceMessage);
    if (byMessage) {
      return byMessage;
    }
  }

  return null;
}

function titleFromSignal(signal: EventIngestSignal): string {
  return (
    signal.title?.trim() ||
    signal.place?.trim() ||
    signal.sourceMessage?.trim().slice(0, 48) ||
    "일정"
  );
}

function upsertFromSignal(
  signal: EventIngestSignal,
  lifecycle: EventCandidate["lifecycle"],
  existing?: EventCandidate | null
): EventCandidate {
  if (existing) {
    return commitEventUpsert({
      id: existing.id,
      title: existing.title,
      category: existing.category,
      source: existing.source,
      lifecycle,
      datetime: signal.datetime ?? existing.datetime,
      place: signal.place ?? existing.place,
      containerId: existing.containerId,
      confidence: existing.confidence,
      metadata: mergeMetadata(signal, existing),
    });
  }

  return commitEventUpsert({
    title: titleFromSignal(signal),
    category: signal.category ?? "schedule",
    source: "message",
    lifecycle,
    datetime: signal.datetime ?? undefined,
    place: signal.place ?? undefined,
    confidence: 0.75,
    metadata: mergeMetadata(signal),
  });
}

/** signal → normalize → EventCandidateStore.upsert (confirmed) */
export function ingestConfirmationSignal(signal: EventIngestSignal): EventCandidate | null {
  const existing = resolveEventForSignal(signal);
  if (!existing && !signal.sourceMessage?.trim() && !signal.title?.trim()) {
    return null;
  }
  return upsertFromSignal(signal, "confirmed", existing);
}

/** signal → normalize → EventCandidateStore.upsert (scheduled + datetime) */
export function ingestScheduleSignal(signal: EventIngestSignal): EventCandidate | null {
  const existing = resolveEventForSignal(signal);
  if (!existing && !signal.sourceMessage?.trim() && !signal.datetime) {
    return null;
  }

  const base =
    existing ??
    upsertFromSignal({ ...signal, title: titleFromSignal(signal) }, "mentioned", null);

  return commitEventUpsert({
    id: base.id,
    title: base.title,
    category: base.category,
    source: base.source,
    lifecycle: "scheduled",
    datetime: signal.datetime ?? base.datetime,
    place: signal.place ?? base.place,
    containerId: base.containerId,
    confidence: base.confidence,
    metadata: mergeMetadata(signal, base),
  });
}

const COMPLETION_ACTION_TYPES = new Set([
  "NAVIGATE",
  "CALL",
  "CHECK",
  "TAXI",
  "TRANSIT",
  "TICKET_QR",
]);

/** ec-id → commitEventLifecycle (completed) */
export function ingestCompletionSignal(input: {
  eventId?: string | null;
  anchorId?: string | null;
  actionId?: string | null;
  actionType?: string | null;
}): EventCandidate | null {
  if (input.actionType && !COMPLETION_ACTION_TYPES.has(input.actionType)) {
    return null;
  }

  const ecId = normalizeAnchorId({
    eventId: input.eventId,
    anchorId: input.anchorId,
    actionId: input.actionId,
  });
  if (!ecId) {
    return null;
  }

  return commitEventLifecycle(ecId, "completed");
}
