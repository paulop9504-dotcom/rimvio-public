#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { GLOBE_DEMO_EVENT_IDS } from "../lib/experience-graph/seed-globe-demo-events";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2026-06-10T12:00:00+09:00");

function buildGermanyDepartWindow(reference = now): { start: Date; end: Date } {
  const start = new Date(reference);
  start.setDate(start.getDate() + 3);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(20, 0, 0, 0);
  return { start, end };
}

const { start, end } = buildGermanyDepartWindow(now);
assert.equal(start.getDate(), 13);
assert.equal(end.getDate() - start.getDate(), 7);

const event: EventCandidate = {
  id: GLOBE_DEMO_EVENT_IDS.germany,
  title: "독일 여행",
  category: "travel",
  source: "message",
  lifecycle: "active",
  datetime: start.toISOString(),
  place: "독일",
  confidence: 0.93,
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: end.toISOString(),
    planNights: 7,
  },
  lifecycleUpdatedAt: now.toISOString(),
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const coords = resolveEventGlobeCoords(event);
assert.ok(coords.lat > 50 && coords.lat < 54);
assert.ok(coords.lng > 12 && coords.lng < 15);
assert.match(coords.placeLabel, /독일/u);

console.log("test-globe-demo-germany: ok");
