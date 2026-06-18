#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import {
  buildPlanStackProjection,
  shouldShowPlanStack,
} from "../lib/plan-context/build-plan-stack-projection";
import { composeWeatherPrepLine } from "../lib/plan-context/compose-weather-prep-line";
import { fetchWeatherForecastAt } from "../lib/context-resolver/weather/fetch-weather-forecast";
import {
  derivePlanAwareSlotContext,
  derivePlanAwareSlotTimeLabel,
  indexEventsById,
  resolvePlanContextForCalendarRow,
} from "../lib/plan-context/project-plan-to-feed-slot";
import {
  planWeatherTargetKey,
  resolvePlanWeatherTarget,
} from "../lib/plan-context/resolve-plan-weather-target";
import type { PlanContext } from "../lib/plan-context/plan-context-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildFeedTodaySlots } from "../lib/feed/build-feed-today-slots";
import {
  FEED_PLAN_DEMO_EVENT_ID,
  buildFeedPlanDemoDraft,
} from "../lib/feed/seed-feed-plan-demo";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

const MAX_CONTEXT_CHARS = 48;
const MAX_WEATHER_PREP_CHARS = 56;

const now = new Date();
const demo = buildFeedPlanDemoDraft(now);
assert.equal(demo.id, FEED_PLAN_DEMO_EVENT_ID);

resetEventCandidatesForTests([demo]);

const plan: PlanContext = {
  title: demo.title,
  windowStartIso: demo.datetime,
  windowEndIso: String(demo.metadata?.planWindowEndIso ?? ""),
  windowConfidence: "confirmed",
  nights: 2,
  place: demo.place ?? "강남역",
  peerDisplayName: "민수",
  attachMode: "new",
  planMode: "group",
};

const startMs = Date.parse(demo.datetime!);
const row: UnifiedCalendarOverlayRow = {
  id: "row:demo",
  event: {
    id: "chip:demo",
    layer: "event",
    eventId: demo.id,
    entry: null,
    title: demo.title,
    dateKey: demo.datetime!.slice(0, 10),
    startMs,
    hour: new Date(startMs).getHours(),
    minute: new Date(startMs).getMinutes(),
    tone: "teal",
    hasTime: true,
  },
  overlayActions: [],
  spawn_phase: "travel",
};

const eventsById = indexEventsById([demo]);
const resolvedPlan = resolvePlanContextForCalendarRow(row, eventsById);
assert.ok(resolvedPlan);
assert.ok(shouldShowPlanStack(resolvedPlan!));

const timeLabel = derivePlanAwareSlotTimeLabel(row, resolvedPlan);
assert.match(timeLabel, /월/);

const context = derivePlanAwareSlotContext(row, resolvedPlan);
assert.ok(context);
assert.ok(context!.length <= MAX_CONTEXT_CHARS, `context too long: ${context}`);
assert.doesNotMatch(context!, /우산/, "weather belongs in prep strip, not context");
assert.match(context!, /민수와 함께/);

const target = resolvePlanWeatherTarget(resolvedPlan!, row);
assert.ok(target);
assert.equal(planWeatherTargetKey(target!), `${target!.location}|${new Date(target!.targetIso).toISOString()}`);

async function main() {
  const forecast = await fetchWeatherForecastAt({
    location: target!.location,
    targetAt: new Date(target!.targetIso),
  });
  const prepLine = forecast
    ? composeWeatherPrepLine({ weather: forecast, targetAt: new Date(target!.targetIso), now })
    : null;

  if (prepLine) {
    assert.ok(prepLine.length <= MAX_WEATHER_PREP_CHARS, `prep line too long: ${prepLine}`);
  }

  const partition = buildFeedTodaySlots({
    primary: null,
    latent: [],
    overlayRows: [row],
    now,
  });
  assert.equal(partition.today.length, 1);
  assert.equal(partition.today[0]?.kind, "calendar");

  const stack = buildPlanStackProjection({
    plan: resolvedPlan!,
    row,
    now: new Date(startMs - 50 * 60_000),
    weather: forecast ?? undefined,
  });
  assert.ok(stack.before.length > 0, "departure/prep legs should show near start");

  console.log("test-feed-plan-slot-ux: ok");
  console.log(
    JSON.stringify(
      {
        timeLabel,
        context,
        prepLine,
        stackBefore: stack.before.map((leg) => ({ label: leg.label, hint: leg.hint })),
      },
      null,
      2,
    ),
  );

  resetEventCandidatesForTests([]);
}

void main();
