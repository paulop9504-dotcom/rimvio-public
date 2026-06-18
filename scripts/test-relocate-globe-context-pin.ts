import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { relocateGlobeContextPin } from "../lib/globe/relocate-globe-context-pin";
import {
  findPersonalGlobePinByEventId,
  resetPersonalGlobePinsForTests,
} from "../lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const { event } = createManualGlobeContext({
    title: "호진이 결혼식",
    place: "서울",
    startIso: "2026-09-20T14:00",
    resolvedPlace: {
      label: "서울",
      placeName: "서울",
      lat: 37.5665,
      lng: 126.978,
      confirmed: true,
    },
  });

  relocateGlobeContextPin({
    eventId: event.id,
    lat: 37.57,
    lng: 127.01,
  });

  const moved = findPersonalGlobePinByEventId(event.id);
  assert.ok(moved);
  assert.equal(moved!.lat, 37.57);
  assert.equal(moved!.lng, 127.01);

  const coords = resolveEventGlobeCoords(
    relocateGlobeContextPin({
      eventId: event.id,
      lat: 37.58,
      lng: 127.02,
    }),
  );
  assert.equal(coords.lat, 37.58);
  assert.equal(coords.lng, 127.02);

  console.log("test-relocate-globe-context-pin: ok");
}

main();
