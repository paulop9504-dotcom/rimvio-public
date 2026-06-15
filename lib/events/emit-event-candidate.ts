import {
  detectEventCandidate,
  type EventCandidate,
  type EventCandidateDraft,
  type EventCandidateWire,
} from "@/lib/events/event-candidate";
import { ingestMarbleWire } from "@/lib/inside-out/marble-ingest";

export function toEventCandidateWire(record: EventCandidate): EventCandidateWire {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    source: record.source,
    lifecycle: record.lifecycle,
    datetime: record.datetime,
    place: record.place,
    container_id: record.containerId,
    confidence: record.confidence,
    metadata: record.metadata,
    lifecycle_updated_at: record.lifecycleUpdatedAt,
  };
}

/** Materialize a detected draft into API wire (server-safe, no localStorage). */
export function emitEventCandidate(draft: EventCandidateDraft | null): EventCandidateWire | null {
  if (!draft) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const record: EventCandidate = {
    id: `ec-${crypto.randomUUID()}`,
    ...draft,
    lifecycleUpdatedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return toEventCandidateWire(record);
}

/** Pipeline entry — detect then emit. */
export function detectAndEmitEventCandidate(input: {
  message: string;
  referenceDate: string;
  containerId?: string | null;
  now?: Date;
}): EventCandidateWire | null {
  const draft = detectEventCandidate({
    message: input.message,
    referenceDate: input.referenceDate,
    containerId: input.containerId,
    now: input.now,
  });
  return emitEventCandidate(draft);
}

/** Orchestrator/OCR apply — canonical SENSE path via `commitMarbleWire`. */
export function applyEventCandidateUpsertFromApi(
  patch: EventCandidateWire | null | undefined,
  enrich?: { sourceMessageId?: string | null },
) {
  return ingestMarbleWire(patch, {
    channel: "orchestrator",
    sourceMessageId: enrich?.sourceMessageId ?? null,
  });
}
