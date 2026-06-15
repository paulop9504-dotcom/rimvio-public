#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildDepartureHubFlightSearchUrl } from "../lib/globe/context-hub/build-departure-hub-flight-url";
import { getDepartureHubAirport } from "../lib/globe/departure-hub-airports";

const url = buildDepartureHubFlightSearchUrl({
  airport: getDepartureHubAirport("cjj"),
  destinationPlace: "제주",
  departDateIso: "2026-07-01T10:00:00+09:00",
});

assert.match(url, /^https:\/\/www\.google\.com\/travel\/flights\?/u);
assert.match(url, /CJJ/iu);
assert.match(url, /2026-07-01/u);

console.log("test-departure-hub-flight-url: ok");
