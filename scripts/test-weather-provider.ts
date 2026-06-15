#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  fallbackWeatherContext,
  normalizeOpenWeatherResponse,
} from "../lib/context-resolver/weather/normalize-weather";

const rainy = normalizeOpenWeatherResponse(
  {
    name: "Gangnam",
    main: { temp: 31, feels_like: 33 },
    weather: [{ main: "Rain", description: "moderate rain" }],
    rain: { "1h": 2.4 },
  },
  "강남"
);

assert.equal(rainy.condition, "rain");
assert.equal(rainy.condition_label, "Rain");
assert.equal(rainy.temp_c, 31);
assert.equal(rainy.is_unpleasant, true);

const clear = fallbackWeatherContext("서울역");
assert.ok(clear.summary);
assert.equal(typeof clear.is_unpleasant, "boolean");

console.log("test-weather-provider: ok");
