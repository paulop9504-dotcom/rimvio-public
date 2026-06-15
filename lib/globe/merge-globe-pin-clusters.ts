import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { PinEntity } from "@/lib/globe/pin-entity";
import { pinEntitiesToClusters } from "@/lib/globe/pin-cluster-adapter";
import { projectExternalPinClusters } from "@/lib/globe/project-external-globe-trace";
import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";

function clusterKey(cluster: PinCluster): string {
  return cluster.externalTraceId?.trim() || cluster.eventId;
}

/** Personal PinEntity projection + external read-only traces for globe hub. */
export function mergeGlobePinClusters(input: {
  personal: readonly PinCluster[];
  externalTraces?: readonly ExternalGlobeTrace[];
}): PinCluster[] {
  const external = projectExternalPinClusters(input.externalTraces ?? []);
  const seen = new Set<string>();
  const merged: PinCluster[] = [];

  for (const cluster of input.personal) {
    const key = clusterKey(cluster);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push({ ...cluster, origin: cluster.origin ?? "personal" });
  }

  for (const cluster of external) {
    const key = clusterKey(cluster);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(cluster);
  }

  return merged.sort((left, right) => {
    const leftMs = left.startedAtIso ? Date.parse(left.startedAtIso) : 0;
    const rightMs = right.startedAtIso ? Date.parse(right.startedAtIso) : 0;
    return rightMs - leftMs;
  });
}

export function mergeGlobePinEntities(input: {
  personal: readonly PinEntity[];
  externalTraces?: readonly ExternalGlobeTrace[];
}): PinEntity[] {
  const clusters = mergeGlobePinClusters({
    personal: pinEntitiesToClusters(input.personal),
    externalTraces: input.externalTraces,
  });
  const personalByEvent = new Map(input.personal.map((row) => [row.eventId, row]));

  return clusters.map((cluster) => {
    const personal = personalByEvent.get(cluster.eventId);
    if (personal) {
      return personal;
    }
    return {
      id: cluster.pinId,
      eventId: cluster.eventId,
      domainId: "experience" as const,
      scope: "external" as const,
      title: cluster.title,
      content: cluster.recallLine,
      location: {
        lat: cluster.lat,
        lng: cluster.lng,
        placeLabel: cluster.placeLabel,
      },
      author: { displayName: cluster.authorDisplayName ?? null },
      media: {
        photoCount: cluster.evidence.photoCount,
        videoCount: cluster.evidence.videoCount,
      },
      createdAtIso: cluster.startedAtIso ?? new Date(0).toISOString(),
      startedAtIso: cluster.startedAtIso,
      slots: {},
      recallLine: cluster.recallLine,
    };
  });
}

export function isExternalPinCluster(
  cluster: PinCluster | null | undefined,
): boolean {
  return cluster?.origin === "external" || cluster?.readOnly === true;
}
