import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import type { PinCluster, PinClusterEvidence } from "@/lib/globe/pin-cluster-types";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readTripLegFromEvent } from "@/lib/globe/trip-leg-metadata";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import { spreadOverlappingPinCoords } from "@/lib/globe/spread-overlapping-pin-coords";
import { buildSpatialGlobeView } from "@/lib/experience-graph/resolve-place-coordinates";
import { globeViewForSharedPins } from "@/lib/peer-chat/globe-view-for-shared-pins";
import { resolveGlobeStartupView } from "@/lib/globe/resolve-globe-startup-view";

function evidenceFromEvent(event: EventCandidate | null | undefined): PinClusterEvidence {
  const { photoCount, videoCount } = countEventMedia(event);
  const captures = readFeedCaptureFragments(event);
  const chatCount = captures.filter(
    (row) => row.kind === "memo" || row.kind === "link",
  ).length;
  const placePinCount =
    captures.filter((row) => row.kind === "gps_dwell").length +
    (event?.place?.trim() ? 1 : 0);
  return { photoCount, videoCount, chatCount, placePinCount };
}

function clusterFromVolume(input: {
  volume: ExperienceVolume;
  event: EventCandidate | null | undefined;
}): PinCluster {
  const event = input.event;
  const coords = event
    ? resolveEventGlobeCoords(event)
    : {
        lat: 37.5665,
        lng: 126.978,
        placeLabel: input.volume.space.label,
      };
  const startedAtIso =
    input.volume.time.startIso?.trim() || event?.datetime?.trim() || null;

  return {
    pinId: `pcluster:${input.volume.sourceEventId}`,
    eventId: input.volume.sourceEventId,
    title: input.volume.title.trim() || event?.title.trim() || "경험",
    placeLabel: coords.placeLabel,
    lat: coords.lat,
    lng: coords.lng,
    dateLabel: formatPinDateLabel(startedAtIso),
    startedAtIso,
    evidence: evidenceFromEvent(event),
    recallLine: null,
  };
}

function clusterFromPersonalPin(
  pin: ReturnType<typeof listPersonalGlobePins>[number],
  event: EventCandidate | null | undefined,
): PinCluster {
  const evidence = evidenceFromEvent(event);
  const startedAtIso =
    event?.datetime?.trim() || pin.createdAtIso;
  return {
    pinId: pin.pinId,
    eventId: pin.eventId,
    title: pin.experienceTitle,
    placeLabel: pin.placeLabel,
    lat: pin.lat,
    lng: pin.lng,
    dateLabel: formatPinDateLabel(startedAtIso),
    startedAtIso,
    evidence: {
      photoCount: Math.max(evidence.photoCount, pin.photoCount),
      videoCount: Math.max(evidence.videoCount, pin.videoCount),
      chatCount: evidence.chatCount,
      placePinCount: evidence.placePinCount,
    },
    recallLine: null,
  };
}

/** EventCandidate volumes → one pin per experience (Pin Cluster). */
export function projectPinClustersFromGraph(input: {
  volumes: readonly ExperienceVolume[];
  eventsById: ReadonlyMap<string, EventCandidate>;
}): PinCluster[] {
  const byEventId = new Map<string, PinCluster>();

  for (const volume of input.volumes) {
    const event = input.eventsById.get(volume.sourceEventId) ?? null;
    if (isGlobeContextRemoved(event)) {
      continue;
    }
    byEventId.set(volume.sourceEventId, clusterFromVolume({ volume, event }));
  }

  for (const pin of listPersonalGlobePins()) {
    const event = input.eventsById.get(pin.eventId) ?? null;
    if (isGlobeContextRemoved(event)) {
      continue;
    }
    if (byEventId.has(pin.eventId)) {
      const existing = byEventId.get(pin.eventId)!;
      byEventId.set(
        pin.eventId,
        clusterFromPersonalPin(pin, input.eventsById.get(pin.eventId) ?? null),
      );
      if (!existing.dateLabel && byEventId.get(pin.eventId)!.dateLabel) {
        // keep merged cluster
      }
      continue;
    }
    byEventId.set(
      pin.eventId,
      clusterFromPersonalPin(pin, input.eventsById.get(pin.eventId) ?? null),
    );
  }

  return Array.from(byEventId.values()).sort((left, right) => {
    const leftMs = left.startedAtIso ? Date.parse(left.startedAtIso) : 0;
    const rightMs = right.startedAtIso ? Date.parse(right.startedAtIso) : 0;
    return rightMs - leftMs;
  });
}

function pinKindFromEvidence(evidence: PinClusterEvidence): ClassifiedGlobePin["kind"] {
  if (evidence.videoCount > 0 && evidence.photoCount === 0) {
    return "video";
  }
  if (evidence.photoCount > 0) {
    return "photo";
  }
  return "place";
}

export function projectPinClusterClassifiedPin(
  cluster: PinCluster,
  event?: EventCandidate | null,
): ClassifiedGlobePin {
  const map = projectLatLngToMapPercent(cluster.lat, cluster.lng);
  const tripLeg = readTripLegFromEvent(event)?.leg;
  const isGhost = cluster.variant === "bridge_ghost";
  return {
    id: cluster.pinId,
    kind: pinKindFromEvidence(cluster.evidence),
    label: isGhost
      ? cluster.recallLine?.trim() || cluster.title
      : cluster.title,
    lat: cluster.lat,
    lng: cluster.lng,
    pinX: map.x,
    pinY: map.y,
    sourceEventId: cluster.eventId,
    emphasis: isGhost || tripLeg === "departure" ? "related" : "primary",
    pinShape: isGhost ? "dot" : "slot",
    tripLeg,
    slot: isGhost
      ? undefined
      : {
          experienceTitle: cluster.title,
          photoCount: cluster.evidence.photoCount,
          videoCount: cluster.evidence.videoCount,
        },
  };
}

export function projectPinClusterClassifiedPins(
  clusters: readonly PinCluster[],
  eventsById?: ReadonlyMap<string, EventCandidate>,
): ClassifiedGlobePin[] {
  const base = clusters.map((cluster) =>
    projectPinClusterClassifiedPin(
      cluster,
      eventsById?.get(cluster.eventId) ?? null,
    ),
  );
  const spread = spreadOverlappingPinCoords(
    base.map((pin) => ({ id: pin.id, lat: pin.lat, lng: pin.lng })),
  );
  const spreadById = new Map(spread.map((row) => [row.id, row]));

  return base.map((pin) => {
    const layout = spreadById.get(pin.id);
    if (!layout || layout.overlapGroupSize <= 1) {
      return pin;
    }
    const map = projectLatLngToMapPercent(layout.spreadLat, layout.spreadLng);
    return {
      ...pin,
      lat: layout.spreadLat,
      lng: layout.spreadLng,
      pinX: map.x,
      pinY: map.y,
    };
  });
}

export function globeViewForPinClusters(
  clusters: readonly PinCluster[],
): SpatialGlobeView {
  const startup = resolveGlobeStartupView(clusters);
  if (!startup) {
    return globeViewForSharedPins([]);
  }
  const zoom =
    startup.level === "city"
      ? 1.35
      : startup.level === "neighborhood"
        ? 1.65
        : 1.15;
  return buildSpatialGlobeView({
    lat: startup.lat,
    lng: startup.lng,
    placeLabel: startup.placeLabel,
    zoom,
  });
}

export function findPinClusterByEventId(
  clusters: readonly PinCluster[],
  eventId: string | null | undefined,
): PinCluster | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  return clusters.find((row) => row.eventId === key) ?? null;
}

export function findPinClusterByPinId(
  clusters: readonly PinCluster[],
  pinId: string | null | undefined,
): PinCluster | null {
  const key = pinId?.trim();
  if (!key) {
    return null;
  }
  return clusters.find((row) => row.pinId === key) ?? null;
}
