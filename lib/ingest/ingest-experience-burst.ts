import type { ExperienceBurstCandidate } from "@/lib/experience-gravity/cohesion-types";
import { listEventCandidates } from "@/lib/events/event-store";
import type { MediaContextIngestOutcome } from "@/lib/ingest/context-match-media-gate";
import { ingestStoredMediaContext } from "@/lib/ingest/ingest-stored-media-context";
import {
  isMediaContextIngestProcessed,
  markMediaContextIngestProcessed,
} from "@/lib/ingest/media-context-ingest-tracker";
import { listMediaSpacetimeContexts } from "@/lib/location-ping/media-context-store";

export type IngestExperienceBurstResult = {
  burstId: string;
  targetEventId: string | null;
  attached: number;
  skipped: number;
  outcomes: MediaContextIngestOutcome[];
};

/** Batch-attach burst window media when a plan/event target is known. */
export async function ingestExperienceBurst(
  burst: ExperienceBurstCandidate,
): Promise<IngestExperienceBurstResult> {
  const targetEventId = burst.targetEventId?.trim() || null;
  if (!targetEventId) {
    return {
      burstId: burst.burstId,
      targetEventId: null,
      attached: 0,
      skipped: 0,
      outcomes: [],
    };
  }

  const contexts = await listMediaSpacetimeContexts();
  const byId = new Map(contexts.map((row) => [row.id, row]));
  const events = listEventCandidates();

  let attached = 0;
  let skipped = 0;
  const outcomes: MediaContextIngestOutcome[] = [];

  for (const contextId of burst.contextIds) {
    const context = byId.get(contextId);
    if (!context) {
      continue;
    }
    if (isMediaContextIngestProcessed(contextId)) {
      continue;
    }

    const outcome = ingestStoredMediaContext({ context, events });
    outcomes.push(outcome);
    markMediaContextIngestProcessed(contextId);

    if (outcome.status === "attached") {
      attached += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    burstId: burst.burstId,
    targetEventId,
    attached,
    skipped,
    outcomes,
  };
}
