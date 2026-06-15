"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { listEventCandidates } from "@/lib/events/event-store";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import {
  appendFeedCaptureFragment,
  readFeedCaptureFragments,
  wasFeedCaptureHumanVerified,
} from "@/lib/feed/feed-capture-metadata";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import { GPS_DWELL_CONFIRM_MIN_MINUTES } from "@/lib/feed/gps-dwell-constants";
import { sumGpsDwellCaptureMinutes } from "@/lib/feed/sum-gps-dwell-capture-minutes";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import {
  hasIngestedGpsDwellCluster,
  markGpsDwellClusterIngested,
} from "@/lib/feed/gps-dwell-ingest-store";
import type { GpsDwellCluster } from "@/lib/location-ping/gps-dwell-cluster-types";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function toLocalEventIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

function buildGpsDwellEventDraft(cluster: GpsDwellCluster): EventCandidate {
  const startMs = Date.parse(cluster.startIso);
  const start = Number.isNaN(startMs) ? new Date() : new Date(startMs);
  const stamp = new Date().toISOString();
  const place = cluster.placeLabel.trim();
  const title = place.includes("°")
    ? `${formatDwellMinutesLabel(cluster.dwellMinutes)}`
    : `${place} · ${formatDwellMinutesLabel(cluster.dwellMinutes)}`;

  return {
    id: `event:${cluster.id}`,
    title,
    category: place.includes("°") ? "schedule" : "travel",
    source: "system",
    lifecycle: "active",
    datetime: toLocalEventIso(start),
    place: place.includes("°") ? undefined : place,
    confidence: 0.68,
    metadata: {
      autoIngested: true,
      feedPlanEnabled: false,
      targetingSource: "gps_background",
      gpsDwellMinutes: cluster.dwellMinutes,
      gpsDwellPingCount: cluster.pingCount,
      gpsDwellLat: cluster.lat,
      gpsDwellLng: cluster.lng,
      gpsDwellPlaceLabel: cluster.placeLabel,
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function buildGpsDwellFragment(
  cluster: GpsDwellCluster,
  verified = false,
): FeedCaptureFragment {
  return {
    id: cluster.id,
    kind: "gps_dwell",
    capturedAtIso: cluster.startIso,
    placeLabel: cluster.placeLabel,
    label: formatDwellMinutesLabel(cluster.dwellMinutes),
    dwellMinutes: cluster.dwellMinutes,
    autoAttached: true,
    verified,
  };
}

function clusterAlreadyOnEvent(event: EventCandidate, clusterId: string): boolean {
  return readFeedCaptureFragments(event).some((fragment) => fragment.id === clusterId);
}

function kstDayStamp(iso: string): number | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const kstMs = ms + 9 * 60 * 60 * 1000;
  const date = new Date(kstMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function eventDayStamp(event: EventCandidate): number | null {
  if (event.datetime) {
    const fromDatetime = kstDayStamp(event.datetime);
    if (fromDatetime !== null) {
      return fromDatetime;
    }
  }
  const fragment = readFeedCaptureFragments(event).find((row) => row.kind === "gps_dwell");
  return fragment?.capturedAtIso ? kstDayStamp(fragment.capturedAtIso) : null;
}

function placeLabelsOverlap(
  eventPlace: string,
  capturedPlace: string,
): boolean {
  if (eventPlace.includes(capturedPlace) || capturedPlace.includes(eventPlace)) {
    return true;
  }
  return (
    resolvePlaceCoordinates(eventPlace).label ===
    resolvePlaceCoordinates(capturedPlace).label
  );
}

/** Reuse a human-confirmed stay card for the same place/day — no second popup. */
function findSameDayVerifiedGpsEvent(
  events: readonly EventCandidate[],
  cluster: GpsDwellCluster,
): EventCandidate | null {
  const place = cluster.placeLabel.trim();
  if (!place || place.includes("°")) {
    return null;
  }
  const clusterDay = kstDayStamp(cluster.startIso);
  if (clusterDay === null) {
    return null;
  }

  return (
    events.find((event) => {
      if (!wasFeedCaptureHumanVerified(event.metadata)) {
        return false;
      }
      const eventPlace = event.place?.trim();
      if (!eventPlace || !placeLabelsOverlap(eventPlace, place)) {
        return false;
      }
      return eventDayStamp(event) === clusterDay;
    }) ?? null
  );
}

/** Same place/day ledger — stack dwell minutes before asking once. */
function findSameDayPendingGpsAccumulationEvent(
  events: readonly EventCandidate[],
  cluster: GpsDwellCluster,
): EventCandidate | null {
  const place = cluster.placeLabel.trim();
  if (!place || place.includes("°")) {
    return null;
  }
  const clusterDay = kstDayStamp(cluster.startIso);
  if (clusterDay === null) {
    return null;
  }

  return (
    events.find((event) => {
      if (wasFeedCaptureHumanVerified(event.metadata)) {
        return false;
      }
      if (event.metadata?.targetingSource !== "gps_background") {
        return false;
      }
      const eventPlace =
        event.place?.trim() ||
        (typeof event.metadata?.gpsDwellPlaceLabel === "string"
          ? event.metadata.gpsDwellPlaceLabel.trim()
          : "");
      if (!eventPlace || !placeLabelsOverlap(eventPlace, place)) {
        return false;
      }
      return eventDayStamp(event) === clusterDay;
    }) ?? null
  );
}

function resolveGpsDwellEventTitle(
  place: string,
  totalMinutes: number,
): string {
  if (place.includes("°")) {
    return formatDwellMinutesLabel(totalMinutes);
  }
  return `${place} · ${formatDwellMinutesLabel(totalMinutes)}`;
}

function commitGpsDwellToEvent(input: {
  target: EventCandidate;
  cluster: GpsDwellCluster;
  match: ReturnType<typeof resolveSpacetimeFeedTarget>;
  createdNewEvent: boolean;
}): EventCandidate {
  const humanVerified = wasFeedCaptureHumanVerified(input.target.metadata);
  const fragment = buildGpsDwellFragment(input.cluster, humanVerified);
  const metadataWithFragment = appendFeedCaptureFragment(
    input.target.metadata,
    fragment,
  );
  const draftEvent = {
    ...input.target,
    metadata: metadataWithFragment,
  } as EventCandidate;
  const totalDwellMinutes = sumGpsDwellCaptureMinutes(draftEvent);
  const placeLabel =
    input.target.place?.trim() ||
    input.cluster.placeLabel.trim() ||
    (typeof input.target.metadata?.gpsDwellPlaceLabel === "string"
      ? input.target.metadata.gpsDwellPlaceLabel.trim()
      : "");
  const shouldAsk =
    !humanVerified && totalDwellMinutes >= GPS_DWELL_CONFIRM_MIN_MINUTES;

  const metadata = {
    ...metadataWithFragment,
    feedCapturePendingVerify: shouldAsk,
    targetingSource: input.createdNewEvent
      ? "gps_background"
      : input.target.metadata?.targetingSource,
    gpsDwellMinutes: totalDwellMinutes,
    gpsDwellPingCount:
      (typeof input.target.metadata?.gpsDwellPingCount === "number"
        ? input.target.metadata.gpsDwellPingCount
        : 0) + input.cluster.pingCount,
    gpsDwellLat: input.cluster.lat,
    gpsDwellLng: input.cluster.lng,
    gpsDwellPlaceLabel: input.cluster.placeLabel,
  };

  return commitEventUpsert({
    id: input.target.id,
    title: resolveGpsDwellEventTitle(placeLabel || "이 위치", totalDwellMinutes),
    category: input.target.category,
    source: input.target.source,
    lifecycle: input.target.lifecycle,
    datetime: input.target.datetime,
    place:
      input.target.place ??
      (input.cluster.placeLabel.includes("°") ? undefined : input.cluster.placeLabel),
    containerId: input.target.containerId,
    confidence: Math.min(0.94, input.target.confidence + (input.match ? 0.04 : 0)),
    metadata,
    lifecycleUpdatedAt: input.target.lifecycleUpdatedAt,
  });
}

export type GpsDwellIngestResult = {
  ingested: boolean;
  event: EventCandidate | null;
  cluster: GpsDwellCluster;
  createdNewEvent: boolean;
};

/** Background write — GPS dwell cluster → Feed Event (no photo required). */
export function ingestGpsDwellCluster(cluster: GpsDwellCluster): GpsDwellIngestResult {
  if (hasIngestedGpsDwellCluster(cluster.id)) {
    return { ingested: false, event: null, cluster, createdNewEvent: false };
  }

  const events = listEventCandidates();
  for (const event of events) {
    if (clusterAlreadyOnEvent(event, cluster.id)) {
      markGpsDwellClusterIngested({ clusterId: cluster.id, eventId: event.id });
      return { ingested: false, event, cluster, createdNewEvent: false };
    }
  }

  const match = resolveSpacetimeFeedTarget({
    capturedAtIso: cluster.startIso,
    lat: cluster.lat,
    lng: cluster.lng,
    placeLabel: cluster.placeLabel,
    events,
  });

  let target: EventCandidate;
  let createdNewEvent = false;

  if (match) {
    const existing = events.find((event) => event.id === match.eventId);
    if (existing) {
      target = existing;
    } else {
      target = buildGpsDwellEventDraft(cluster);
      createdNewEvent = true;
    }
  } else {
    const verifiedSameDay = findSameDayVerifiedGpsEvent(events, cluster);
    const pendingSameDay = findSameDayPendingGpsAccumulationEvent(events, cluster);
    if (verifiedSameDay) {
      target = verifiedSameDay;
    } else if (pendingSameDay) {
      target = pendingSameDay;
    } else {
      target = buildGpsDwellEventDraft(cluster);
      createdNewEvent = true;
    }
  }

  const saved = commitGpsDwellToEvent({
    target,
    cluster,
    match,
    createdNewEvent,
  });

  markGpsDwellClusterIngested({ clusterId: cluster.id, eventId: saved.id });

  return {
    ingested: true,
    event: saved,
    cluster,
    createdNewEvent,
  };
}

export function ingestGpsDwellClusters(
  clusters: readonly GpsDwellCluster[],
): GpsDwellIngestResult[] {
  return clusters
    .map((cluster) => ingestGpsDwellCluster(cluster))
    .filter((result) => result.ingested);
}
