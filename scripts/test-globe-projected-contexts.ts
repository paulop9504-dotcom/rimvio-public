import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { listGlobeProjectedContexts } from "../lib/globe/list-globe-projected-contexts";
import { buildExperienceGraphFromEvents } from "../lib/experience-graph/build-experience-graph";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { resetEventCandidatesForTests, listEventCandidates } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const created = createManualGlobeContext({
    title: "학과 친구들과 모임",
    place: "청주",
    startIso: "2026-06-01T12:00",
    nights: 1,
    resolvedPlace: {
      label: "청주",
      placeName: "청주",
      lat: 36.6424,
      lng: 127.489,
      confirmed: true,
    },
  });

  const events = listEventCandidates();
  const graph = buildExperienceGraphFromEvents(events);
  const projected = listGlobeProjectedContexts({
    events,
    volumes: graph.volumes,
  });

  assert.ok(projected.some((row) => row.eventId === created.event.id));
  assert.equal(projected[0]?.title, "학과 친구들과 모임");

  console.log("test-globe-projected-contexts: ok");
}

main();
