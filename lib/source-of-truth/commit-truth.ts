/**
 * Life-state SSOT — sole write path for Event Candidate store.
 * Ingest adapters and client API apply must call only these functions.
 */
import type {
  EventCandidate,
  EventCandidateLifecycle,
  EventCandidateUpsertInput,
  EventCandidateWire,
} from "@/lib/events/event-candidate";
import {
  transitionEventLifecycle as storeTransition,
  upsertEventCandidate as storeUpsert,
} from "@/lib/events/event-store";
import { validateEventCandidateWire } from "@/lib/event-kernel/schema-lock/event-schema";

export function commitEventUpsert(
  input: EventCandidateUpsertInput,
): EventCandidate {
  return storeUpsert(input);
}

export function commitEventLifecycle(
  id: string,
  lifecycle: EventCandidateLifecycle,
): EventCandidate | null {
  return storeTransition(id, lifecycle);
}

/** Client/server — apply orchestrate or hydrate wire into Event SSOT. */
export function commitEventWireFromApi(
  patch: EventCandidateWire | null | undefined,
  enrich?: { sourceMessageId?: string | null },
): EventCandidate | null {
  if (!patch?.title?.trim()) {
    return null;
  }

  const wireIssues = validateEventCandidateWire(patch);
  if (wireIssues.length > 0) {
    console.warn(
      "[commit-truth] schema-lock rejected wire",
      wireIssues.map((i) => i.code).join(","),
    );
    return null;
  }

  const metadata = { ...patch.metadata };
  const sourceMessageId = enrich?.sourceMessageId?.trim();
  if (sourceMessageId) {
    metadata.sourceMessageId = sourceMessageId;
  }

  return commitEventUpsert({
    id: patch.id?.trim() || undefined,
    title: patch.title,
    category: patch.category,
    source: patch.source ?? "message",
    lifecycle: patch.lifecycle,
    datetime: patch.datetime,
    place: patch.place,
    containerId: patch.container_id,
    confidence: patch.confidence,
    metadata,
    lifecycleUpdatedAt: patch.lifecycle_updated_at,
  });
}
