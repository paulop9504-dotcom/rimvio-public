/**
 * PinProjectionIndexRecord ↔ PinEntity / PinCluster adapters.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { globeTraceCellKey } from "@/lib/globe/globe-trace-cell";
import {
  GLOBE_CONTEXT_VISIBILITY_EXTERNAL,
  GLOBE_CONTEXT_VISIBILITY_PRIVATE,
} from "@/lib/globe/globe-context-visibility";
import type { PinEntity } from "@/lib/globe/pin-entity";
import type { PinProjectionIndexRecord } from "@/lib/globe/pin-projection-index-types";
import { projectPinEntityFromCluster } from "@/lib/globe/project-pin-entity";
import {
  readPinDomainId,
  readPinScopeFromMetadata,
} from "@/lib/globe/stamp-universal-pin-metadata";

export function pinClusterToProjectionRecord(
  cluster: PinCluster,
  event?: EventCandidate | null,
): PinProjectionIndexRecord {
  const metadata = event?.metadata;
  const visibility =
    metadata?.globeContextVisibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL
      ? GLOBE_CONTEXT_VISIBILITY_EXTERNAL
      : GLOBE_CONTEXT_VISIBILITY_PRIVATE;

  return {
    eventId: cluster.eventId,
    pinId: cluster.pinId,
    lat: cluster.lat,
    lng: cluster.lng,
    placeLabel: cluster.placeLabel,
    title: cluster.title,
    domainId: readPinDomainId(metadata),
    scope: readPinScopeFromMetadata(metadata),
    visibility,
    startedAtIso: cluster.startedAtIso,
    cellKey: globeTraceCellKey(cluster.lat, cluster.lng),
    origin: cluster.origin ?? "personal",
    photoCount: cluster.evidence.photoCount,
    videoCount: cluster.evidence.videoCount,
  };
}

export function projectionRecordToPinEntity(
  record: PinProjectionIndexRecord,
  event?: EventCandidate | null,
): PinEntity {
  const cluster: PinCluster = {
    pinId: record.pinId,
    eventId: record.eventId,
    title: record.title,
    placeLabel: record.placeLabel,
    lat: record.lat,
    lng: record.lng,
    dateLabel: null,
    startedAtIso: record.startedAtIso,
    evidence: {
      photoCount: record.photoCount,
      videoCount: record.videoCount,
      chatCount: 0,
      placePinCount: 0,
    },
    recallLine: null,
    origin: record.origin,
    readOnly: record.origin === "external",
  };
  return projectPinEntityFromCluster(cluster, event);
}

export function personalGlobePinRowToProjectionRecord(input: {
  eventId: string;
  pin: {
    pinId?: string;
    lat?: number;
    lng?: number;
    placeLabel?: string;
    experienceTitle?: string;
    photoCount?: number;
    videoCount?: number;
    createdAtIso?: string;
  };
  visibility?: string | null;
  domainId?: PinProjectionIndexRecord["domainId"];
}): PinProjectionIndexRecord | null {
  const lat = input.pin.lat;
  const lng = input.pin.lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const visibility =
    input.visibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL
      ? GLOBE_CONTEXT_VISIBILITY_EXTERNAL
      : GLOBE_CONTEXT_VISIBILITY_PRIVATE;

  return {
    eventId: input.eventId,
    pinId: input.pin.pinId?.trim() || `pin:${input.eventId}`,
    lat,
    lng,
    placeLabel: input.pin.placeLabel?.trim() || "장소",
    title: input.pin.experienceTitle?.trim() || "경험",
    domainId: input.domainId ?? "experience",
    scope: visibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL ? "external" : "internal",
    visibility,
    startedAtIso: input.pin.createdAtIso?.trim() || null,
    cellKey: globeTraceCellKey(lat, lng),
    origin: "personal",
    photoCount: input.pin.photoCount ?? 0,
    videoCount: input.pin.videoCount ?? 0,
  };
}

export function externalTraceToProjectionRecord(
  trace: import("@/lib/globe/external-globe-trace-types").ExternalGlobeTrace,
): PinProjectionIndexRecord {
  return {
    eventId: trace.eventId,
    pinId: `ext:${trace.traceId}`,
    lat: trace.lat,
    lng: trace.lng,
    placeLabel: trace.placeLabel,
    title: trace.title,
    domainId: "experience",
    scope: "external",
    visibility: GLOBE_CONTEXT_VISIBILITY_EXTERNAL,
    startedAtIso: trace.startedAtIso ?? null,
    cellKey: trace.pioneerCell ?? globeTraceCellKey(trace.lat, trace.lng),
    origin: "external",
    photoCount: trace.photoCount,
    videoCount: trace.videoCount,
    authorUserId: trace.authorUserId,
    authorDisplayName: trace.authorDisplayName,
  };
}

export function projectionRecordToExternalTrace(
  record: PinProjectionIndexRecord,
): import("@/lib/globe/external-globe-trace-types").ExternalGlobeTrace | null {
  if (record.origin !== "external") {
    return null;
  }
  const traceId = record.pinId.startsWith("ext:")
    ? record.pinId.slice(4)
    : record.pinId;
  return {
    traceId,
    eventId: record.eventId,
    title: record.title,
    placeLabel: record.placeLabel,
    lat: record.lat,
    lng: record.lng,
    authorUserId: record.authorUserId ?? "",
    authorDisplayName: record.authorDisplayName ?? null,
    photoCount: record.photoCount,
    videoCount: record.videoCount,
    startedAtIso: record.startedAtIso,
    recallLine: record.title,
    pioneerCell: record.cellKey,
  };
}
