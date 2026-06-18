#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests, upsertEventCandidate } from "../lib/events/event-store";
import { connectDepartureHubToContext } from "../lib/globe/connect-departure-hub-to-context";
import { disconnectContextHub } from "../lib/globe/context-hub/disconnect-context-hub";
import { listContextHubLinks } from "../lib/globe/context-hub/list-context-hub-links";
import { shouldSuggestContextHubsForDraft } from "../lib/globe/context-hub/should-suggest-context-hubs";
import { shouldOfferDepartureHub } from "../lib/globe/should-offer-departure-hub";
import { suggestDepartureHubOptions } from "../lib/globe/suggest-departure-hub-options";
import { readTripLegFromEvent } from "../lib/globe/trip-leg-metadata";

resetEventCandidatesForTests();

const stamp = new Date().toISOString();
const jeju = upsertEventCandidate({
  id: "plan:jeju:test",
  title: "제주 여행",
  category: "travel",
  source: "manual",
  lifecycle: "scheduled",
  datetime: "2026-07-01T10:00:00+09:00",
  place: "제주",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    globeManualContext: true,
  },
  lifecycleUpdatedAt: stamp,
});

assert.equal(shouldOfferDepartureHub(jeju), true);
assert.equal(shouldSuggestContextHubsForDraft({ title: "제주 여행", place: "제주" }), true);

const options = suggestDepartureHubOptions({
  destinationPlace: "제주",
  homeRegionHint: "대전",
});
assert.equal(options[0]!.id, "cjj");
assert.equal(options[0]!.recommended, true);

const linked = connectDepartureHubToContext({
  destinationEventId: jeju.id,
  airportId: "cjj",
  homeRegionHint: "대전",
});

assert.equal(listContextHubLinks(linked.destinationEvent).length, 1);
assert.equal(listContextHubLinks(linked.destinationEvent)[0]!.airportIata, "CJJ");

const destLeg = readTripLegFromEvent(linked.destinationEvent);
const departLeg = readTripLegFromEvent(linked.departureEvent);
assert.equal(destLeg?.leg, "destination");
assert.equal(departLeg?.leg, "departure");
assert.equal(destLeg?.linkedEventId, linked.departureEvent.id);
assert.equal(departLeg?.linkedEventId, linked.destinationEvent.id);
assert.equal(linked.departureEvent.metadata?.globePlaceLat, 36.716556);

const unplugged = disconnectContextHub({
  contextEventId: linked.destinationEvent.id,
  hubEventId: linked.departureEvent.id,
});
assert.equal(listContextHubLinks(unplugged.contextEvent).length, 0);
assert.equal(readTripLegFromEvent(unplugged.contextEvent), null);

const relinked = connectDepartureHubToContext({
  destinationEventId: jeju.id,
  airportId: "gmp",
});
assert.equal(listContextHubLinks(relinked.destinationEvent)[0]!.airportIata, "GMP");
const gmpLink = listContextHubLinks(relinked.destinationEvent)[0]!;
assert.ok(gmpLink.actionUrl?.includes("flight.naver.com/flights/domestic/GMP-CJU"));
assert.equal(gmpLink.actionLabelKo, "네이버 항공 예매");
assert.equal(gmpLink.flightRouteKind, "domestic_kr");

console.log("test-departure-hub-connect: ok");
