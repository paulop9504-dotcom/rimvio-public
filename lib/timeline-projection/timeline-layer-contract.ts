/**
 * Timeline Projection — display layer only (frozen contract).
 *
 * One-way flow (no cycles):
 *   Event SSOT → decision stack (opportunity / behavior / notification) → ContainerRoute[]
 *   ContainerRoute[] → timeline projection (read-only view)
 *
 * Forbidden:
 * - Timeline output feeding decision, schedule ingest, or dock writes
 * - Any SSOT / schedule write from this folder
 */
export const TIMELINE_LAYER_CONTRACT = {
  version: "1.0.0",
  role: "display-only",
  reads: ["ContainerRoute[]", "EventCandidate (resolve by ecId)"] as const,
  writes: [] as const,
} as const;

/** Symbols that must not appear in timeline-projection source (write / ingest paths). */
export const TIMELINE_FORBIDDEN_WRITE_SYMBOLS = [
  "commitEventUpsert",
  "commitEventLifecycle",
  "commitEventWireFromApi",
  "upsertEventCandidate",
  "transitionEventLifecycle",
  "writeEventCandidatesRaw",
  "ingestScheduleSignal",
  "ingestConfirmationSignal",
  "ingestCompletionSignal",
  "replaceEventCandidatesForTests",
] as const;

/** Upstream modules that must not import timeline display APIs (no decision feedback). */
export const TIMELINE_FORBIDDEN_IMPORTER_PREFIXES = [
  "lib/opportunity-engine/",
  "lib/behavior-engine/",
  "lib/notification-shadow/",
  "lib/container-rework/route-container-rework",
  "lib/schedule/",
  "lib/events/event-ingest-pipeline",
  "lib/source-of-truth/",
] as const;
