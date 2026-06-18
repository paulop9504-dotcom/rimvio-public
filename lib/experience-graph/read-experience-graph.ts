import { listEventCandidates } from "@/lib/events/event-store";
import {
  buildExperienceGraphFromEvents,
  indexExperienceVolumesByEventId,
} from "@/lib/experience-graph/build-experience-graph";
import type { ExperienceGraphProjection } from "@/lib/experience-graph/experience-volume-types";

/** Read path — rebuild graph from Event SSOT only. */
export function readExperienceGraph(now = new Date()): ExperienceGraphProjection {
  return buildExperienceGraphFromEvents(listEventCandidates(), now);
}

export function readExperienceVolumeByEventId(eventId: string, now = new Date()) {
  const graph = readExperienceGraph(now);
  return indexExperienceVolumesByEventId(graph).get(eventId) ?? null;
}
