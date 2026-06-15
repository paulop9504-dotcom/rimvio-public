import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { focusGlobeContextOnMap } from "../lib/globe/focus-globe-context-on-map";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const { event } = createManualGlobeContext({
    title: "신림 회식",
    place: "신림동",
    startIso: "2026-09-01T19:00",
    resolvedPlace: {
      label: "신림동",
      placeName: "신림동",
      lat: 37.4842,
      lng: 126.9295,
      confirmed: true,
    },
  });

  const focused = focusGlobeContextOnMap(event.id);
  assert.ok(focused);
  assert.equal(focused!.cluster.eventId, event.id);
  assert.ok(focused!.cluster.lat > 37.48);

  const schedule = commitEventUpsert({
    id: "schedule:off-globe-demo",
    title: "부산 출장",
    category: "schedule",
    source: "manual",
    lifecycle: "scheduled",
    datetime: "2026-10-01T09:00:00+09:00",
    place: "부산",
    confidence: 0.7,
    metadata: { feedPlanEnabled: true },
    lifecycleUpdatedAt: new Date().toISOString(),
  });

  const offGlobe = focusGlobeContextOnMap(schedule.id);
  assert.ok(offGlobe);
  assert.equal(offGlobe!.geocoded, true);
  assert.ok(offGlobe!.cluster.lat > 35);

  console.log("test-focus-globe-context-on-map: ok");
}

main();
