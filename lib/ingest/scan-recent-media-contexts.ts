import { listEventCandidates } from "@/lib/events/event-store";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import {
  ingestStoredMediaContext,
  isMediaContextAlreadyAttached,
} from "@/lib/ingest/ingest-stored-media-context";
import {
  isMediaContextIngestProcessed,
  markMediaContextIngestProcessed,
} from "@/lib/ingest/media-context-ingest-tracker";
import type { MediaContextIngestOutcome } from "@/lib/ingest/context-match-media-gate";
import { listMediaSpacetimeContexts } from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export const RECENT_MEDIA_SCAN_DAYS = 7;

export type ScanRecentMediaResult = {
  scanned: number;
  attached: number;
  skipped: number;
  alreadyAttached: number;
  outcomes: MediaContextIngestOutcome[];
};

function inRecentWindow(
  context: MediaSpacetimeContext,
  startMs: number,
  endMs: number,
): boolean {
  const ms = parseIsoMs(context.capturedAtIso);
  return ms !== null && ms >= startMs && ms <= endMs;
}

/** Scan last N days of local media contexts through the context-match gate. */
export async function scanRecentMediaContexts(input?: {
  now?: Date;
  windowDays?: number;
}): Promise<ScanRecentMediaResult> {
  const now = input?.now ?? new Date();
  const windowDays = input?.windowDays ?? RECENT_MEDIA_SCAN_DAYS;
  const endMs = now.getTime();
  const startMs = endMs - windowDays * 86_400_000;

  const contexts = await listMediaSpacetimeContexts();
  const events = listEventCandidates();
  const recent = contexts.filter((row) => inRecentWindow(row, startMs, endMs));

  let attached = 0;
  let skipped = 0;
  let alreadyAttached = 0;
  const outcomes: MediaContextIngestOutcome[] = [];

  for (const context of recent) {
    if (isMediaContextIngestProcessed(context.id)) {
      continue;
    }
    if (isMediaContextAlreadyAttached(context.id, events)) {
      markMediaContextIngestProcessed(context.id);
      alreadyAttached += 1;
      continue;
    }

    const outcome = ingestStoredMediaContext({ context, events });
    outcomes.push(outcome);
    markMediaContextIngestProcessed(context.id);

    if (outcome.status === "attached") {
      attached += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    scanned: recent.length,
    attached,
    skipped,
    alreadyAttached,
    outcomes,
  };
}
