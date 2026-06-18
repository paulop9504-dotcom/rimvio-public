"use client";

import { useMemo } from "react";
import {
  buildExperienceGraphFromEvents,
  indexExperienceVolumesByEventId,
} from "@/lib/experience-graph/build-experience-graph";
import type {
  ExperienceGraphProjection,
  ExperienceVolume,
} from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type ExperienceGraphFeedState = {
  graph: ExperienceGraphProjection;
  volumesByEventId: ReadonlyMap<string, ExperienceVolume>;
};

/** Client read — rebuild Experience Graph from Event SSOT snapshot. */
export function useExperienceGraph(
  eventsById?: ReadonlyMap<string, EventCandidate>,
): ExperienceGraphFeedState {
  return useMemo(() => {
    const events = eventsById ? Array.from(eventsById.values()) : [];
    const graph = buildExperienceGraphFromEvents(events);
    return {
      graph,
      volumesByEventId: indexExperienceVolumesByEventId(graph),
    };
  }, [eventsById]);
}
