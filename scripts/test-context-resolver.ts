#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { computeLeaveTime, formatLeaveTimeClock } from "../lib/context-resolver/leave-time-engine";
import { compileTravelAction } from "../lib/context-resolver/compile-travel-action";
import { resolveDynamicContext } from "../lib/context-resolver/resolve-context";
import type { ContextSnapshot, PersistentEvent } from "../lib/context-resolver/types";

async function main() {
  const gangnamMeeting: PersistentEvent = {
    id: "meeting-gangnam",
    title: "회의",
    start_time: "2026-05-30T15:00:00",
    location: "강남",
    meeting_url: "zoom://join",
    origin_hint: "대전",
    safety_buffer_minutes: 10,
  };

  const context: ContextSnapshot = {
    resolved_at: "2026-05-30T14:00:00.000Z",
    weather: { condition: "clear", summary: "맑음", condition_label: "Clear", temp_c: 24, is_unpleasant: false, precipitation_chance: 0.1 },
    traffic: { travel_minutes: 35, delay_minutes: 18, distance_label: "현재 위치 → 강남" },
    location: { label: "대전", city: "대전" },
    calendar: {
      current_time: "2026-05-30T14:00:00.000Z",
      minutes_until_event: 60,
      event_title: "회의",
    },
  };

  const leave = computeLeaveTime({
    event: gangnamMeeting,
    context,
    now: new Date("2026-05-30T14:00:00+09:00"),
  });

  assert.equal(formatLeaveTimeClock(leave.show_at), "13:57");
  assert.equal(leave.safety_buffer_minutes, 10);

  const seoulMeeting: PersistentEvent = {
    id: "meeting-seoul",
    title: "서울역 미팅",
    start_time: "2026-05-31T15:00:00",
    location: "서울역",
    origin_hint: "대전",
  };

  const seoulContext = await resolveDynamicContext({
    event: seoulMeeting,
    now: new Date("2026-05-31T12:00:00+09:00"),
  });

  assert.equal(seoulContext.traffic.travel_minutes, 102);
  assert.equal(seoulContext.traffic.delay_minutes, 18);

  const compiled = await compileTravelAction({
    event: seoulMeeting,
    extracted: {
      place_name: "서울역",
      address: null,
      phone: null,
      datetime: seoulMeeting.start_time,
      url: null,
    },
    now: new Date("2026-05-31T12:00:00+09:00"),
    context: seoulContext,
  });

  assert.equal(compiled.action, "OPEN_NAVIGATION");
  assert.match(compiled.summary, /지금 출발/);
  assert.ok(
    compiled.actions.some((action) => /티맵|tmap/i.test(`${action.label} ${action.href ?? ""}`))
  );

  console.log("test-context-resolver: ok");
}

void main();
