import assert from "node:assert/strict";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const { event } = createManualGlobeContext({
    title: "제주 여행",
    place: "제주 애월",
    startIso: "2026-07-01T10:00",
    nights: 2,
    resolvedPlace: {
      label: "애월 해안도로",
      placeName: "애월 해안도로",
      lat: 33.4642,
      lng: 126.3079,
      confirmed: true,
    },
  });

  assert.equal(event.metadata?.globePlaceConfirmed, true);
  assert.equal(event.metadata?.globePlaceLat, 33.4642);

  const coords = resolveEventGlobeCoords(event);
  assert.equal(coords.lat, 33.4642);
  assert.equal(coords.lng, 126.3079);
  assert.equal(coords.placeLabel, "애월 해안도로");

  console.log("test-manual-globe-place-confirm: ok");
}

main();
