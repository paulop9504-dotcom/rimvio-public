import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { PinEntity } from "@/lib/globe/pin-entity";
import { projectPinEntityFromCluster } from "@/lib/globe/project-pin-entity";

export function projectPinClusterFromExternalTrace(
  trace: ExternalGlobeTrace,
): PinCluster {
  return {
    pinId: `ext:${trace.traceId}`,
    eventId: `ext:${trace.eventId}`,
    title: trace.title,
    placeLabel: trace.placeLabel,
    lat: trace.lat,
    lng: trace.lng,
    dateLabel: formatPinDateLabel(trace.startedAtIso),
    startedAtIso: trace.startedAtIso,
    evidence: {
      photoCount: trace.photoCount,
      videoCount: trace.videoCount,
      chatCount: 0,
      placePinCount: trace.placeLabel.trim() ? 1 : 0,
    },
    recallLine: trace.recallLine,
    origin: "external",
    authorDisplayName: trace.authorDisplayName,
    externalTraceId: trace.traceId,
    readOnly: true,
  };
}

export function projectPinEntityFromExternalTrace(
  trace: ExternalGlobeTrace,
): PinEntity {
  const cluster = projectPinClusterFromExternalTrace(trace);
  return {
    ...projectPinEntityFromCluster(cluster, null),
    domainId: "experience",
    scope: "external",
    author: {
      userId: trace.authorUserId,
      displayName: trace.authorDisplayName,
    },
    content: trace.recallLine,
  };
}

export function projectExternalPinClusters(
  traces: readonly ExternalGlobeTrace[],
): PinCluster[] {
  return traces.map(projectPinClusterFromExternalTrace);
}
