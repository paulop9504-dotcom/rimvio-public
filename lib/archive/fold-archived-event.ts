import {
  appendArchivedEvent,
  findArchivedEventByEventId,
} from "@/lib/archive/archive-store";
import { buildArchivedEvent } from "@/lib/archive/build-archived-event";
import { listActionTelemetryForEvent } from "@/lib/archive/action-telemetry-store";
import { applyLearningSignals } from "@/lib/archive/learning-rollup-store";
import type { FoldArchivedEventResult } from "@/lib/archive/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type { FoldArchivedEventResult } from "@/lib/archive/types";

/** Write path: fold live EventCandidate into archive + learning rollup. */
export function foldArchivedEvent(event: EventCandidate): FoldArchivedEventResult {
  if (event.lifecycle !== "archived") {
    return { ok: false, folded: false };
  }

  const existing = findArchivedEventByEventId(event.id);
  if (existing) {
    return {
      ok: true,
      folded: true,
      archiveId: existing.archiveId,
      archivedEvent: existing,
    };
  }

  const archivedAt = new Date().toISOString();
  const archiveId = `${event.id}:archived:${event.lifecycleUpdatedAt ?? archivedAt}`;
  const telemetry = listActionTelemetryForEvent(event.id);
  const archivedEvent = buildArchivedEvent({
    event,
    telemetry,
    archivedAt,
    archiveId,
  });

  appendArchivedEvent(archivedEvent);
  applyLearningSignals(archivedEvent.learningSignals);

  return {
    ok: true,
    folded: true,
    archiveId,
    archivedEvent,
  };
}

export function isArchiveFoldComplete(event: EventCandidate): boolean {
  return typeof event.metadata?.archiveFoldedAt === "string";
}

export function isArchiveFoldPending(event: EventCandidate): boolean {
  return event.lifecycle === "archived" && !isArchiveFoldComplete(event);
}
