#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { analyzeSemanticRouting } from "../lib/action-chat/classify-semantic-routing-surface";
import { classifyAiIntentUtterance } from "../lib/action-chat/classify-ai-intent-utterance";
import { orchestrateAiIntent } from "../lib/action-chat/orchestrate-ai-intent";
import {
  extractTravelDestination,
  isTravelDestinationAmbiguous,
  isTravelTripAnnouncement,
  tryTravelTripAnnouncement,
} from "../lib/action-chat/try-travel-trip-announcement";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { orchestrateEventCommitGate } from "../lib/event-commit-gate";

const message = "나 20시간뒤에 오사카로 여행감";

assert.ok(isTravelTripAnnouncement(message));
assert.equal(extractTravelDestination(message), "오사카");

const semantic = analyzeSemanticRouting(message);
assert.equal(semantic.domain, "travel");
assert.equal(semantic.reason, "travel_trip_announcement");
assert.notEqual(semantic.reason, "ambiguous_fallback");

assert.equal(classifyAiIntentUtterance(message), null, "must defer to action OS");

const aiIntent = orchestrateAiIntent(message);
assert.equal(aiIntent, null, "must not return DECISION tiki-taka stub");

const trip = tryTravelTripAnnouncement({ message });
assert.ok(trip);
assert.ok(trip.actions.length >= 2);
assert.match(trip.summary, /오사카/);
assert.equal(trip.actionsRevealed, true);
assert.ok(
  trip.actions.some((action) => /eSIM|여권|환율|티켓|체크인|길찾기/u.test(action.label)),
  `expected travel prep labels, got: ${trip.actions.map((a) => a.label).join(", ")}`,
);
assert.ok(
  !trip.summary.includes("가성비·가격"),
  "must not be DECISION A/B/C reply",
);
assert.ok(trip.scheduledDelivery?.status === "pending", "must schedule calendar commit");
assert.ok(trip.scheduleExtract?.datetime, "must include schedule datetime");

const ambiguous = "20시간뒤에 로마 여행";
assert.ok(isTravelTripAnnouncement(ambiguous));
assert.ok(isTravelDestinationAmbiguous(ambiguous));

const clarify = orchestrateEventCommitGate({ message: ambiguous });
assert.ok(clarify);
assert.equal(clarify!.pendingConfirm, true);
assert.equal(clarify!.metadata?.semantic_reason, "commit_gate_clarify");

const danang = "20시간뒤에 다낭 여행";
assert.ok(isTravelDestinationAmbiguous(danang));
assert.equal(extractTravelDestination(danang), null);

async function main() {
  const pipeline = await runOrchestratorPipeline({
    message: "20시간뒤에 오사카로 여행감",
    chatAxis: "decision",
    masterContext: {
      currentDate: "2026-06-02",
      trustLevel: "L1",
      existingSchedule: [],
      allReminders: [],
      userGoals: [],
      activitySources: [],
      conversationMemories: [],
      activeContainers: [],
      activeChains: [],
      activeChain: null,
      userDefinedActions: [],
      mapApp: "kakao",
    },
  });
  assert.match(pipeline.summary ?? "", /오사카/);
  assert.ok(pipeline.actions.length >= 2);
  assert.ok(!pipeline.summary?.includes("가성비·가격"));
  assert.ok(!pipeline.summary?.includes("무엇을 도와드릴까요?"));
  assert.equal(pipeline.metadata?.semantic_reason, "travel_trip_announcement");
  assert.ok(pipeline.scheduledDelivery?.status === "pending");
  console.log("test-travel-trip-announcement: ok");
}

void main();
