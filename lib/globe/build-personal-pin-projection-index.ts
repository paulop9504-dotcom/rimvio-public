/**
 * Build personal pin projection index from local truth graph.
 */

import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { pinClusterToProjectionRecord } from "@/lib/globe/pin-projection-index-record";
import type { PinProjectionIndexRecord } from "@/lib/globe/pin-projection-index-types";
import { projectPinClustersFromGraph } from "@/lib/globe/project-pin-clusters";

export function buildPersonalPinProjectionIndex(input: {
  volumes: readonly ExperienceVolume[];
  eventsById: ReadonlyMap<string, EventCandidate>;
}): PinProjectionIndexRecord[] {
  const clusters = projectPinClustersFromGraph(input);
  return clusters.map((cluster) =>
    pinClusterToProjectionRecord(
      cluster,
      input.eventsById.get(cluster.eventId) ?? null,
    ),
  );
}
