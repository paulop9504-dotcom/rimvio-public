#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import { compilePlanDepartureLeg } from "../lib/plan-context/compile-plan-departure-leg";
import { buildPlanStackProjection } from "../lib/plan-context/build-plan-stack-projection";
import type { PlanContext } from "../lib/plan-context/plan-context-types";

const now = new Date("2027-06-12T08:30:00+09:00");

const plan: PlanContext = {
  title: "강남역 미팅",
  windowStartIso: "2027-06-12T09:00:00+09:00",
  windowConfidence: "confirmed",
  place: "강남역",
  attachMode: "new",
  planMode: "solo",
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
  spawn_phase: "travel",
};

const leg = compilePlanDepartureLeg({ plan, row, now });
assert.ok(leg, "departure leg within travel window");
assert.match(leg!.label, /출발/);
assert.ok(leg!.deeplink?.startsWith("tmap://"));

const stack = buildPlanStackProjection({ plan, row, now });
assert.equal(stack.before[0]?.id, "rule:before:departure");

const tooEarly = compilePlanDepartureLeg({
  plan,
  row,
  now: new Date("2027-06-12T06:00:00+09:00"),
});
assert.equal(tooEarly, null, "before show_at — no departure leg");

console.log("test-plan-departure-leg: ok");
