/**
 * Project PinEntity from truth + existing globe read models.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildPinClusterFromEvent,
  buildPinClusterFromPersonalPin,
} from "@/lib/globe/build-pin-cluster-from-event";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import type { PinEntity } from "@/lib/globe/pin-entity";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import {
  readPinDomainId,
  readPinInferredDomainId,
  readPinScopeFromMetadata,
  readPinSlots,
} from "@/lib/globe/stamp-universal-pin-metadata";

function slotsForEntity(
  event: EventCandidate | null | undefined,
  content: string | null,
): Record<string, unknown> {
  const fromMeta = readPinSlots(event?.metadata);
  if (Object.keys(fromMeta).length > 0) {
    return fromMeta;
  }
  if (content?.trim()) {
    return { memo: content.trim().slice(0, 160) };
  }
  return {};
}

/** PinCluster + optional truth → unified PinEntity. */
export function projectPinEntityFromCluster(
  cluster: PinCluster,
  event?: EventCandidate | null,
): PinEntity {
  const metadata = event?.metadata;
  const inferred = readPinInferredDomainId(metadata);
  const slots = slotsForEntity(event ?? null, cluster.recallLine);

  return {
    id: cluster.pinId,
    eventId: cluster.eventId,
    domainId: readPinDomainId(metadata),
    scope: readPinScopeFromMetadata(metadata),
    title: cluster.title,
    content: cluster.recallLine,
    location: {
      lat: cluster.lat,
      lng: cluster.lng,
      placeLabel: cluster.placeLabel,
    },
    author: {},
    media: {
      photoCount: cluster.evidence.photoCount,
      videoCount: cluster.evidence.videoCount,
    },
    createdAtIso: cluster.startedAtIso ?? new Date(0).toISOString(),
    startedAtIso: cluster.startedAtIso,
    slots: inferred ? { ...slots, _inferredDomainId: inferred } : slots,
    recallLine: cluster.recallLine,
  };
}

export function projectPinEntityFromEvent(
  event: EventCandidate,
  pin?: PersonalGlobePin | null,
): PinEntity {
  return projectPinEntityFromCluster(buildPinClusterFromEvent(event, pin), event);
}

export function projectPinEntityFromPersonalPin(
  pin: PersonalGlobePin,
  event?: EventCandidate | null,
): PinEntity {
  return projectPinEntityFromCluster(
    buildPinClusterFromPersonalPin(pin),
    event ?? null,
  );
}

export function projectPinEntitiesFromClusters(input: {
  clusters: readonly PinCluster[];
  eventsById?: ReadonlyMap<string, EventCandidate>;
}): PinEntity[] {
  return input.clusters.map((cluster) =>
    projectPinEntityFromCluster(
      cluster,
      input.eventsById?.get(cluster.eventId) ?? null,
    ),
  );
}

/** Render path still consumes PinCluster — lossless round-trip for P1. */
export function pinEntityToCluster(entity: PinEntity): PinCluster {
  return {
    pinId: entity.id,
    eventId: entity.eventId,
    title: entity.title,
    placeLabel: entity.location.placeLabel,
    lat: entity.location.lat,
    lng: entity.location.lng,
    dateLabel: formatPinDateLabel(entity.startedAtIso),
    startedAtIso: entity.startedAtIso,
    evidence: {
      photoCount: entity.media.photoCount,
      videoCount: entity.media.videoCount,
      chatCount: 0,
      placePinCount: entity.location.placeLabel.trim() ? 1 : 0,
    },
    recallLine: entity.recallLine,
  };
}
