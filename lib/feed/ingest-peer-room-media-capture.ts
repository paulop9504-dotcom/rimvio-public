"use client";

import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
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

function captureKindFromMedia(
  mediaKind: MediaSpacetimeContext["mediaKind"],
): FeedCaptureFragment["kind"] {
  if (mediaKind === "video") {
    return "video";
  }
  return "photo";
}

export function ingestPeerRoomMediaFromContext(input: {
  context: MediaSpacetimeContext;
  peerThreadId: string;
  userConfirmedTarget?: boolean;
}): MediaContextIngestOutcome {
  const threadId = input.peerThreadId.trim();
  const context = input.context;

  const decision = evaluateContextMatchMedia({
    context,
    peerThreadId: threadId,
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
  });

  const fragment: FeedCaptureFragment = {
    id: context.id,
    kind: captureKindFromMedia(context.mediaKind),
    capturedAtIso: context.capturedAtIso,
    mediaContextId: context.id,
    placeLabel: context.placeLabel ?? undefined,
  };

  const result = commitCaptureToEvent({
    target: event,
    match,
    createdNewEvent,
    fragment,
    userConfirmedTarget: input.userConfirmedTarget,
  });
  return attachMediaIngest(result, decision);
}

/** ROOM photo/video → Feed plan experience (planPeerThreadId lineage). */
export async function ingestPeerRoomMediaCapture(input: {
  file: File;
  peerThreadId: string;
  originRef?: string | null;
}): Promise<MediaContextIngestOutcome> {
  const threadId = input.peerThreadId.trim();
  const context = await attachMediaSpacetime({
    file: input.file,
    origin: "peer_chat",
    originRef: input.originRef?.trim() || threadId,
  });

  return ingestPeerRoomMediaFromContext({
    context,
    peerThreadId: threadId,
  });
}
