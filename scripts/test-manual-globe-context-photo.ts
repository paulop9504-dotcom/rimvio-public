import assert from "node:assert/strict";
import { commitCaptureToEvent } from "../lib/feed/ingest-search-capture";
import { CONTEXT_MATCH_MIN_SCORE } from "../lib/ingest/context-match-media-gate";
import { scoreSpacetimeFit } from "../lib/feed/spacetime-fit";
import { createManualGlobeContext } from "../lib/globe/create-manual-globe-context";
import { findPersonalGlobePinByEventId } from "../lib/globe/personal-globe-pin-store";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { syncPersonalGlobePinFromEvent } from "../lib/globe/sync-personal-globe-pin";
import { readPlanContextFromEvent } from "../lib/plan-context/plan-context-metadata";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

function main() {
  resetEventCandidatesForTests();
  resetPersonalGlobePinsForTests();

  const { event, pin } = createManualGlobeContext({
    title: "제주 여행",
    place: "제주",
    startIso: "2026-07-01T10:00",
    nights: 3,
  });

  assert.equal(pin.eventId, event.id);
  assert.ok(findPersonalGlobePinByEventId(event.id));

  const plan = readPlanContextFromEvent(event);
  assert.ok(plan?.windowEndIso);

  const attachFit = scoreSpacetimeFit({
    capturedAtIso: "2026-07-02T14:00:00+09:00",
    lat: 33.389,
    lng: 126.553,
    eventStartIso: event.datetime!,
    eventEndIso: plan?.windowEndIso ?? null,
    eventPlace: "제주",
    capturedPlaceLabel: "제주 애월",
  });
  assert.ok(
    attachFit.score >= CONTEXT_MATCH_MIN_SCORE,
    `expected attach fit, got ${attachFit.score}`,
  );

  const splitFit = scoreSpacetimeFit({
    capturedAtIso: "2026-01-10T12:00:00+09:00",
    lat: 37.4979,
    lng: 127.0276,
    eventStartIso: event.datetime!,
    eventEndIso: plan?.windowEndIso ?? null,
    eventPlace: "제주",
    capturedPlaceLabel: "서울 강남",
  });
  assert.ok(
    splitFit.score < CONTEXT_MATCH_MIN_SCORE,
    `expected split fit, got ${splitFit.score}`,
  );

  const attached = commitCaptureToEvent({
    target: event,
    match: {
      eventId: event.id,
      eventTitle: event.title,
      confidence: "high",
      score: attachFit.score,
      placeLabel: "제주 애월",
      dayLabel: "Day 2",
      reason: event.title,
    },
    createdNewEvent: false,
    fragment: {
      id: "test-photo-attach",
      kind: "photo",
      capturedAtIso: "2026-07-02T14:00:00+09:00",
      mediaContextId: "test-photo-attach",
      placeLabel: "제주 애월",
    },
    userConfirmedTarget: true,
  });
  assert.equal(attached.event.id, event.id);

  const synced = syncPersonalGlobePinFromEvent(event.id);
  assert.ok(synced);
  assert.equal(synced?.photoCount, 1);

  console.log("test-manual-globe-context-photo: ok");
}

main();
