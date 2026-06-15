import assert from "node:assert/strict";
import { buildExperienceGraphFromEvents } from "../lib/experience-graph/build-experience-graph";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import {
  listGlobeManageContexts,
  summarizeGlobeManageContexts,
} from "../lib/globe/list-globe-manage-contexts";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import {
  listEventCandidates,
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "../lib/events/event-store";

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

  const stamp = new Date().toISOString();
  upsertEventCandidate({
    id: "schedule:hidden-wedding",
    title: "호진이 결혼식",
    category: "schedule",
    source: "message",
    lifecycle: "scheduled",
    datetime: "2026-09-20T14:00:00+09:00",
    place: "서울",
    confidence: 0.82,
    metadata: { targetingSource: "chat_schedule" },
    lifecycleUpdatedAt: stamp,
  });

  upsertEventCandidate({
    id: "schedule:completed-dentist",
    title: "치과",
    category: "schedule",
    source: "notification",
    lifecycle: "completed",
    datetime: "2026-05-01T10:00:00+09:00",
    place: "둔산동",
    confidence: 0.75,
    metadata: {},
    lifecycleUpdatedAt: stamp,
  });

  const events = listEventCandidates();
  const graph = buildExperienceGraphFromEvents(events);
  const entries = listGlobeManageContexts({
    events,
    volumes: graph.volumes,
  });
  const summary = summarizeGlobeManageContexts(entries);

  assert.ok(entries.some((row) => row.eventId === created.event.id && row.onGlobe));
  assert.ok(
    entries.some(
      (row) => row.eventId === "schedule:hidden-wedding" && row.onGlobe,
    ),
  );
  assert.ok(
    entries.some(
      (row) =>
        row.eventId === "schedule:completed-dentist" &&
        !row.onGlobe &&
        row.manageKind === "archived",
    ),
  );
  assert.equal(summary.onGlobe, 2);
  assert.equal(summary.offGlobe, 1);
  assert.equal(summary.total, 3);

  console.log("test-globe-manage-contexts: ok");
}

main();
