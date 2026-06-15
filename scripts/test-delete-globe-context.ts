import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { deleteGlobeContext } from "../lib/globe/delete-globe-context";
import {
  findPersonalGlobePinByEventId,
  resetPersonalGlobePinsForTests,
} from "../lib/globe/personal-globe-pin-store";
import { findEventCandidate, resetEventCandidatesForTests } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const created = createManualGlobeContext({
    title: "테스트 맥락",
    place: "제주",
    startIso: "2026-08-01T10:00",
    nights: 1,
    resolvedPlace: {
      label: "제주",
      placeName: "제주",
      lat: 33.4996,
      lng: 126.5312,
      confirmed: true,
    },
  });

  assert.ok(findPersonalGlobePinByEventId(created.event.id));

  const result = deleteGlobeContext(created.event.id);
  assert.equal(result.hidden, true);
  assert.equal(result.removedPin, true);
  assert.equal(findPersonalGlobePinByEventId(created.event.id), null);
  assert.equal(findEventCandidate(created.event.id)?.metadata?.globeContextRemoved, true);

  console.log("test-delete-globe-context: ok");
}

main();
