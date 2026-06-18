/**
 * Globe PinEntity projection — truth graph → spatial read model (via PinProjectionIndex).
 * @see docs/RFC_UNIVERSAL_PIN_SYSTEM.md
 */

import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildPersonalPinProjectionIndex } from "@/lib/globe/build-personal-pin-projection-index";
import {
  matchesGlobeContextPeopleFilter,
  type GlobeContextPeopleFilter,
} from "@/lib/globe/globe-context-people-filter";
import {
  matchesGlobeContextTimeFilter,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import type { PinEntity } from "@/lib/globe/pin-entity";
import { projectionRecordToPinEntity } from "@/lib/globe/pin-projection-index-record";
import { queryPinProjectionIndex } from "@/lib/globe/query-pin-projection-index";
import { projectPinClustersFromGraph } from "@/lib/globe/project-pin-clusters";
import { projectPinEntitiesFromClusters } from "@/lib/globe/project-pin-entity";

/** @deprecated Prefer buildPersonalPinProjectionIndex + queryPinProjectionIndex. */
export function projectGlobePinEntitiesFromGraph(input: {
  volumes: readonly ExperienceVolume[];
  eventsById: ReadonlyMap<string, EventCandidate>;
}): PinEntity[] {
  const clusters = projectPinClustersFromGraph(input);
  return projectPinEntitiesFromClusters({
    clusters,
    eventsById: input.eventsById,
  });
}

export function filterGlobePinEntities(input: {
  entities: readonly PinEntity[];
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  eventsById: ReadonlyMap<string, EventCandidate>;
}): PinEntity[] {
  const timeFilter = input.timeFilter ?? "all";
  const peopleFilter = input.peopleFilter ?? null;

  return input.entities.filter(
    (entity) =>
      matchesGlobeContextTimeFilter(entity.startedAtIso, timeFilter) &&
      matchesGlobeContextPeopleFilter(entity.eventId, peopleFilter, input.eventsById),
  );
}

export function projectFilteredGlobePinEntities(input: {
  volumes: readonly ExperienceVolume[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
}): PinEntity[] {
  const records = buildPersonalPinProjectionIndex({
    volumes: input.volumes,
    eventsById: input.eventsById,
  });
  const slice = queryPinProjectionIndex({
    records,
    timeFilter: input.timeFilter,
    peopleFilter: input.peopleFilter,
    eventsById: input.eventsById,
  });
  return slice.records.map((record) =>
    projectionRecordToPinEntity(
      record,
      input.eventsById.get(record.eventId) ?? null,
    ),
  );
}
