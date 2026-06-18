#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildDepartureHubFlightSearchUrl } from "../lib/globe/context-hub/build-departure-hub-flight-url";
import { buildContextHubFlightBooking } from "../lib/globe/context-hub/build-context-hub-flight-booking-url";
import { getDepartureHubAirport } from "../lib/globe/departure-hub-airports";

const jeju = buildContextHubFlightBooking({
  airport: getDepartureHubAirport("cjj"),
  destinationPlace: "제주",
  departDateIso: "2026-07-01T10:00:00+09:00",
});

assert.match(jeju.url, /^https:\/\/flight\.naver\.com\/flights\/domestic\//u);
assert.match(jeju.url, /CJJ-CJU-20260701/u);

const intl = buildDepartureHubFlightSearchUrl({
  airport: getDepartureHubAirport("icn"),
  destinationPlace: "도쿄",
  departDateIso: "2026-07-01T10:00:00+09:00",
});

assert.match(intl, /^https:\/\/www\.google\.com\/travel\/flights\?/u);
assert.match(intl, /ICN/iu);
assert.match(intl, /2026-07-01/u);

console.log("test-departure-hub-flight-url: ok");
