#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildExperienceGraphFromEvents } from "../lib/experience-graph";
import {
  GLOBE_DEMO_EVENT_IDS,
  GLOBE_DEMO_TRIP_REF,
} from "../lib/experience-graph/seed-globe-demo-events";
import {
  projectPinClustersFromGraph,
  projectPinClusterClassifiedPins,
} from "../lib/globe/project-pin-clusters";
import {
  projectTripLegArcs,
  projectGlobeTripArcs,
  projectFocusedContextHubArc,
  projectTripLegBar,
} from "../lib/globe/project-trip-leg-arcs";
import { applyFocusedHubGlobePins } from "../lib/globe/context-hub/apply-focused-hub-globe-visuals";
import {
  LINKED_EVENT_ID_META_KEY,
  TRIP_LEG_META_KEY,
  TRIP_REF_META_KEY,
} from "../lib/globe/trip-leg-metadata";
import { indexEventsById } from "../lib/plan-context/project-plan-to-feed-slot";

function tripEvent(
  id: string,
  place: string,
  leg: "departure" | "destination",
  linkedId: string,
): EventCandidate {
  const stamp = new Date().toISOString();
  return {
    id,
    title: place,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: "2026-06-13T09:00:00+09:00",
    place,
    confidence: 0.9,
    metadata: {
      [TRIP_REF_META_KEY]: GLOBE_DEMO_TRIP_REF.germany,
      [TRIP_LEG_META_KEY]: leg,
      [LINKED_EVENT_ID_META_KEY]: linkedId,
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const depart = tripEvent(
  GLOBE_DEMO_EVENT_IDS.germanyDepart,
  "인천공항",
  "departure",
  GLOBE_DEMO_EVENT_IDS.germany,
);
const destination = tripEvent(
  GLOBE_DEMO_EVENT_IDS.germany,
  "독일",
  "destination",
  GLOBE_DEMO_EVENT_IDS.germanyDepart,
);
const events = [depart, destination];
const eventsById = indexEventsById(events);
const graph = buildExperienceGraphFromEvents(events);
const clusters = projectPinClustersFromGraph({
  volumes: graph.volumes,
  eventsById,
});

assert.equal(clusters.length, 2);

const arcs = projectTripLegArcs({ eventsById, clusters });
assert.equal(arcs.length, 1);
assert.equal(arcs[0]!.tripRef, GLOBE_DEMO_TRIP_REF.germany);
assert.ok(arcs[0]!.startLat > 36 && arcs[0]!.startLat < 38);
assert.ok(arcs[0]!.endLat > 50 && arcs[0]!.endLat < 54);
assert.equal(arcs[0]!.color, "#3182f6");

const classified = projectPinClusterClassifiedPins(clusters, eventsById);
const departPin = classified.find((row) => row.tripLeg === "departure");
const destPin = classified.find((row) => row.tripLeg === "destination");
assert.ok(departPin);
assert.ok(destPin);
assert.equal(departPin!.emphasis, "related");
assert.equal(destPin!.emphasis, "primary");

const departBar = projectTripLegBar({
  event: depart,
  eventsById,
  clusters,
});
assert.ok(departBar);
assert.equal(departBar!.originLabel, "인천공항");
assert.equal(departBar!.destinationLabel, "독일");
assert.equal(departBar!.activeLeg, "departure");

const destBar = projectTripLegBar({
  event: destination,
  eventsById,
  clusters,
});
assert.ok(destBar);
assert.equal(destBar!.activeLeg, "destination");

const focusedArc = projectFocusedContextHubArc({
  focusedEventId: destination.id,
  eventsById,
  clusters,
});
assert.ok(focusedArc);
assert.equal(focusedArc!.emphasis, "focused");
assert.equal(focusedArc!.tripRef, GLOBE_DEMO_TRIP_REF.germany);

const focusedOnly = projectGlobeTripArcs({
  eventsById,
  clusters,
  focusedEventId: destination.id,
  showBackgroundTripArcs: true,
});
assert.equal(focusedOnly.length, 1);
assert.equal(focusedOnly[0]!.emphasis, "focused");

const backgroundOnly = projectGlobeTripArcs({
  eventsById,
  clusters,
  focusedEventId: null,
  showBackgroundTripArcs: true,
});
assert.equal(backgroundOnly.length, 1);

const mutedPins = applyFocusedHubGlobePins(classified, {
  focusedEventId: destination.id,
  eventsById,
});
assert.equal(
  mutedPins.filter((row) => row.hubFocusMuted).length,
  0,
);
assert.equal(
  mutedPins.filter((row) => row.emphasis === "primary").length,
  2,
);

console.log("test-trip-leg-arcs: ok");
