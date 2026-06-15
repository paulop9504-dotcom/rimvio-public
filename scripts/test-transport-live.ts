#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { orchestrateTransportLive } from "../lib/action-chat/orchestrate-transport-live";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";
import { evaluateProactiveTransportNudge } from "../lib/transport/proactive-transport-nudge";
import {
  buildTransportLiveOrchestratorPayload,
  isTransitLiveQuery,
  pickNextArrival,
  buildTransportLiveArrivals,
} from "../lib/transport/transport-live-service";

assert.ok(isTransitLiveQuery("버스 언제 와?"));
assert.ok(isTransitLiveQuery("102번 몇 분 후 도착"));

const payload = buildTransportLiveOrchestratorPayload({
  message: "대전역 102번 버스 언제 와?",
});
assert.ok(payload);
assert.equal(payload!.card.card_type, "TRANSPORT_LIVE");
assert.match(payload!.card.data.route, /102|급행|314/);
assert.equal(payload!.actions.length, 3);
assert.ok(payload!.actions.some((action) => action.label === "실시간 갱신"));

const arrivals = buildTransportLiveArrivals({ message: "버스" });
const next = pickNextArrival(arrivals);
assert.ok(next);
assert.ok(next!.minutes_until <= (arrivals[1]?.minutes_until ?? 99));

const live = orchestrateTransportLive({ message: "버스 언제 와?" });
assert.ok(live?.transportLive);
assert.match(live!.summary, /도착/);

const rules = orchestrateByRules({ message: "지하철 몇 분 후 와?" });
assert.ok(rules.transportLive);

const nudge = evaluateProactiveTransportNudge({
  existingSchedule: [{ time: "15:00", task: "15시 회의" }],
  now: new Date("2026-05-29T14:42:00"),
});
assert.ok(nudge);
assert.match(nudge!.message, /102번/);

console.log("test-transport-live: ok");
