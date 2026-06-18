#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildSpacetimePingFromMedia,
  buildSpacetimePingNavLinks,
  formatSpacetimePingTimestamp,
  formatSpacetimePingWeatherLines,
  projectEventToExperienceVolume,
  projectVolumeSpatialMedia,
} from "../lib/experience-graph";
import type { EventCandidate } from "../lib/events/event-candidate";

const event: EventCandidate = {
  id: "ev-ping",
  title: "동화원 저녁",
  category: "food",
  source: "manual",
  lifecycle: "completed",
  datetime: "2026-06-03T15:00:00+09:00",
  place: "대전 둔산동",
  confidence: 0.9,
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const volume = projectEventToExperienceVolume(event);
assert.ok(volume);
const item = projectVolumeSpatialMedia(volume!)[0]!;
assert.ok(item);

const ping = buildSpacetimePingFromMedia({
  item,
  volume: volume!,
  weather: {
    condition: "clear",
    summary: "맑음",
    temp_c: 24,
    humidity_pct: 62,
    location_label: "둔산동",
  },
});

assert.match(formatSpacetimePingTimestamp(ping.capturedAtIso) ?? "", /2026\/06\/03 15:00/);

const lines = formatSpacetimePingWeatherLines(ping.weather);
assert.match(lines.primary, /24°C/);
assert.match(lines.secondary, /습도 62%/);

const nav = buildSpacetimePingNavLinks(ping);
assert.match(nav.routeDeeplink, /kakaomap:\/\/route/);
assert.ok(nav.routeWebHref);

console.log("test-spacetime-ping: ok");
