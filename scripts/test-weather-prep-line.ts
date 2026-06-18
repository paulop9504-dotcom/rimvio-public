#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import { composeWeatherPrepLine } from "../lib/plan-context/compose-weather-prep-line";
import { compilePlanDepartureLeg } from "../lib/plan-context/compile-plan-departure-leg";
import {
  derivePlanAwareSlotContext,
  resolvePlanContextForCalendarRow,
} from "../lib/plan-context/project-plan-to-feed-slot";
import {
  planWeatherTargetKey,
  resolvePlanWeatherTarget,
} from "../lib/plan-context/resolve-plan-weather-target";
import type { PlanContext } from "../lib/plan-context/plan-context-types";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2027-06-12T07:00:00+09:00");
const targetAt = new Date("2027-06-12T09:00:00+09:00");

const rainyLine = composeWeatherPrepLine({
  weather: {
    condition: "rain",
    summary: "비",
    precipitation_chance: 0.72,
    is_unpleasant: true,
    temp_c: 22,
  },
  targetAt,
  now,
});
assert.match(rainyLine ?? "", /비/);
assert.match(rainyLine ?? "", /우산/);

const clearLine = composeWeatherPrepLine({
  weather: {
    condition: "clear",
    summary: "맑음",
    precipitation_chance: 0.1,
    is_unpleasant: false,
    temp_c: 24,
  },
  targetAt,
  now,
});
assert.equal(clearLine, null);

const plan: PlanContext = {
  title: "강남역 미팅",
  windowStartIso: "2027-06-12T09:00:00+09:00",
  windowConfidence: "confirmed",
  place: "강남역",
  attachMode: "new",
};

const row: UnifiedCalendarOverlayRow = {
  id: "row:meeting",
  event: {
    id: "chip:meeting",
    layer: "event",
    eventId: "ec-meeting",
    entry: null,
    title: "강남역 미팅",
    dateKey: "2027-06-12",
    startMs: Date.parse("2027-06-12T09:00:00+09:00"),
    hour: 9,
    minute: 0,
    tone: "teal",
    hasTime: true,
  },
  overlayActions: [],
};

const target = resolvePlanWeatherTarget(plan, row);
assert.ok(target);
assert.equal(planWeatherTargetKey(target!), "강남역|2027-06-12T00:00:00.000Z");

const context = derivePlanAwareSlotContext(row, plan);
assert.match(context ?? "", /강남역/);
assert.match(rainyLine ?? "", /우산/);

const leg = compilePlanDepartureLeg({
  plan,
  row,
  now: new Date("2027-06-12T08:30:00+09:00"),
  weather: {
    condition: "rain",
    summary: "비",
    is_unpleasant: true,
    precipitation_chance: 0.8,
  },
});
assert.ok(leg?.hint?.includes("비"));

const event: EventCandidate = {
  id: "ec-meeting",
  title: "강남역 미팅",
  category: "meeting",
  source: "manual",
  lifecycle: "active",
  datetime: "2027-06-12T09:00:00+09:00",
  place: "강남역",
  metadata: { feedPlanEnabled: true, planKind: "plan" },
};
const eventsById = new Map([[event.id, event]]);
const resolvedPlan = resolvePlanContextForCalendarRow(row, eventsById);
assert.ok(resolvedPlan);

console.log("test-weather-prep-line: ok");
