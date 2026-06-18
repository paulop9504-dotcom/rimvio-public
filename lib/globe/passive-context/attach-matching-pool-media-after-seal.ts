"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  appendFeedCaptureFragment,
} from "@/lib/feed/feed-capture-metadata";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { listEventMediaPoolMatches } from "@/lib/globe/passive-context/list-event-media-pool-matches";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { findEventCandidate } from "@/lib/events/event-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { saveMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

const MAX_AUTO_ATTACH = 12;

function captureKindFromContext(
  context: MediaSpacetimeContext,
): FeedCaptureFragment["kind"] {
  return context.mediaKind === "video" ? "video" : "photo";
}

/** After verify seal — attach spacetime-matching staged photos (client IDB). */
export async function attachMatchingPoolMediaAfterSeal(
  eventId: string,
): Promise<number> {
  const event = findEventCandidate(eventId.trim());
  if (!event) {
    return 0;
  }

  const matches = listEventMediaPoolMatches(event).slice(0, MAX_AUTO_ATTACH);
  if (matches.length === 0) {
    return 0;
  }

  let metadata = event.metadata ?? {};
  let attached = 0;

  for (const row of matches) {
    const attachedContext: MediaSpacetimeContext = {
      ...row,
      poolStatus: "attached",
      expiresAtIso: null,
      origin: "feed_capture",
      originRef: event.id,
    };
    await saveMediaSpacetimeContext(attachedContext);

    const fragment: FeedCaptureFragment = {
      id: row.id,
      kind: captureKindFromContext(row),
      capturedAtIso: row.capturedAtIso,
      mediaContextId: row.id,
      placeLabel: row.placeLabel ?? undefined,
      verified: true,
      autoAttached: false,
    };
    metadata = appendFeedCaptureFragment(metadata, fragment);
    attached += 1;
  }

  if (attached === 0) {
    return 0;
  }

  const stamp = new Date().toISOString();
  const saved = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata,
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });

  createPersonalGlobePinFromEvent({ event: saved });
  syncPersonalGlobePinFromEvent(saved.id);
  return attached;
}
