import type { EventCandidate } from "@/lib/events/event-candidate";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { upsertPersonalGlobePin } from "@/lib/globe/personal-globe-pin-store";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import type { ExperienceBridgeSnapshot } from "@/lib/experience-bridge/experience-bridge-types";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** Participant accept → personal globe pin (same eventId, own entry lens). */
export function ensureBridgeParticipantPin(input: {
  bridge: ExperienceBridgeSnapshot;
  peerThreadId?: string | null;
}): PersonalGlobePin {
  const threadId =
    input.peerThreadId?.trim() ||
    input.bridge.peerThreadId?.trim() ||
    null;

  const event: EventCandidate = {
    ...input.bridge.eventSnapshot,
    metadata: {
      ...input.bridge.eventSnapshot.metadata,
      [EXPERIENCE_BRIDGE_META_KEYS.bridgeId]: input.bridge.eventId,
      [EXPERIENCE_BRIDGE_META_KEYS.hostUserId]: input.bridge.hostUserId,
      ...(threadId
        ? { [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: threadId }
        : {}),
      experienceBridgeParticipant: true,
    },
  };

  if (!findLifeEventCandidate(event.id)) {
    stampBridgeEventMetadata({
      event,
      bridge: input.bridge,
      role: "participant",
    });
  } else {
    stampBridgeEventMetadata({
      event: findLifeEventCandidate(event.id)!,
      bridge: input.bridge,
      role: "participant",
    });
  }

  createPersonalGlobePinFromEvent({
    event,
    experienceTitle: input.bridge.title,
    shareWithPeerThreadIds: threadId ? [threadId] : [],
  });

  const { photoCount, videoCount } = countEventMedia(event);
  const pin: PersonalGlobePin = {
    pinId: `pgpin:${event.id}`,
    eventId: event.id,
    lat: input.bridge.lat,
    lng: input.bridge.lng,
    placeLabel: input.bridge.placeLabel,
    experienceTitle: input.bridge.title,
    photoCount,
    videoCount,
    createdAtIso:
      event.datetime?.trim() ||
      input.bridge.createdAtIso ||
      new Date().toISOString(),
    acl: {
      viewerPeerThreadIds: threadId ? [threadId] : [],
    },
  };

  return upsertPersonalGlobePin(pin);
}
