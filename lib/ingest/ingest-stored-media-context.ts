import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  commitCaptureToEvent,
  type SearchCaptureIngestResult,
} from "@/lib/feed/ingest-search-capture";
import {
  attachMediaIngest,
  evaluateContextMatchMedia,
  skipMediaIngest,
  type MediaContextIngestOutcome,
} from "@/lib/ingest/context-match-media-gate";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

function captureKindFromMedia(
  mediaKind: MediaSpacetimeContext["mediaKind"],
): FeedCaptureFragment["kind"] {
  if (mediaKind === "video") {
    return "video";
  }
  return "photo";
}

export function isMediaContextAlreadyAttached(
  contextId: string,
  events: readonly EventCandidate[],
): boolean {
  const key = contextId.trim();
  if (!key) {
    return false;
  }
  for (const event of events) {
    const fragments = readFeedCaptureFragments(event);
    if (
      fragments.some(
        (row) => row.mediaContextId === key || row.id === key,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Re-run context gate for an existing MediaSpacetimeContext (7-day scan path). */
export function ingestStoredMediaContext(input: {
  context: MediaSpacetimeContext;
  events?: readonly EventCandidate[];
  userConfirmedTarget?: boolean;
}): MediaContextIngestOutcome {
  const context = input.context;
  const threadId =
    context.origin === "peer_chat" ? context.originRef?.trim() : undefined;

  const decision = evaluateContextMatchMedia({
    context,
    peerThreadId: threadId,
    events: input.events,
    userConfirmedTarget: input.userConfirmedTarget,
  });
  if (!decision.allow) {
    return skipMediaIngest(decision);
  }

  const { event, match, createdNewEvent } = resolveTargetEventFromSpacetime({
    capturedAtIso: context.capturedAtIso,
    lat: context.lat,
    lng: context.lng,
    placeLabel: context.placeLabel,
    peerThreadId: threadId,
    events: input.events,
  });

  const fragment: FeedCaptureFragment = {
    id: context.id,
    kind: captureKindFromMedia(context.mediaKind),
    capturedAtIso: context.capturedAtIso,
    mediaContextId: context.id,
    placeLabel: context.placeLabel ?? undefined,
  };

  const result: SearchCaptureIngestResult = commitCaptureToEvent({
    target: event,
    match,
    createdNewEvent,
    fragment,
    userConfirmedTarget: input.userConfirmedTarget,
  });
  return attachMediaIngest(result, decision);
}
