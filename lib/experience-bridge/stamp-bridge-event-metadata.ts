"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExperienceBridgeSnapshot } from "@/lib/experience-bridge/experience-bridge-types";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { readLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Persist bridge link on local event — host + invitee can publish/sync media. */
export function stampBridgeEventMetadata(input: {
  event: EventCandidate;
  bridge: ExperienceBridgeSnapshot;
  role: "host" | "participant";
}): EventCandidate {
  const meta = input.event.metadata ?? {};
  const bridgeId = input.bridge.eventId.trim();
  const hostUserId = input.bridge.hostUserId.trim();
  const peerThreadId = input.bridge.peerThreadId?.trim() || undefined;
  const participant = input.role === "participant";

  const alreadyStamped =
    meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === bridgeId &&
    meta[EXPERIENCE_BRIDGE_META_KEYS.hostUserId] === hostUserId &&
    (peerThreadId
      ? meta[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId] === peerThreadId
      : !meta[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]) &&
    (participant
      ? meta.experienceBridgeParticipant === true
      : meta.experienceBridgeHost === true);

  if (alreadyStamped) {
    return input.event;
  }

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: {
      ...input.event.metadata,
      [EXPERIENCE_BRIDGE_META_KEYS.bridgeId]: input.bridge.eventId,
      [EXPERIENCE_BRIDGE_META_KEYS.hostUserId]: input.bridge.hostUserId,
      ...(input.bridge.peerThreadId?.trim()
        ? { [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: input.bridge.peerThreadId.trim() }
        : {}),
      ...(input.role === "participant"
        ? { experienceBridgeParticipant: true }
        : { experienceBridgeHost: true }),
    },
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });
}

export function isBridgeLinkedEventId(eventId: string): boolean {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  if (readLocalBridgeState(key)) {
    return true;
  }
  const event = findLifeEventCandidate(key);
  if (!event) {
    return false;
  }
  if (
    event.metadata?.experienceBridgeParticipant === true ||
    event.metadata?.experienceBridgeHost === true
  ) {
    return true;
  }
  return typeof event.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string";
}
