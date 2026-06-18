"use client";

import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { commitCaptureToEvent } from "@/lib/feed/ingest-search-capture";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import type { PeerGlobePinPayload } from "@/lib/peer-chat/globe-pin-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** 우리 지구 핀 → 내 홈 지구본 + Feed 맥락 (동행은 planPeerThreadId로만 연결). */
export function mirrorSharedGlobePinToPersonalGlobe(input: {
  payload: PeerGlobePinPayload;
  peerThreadId: string;
  peerDisplayName?: string | null;
}): PersonalGlobePin {
  const threadId = input.peerThreadId.trim();
  if (!threadId) {
    throw new Error("peerThreadId required");
  }

  const capturedAtIso =
    input.payload.capturedAtIso.trim() || new Date().toISOString();
  const placeLabel =
    input.payload.placeLabel.trim() ||
    `${input.payload.lat.toFixed(4)}°, ${input.payload.lng.toFixed(4)}°`;

  const resolved = resolveTargetEventFromSpacetime({
    capturedAtIso,
    lat: input.payload.lat,
    lng: input.payload.lng,
    placeLabel,
    memoText: input.payload.note,
    peerThreadId: threadId,
  });

  const lineageMeta: Record<string, unknown> = {
    globePlaceConfirmed: true,
    globePlaceLat: input.payload.lat,
    globePlaceLng: input.payload.lng,
    globePlaceLabel: placeLabel,
    globePlaceCardLat: input.payload.lat,
    globePlaceCardLng: input.payload.lng,
    globePlaceCardLabel: placeLabel,
    sharedGlobePinId: input.payload.pinId,
    planPeerThreadId: threadId,
    targetingSource: "peer_shared_globe",
  };

  const peerName = input.peerDisplayName?.trim();
  if (peerName) {
    lineageMeta.planPeerDisplayName = peerName;
    lineageMeta.planMode = "group";
  }

  let event = resolved.event;

  if (input.payload.imageUrl) {
    const fragment: FeedCaptureFragment = {
      id: input.payload.pinId,
      kind: input.payload.mediaKind === "video" ? "video" : "photo",
      capturedAtIso,
      placeLabel,
      url: input.payload.imageUrl,
    };
    const result = commitCaptureToEvent({
      target: {
        ...event,
        place: placeLabel,
        metadata: {
          ...event.metadata,
          ...lineageMeta,
        },
      },
      match: resolved.match,
      createdNewEvent: resolved.createdNewEvent,
      fragment,
      userConfirmedTarget: true,
    });
    event = result.event;
  } else {
    event = commitEventUpsert({
      ...event,
      place: placeLabel,
      metadata: {
        ...event.metadata,
        ...lineageMeta,
      },
    });
  }

  const { pin } = createPersonalGlobePinFromEvent({
    event,
    experienceTitle: placeLabel,
    shareWithPeerThreadIds: [threadId],
  });

  return syncPersonalGlobePinFromEvent(event.id) ?? pin;
}
