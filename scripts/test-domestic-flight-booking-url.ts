#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildContextHubFlightBooking } from "../lib/globe/context-hub/build-context-hub-flight-booking-url";
import { resolveFlightRoute } from "../lib/globe/context-hub/resolve-flight-route-kind";
import { getDepartureHubAirport } from "../lib/globe/departure-hub-airports";

const jejuDomestic = buildContextHubFlightBooking({
  airport: getDepartureHubAirport("gmp"),
  destinationPlace: "제주",
  departDateIso: "2026-07-01T10:00:00+09:00",
});

assert.equal(jejuDomestic.routeKind, "domestic_kr");
assert.equal(jejuDomestic.provider, "naver_flight");
assert.equal(jejuDomestic.destinationIata, "CJU");
assert.match(jejuDomestic.url, /^https:\/\/flight\.naver\.com\/flights\/domestic\/GMP-CJU-20260701/u);
assert.equal(jejuDomestic.actionLabelKo, "네이버 항공 예매");

const osakaIntl = buildContextHubFlightBooking({
  airport: getDepartureHubAirport("icn"),
  destinationPlace: "오사카",
  departDateIso: "2026-08-01T10:00:00+09:00",
});

assert.equal(osakaIntl.routeKind, "international");
assert.equal(osakaIntl.provider, "google_flights");
assert.match(osakaIntl.url, /^https:\/\/www\.google\.com\/travel\/flights\?/u);
assert.match(osakaIntl.url, /ICN/iu);

const route = resolveFlightRoute({
  originIata: "CJJ",
  destinationPlace: "제주 여행",
  departDateIso: "2026-07-15T09:00:00+09:00",
});
assert.equal(route.kind, "domestic_kr");
assert.equal(route.destinationIata, "CJU");
assert.equal(route.departDateYmd, "2026-07-15");

console.log("test-domestic-flight-booking-url: ok");
