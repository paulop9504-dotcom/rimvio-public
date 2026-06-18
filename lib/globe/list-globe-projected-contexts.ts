import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { projectPinClustersFromGraph } from "@/lib/globe/project-pin-clusters";

export type GlobeProjectedContextEntry = {
  eventId: string;
  pinId: string;
  title: string;
  place: string;
  dateLabel: string | null;
  photoCount: number;
  videoCount: number;
  lat: number;
  lng: number;
  sortMs: number;
};

function parseMs(iso: string | null | undefined): number {
  if (!iso?.trim()) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function clusterToEntry(cluster: PinCluster): GlobeProjectedContextEntry {
  return {
    eventId: cluster.eventId,
    pinId: cluster.pinId,
    title: cluster.title,
    place: cluster.placeLabel,
    dateLabel: cluster.dateLabel,
    photoCount: cluster.evidence.photoCount,
    videoCount: cluster.evidence.videoCount,
    lat: cluster.lat,
    lng: cluster.lng,
    sortMs: parseMs(cluster.startedAtIso),
  };
}

/** Every experience pin currently projected on the personal globe. */
export function listGlobeProjectedContexts(input: {
  events: readonly EventCandidate[];
  volumes: readonly ExperienceVolume[];
  eventsById?: ReadonlyMap<string, EventCandidate>;
}): GlobeProjectedContextEntry[] {
  const eventsById =
    input.eventsById ??
    new Map(input.events.map((event) => [event.id, event] as const));

  const clusters = projectPinClustersFromGraph({
    volumes: input.volumes,
    eventsById,
  });

  return clusters
    .filter((cluster) => {
      const event = eventsById.get(cluster.eventId) ?? null;
      return !isGlobeContextRemoved(event);
    })
    .map(clusterToEntry)
    .sort((left, right) => right.sortMs - left.sortMs);
}

export function findGlobeProjectedContextEntry(
  entries: readonly GlobeProjectedContextEntry[],
  eventId: string,
): GlobeProjectedContextEntry | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }
  return entries.find((row) => row.eventId === key) ?? null;
}
