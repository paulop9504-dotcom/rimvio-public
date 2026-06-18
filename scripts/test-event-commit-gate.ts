#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  orchestrateEventCommitGate,
  parseEventIntent,
  resolveEventCommitGate,
} from "../lib/event-commit-gate";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";

const travelAmbiguous = parseEventIntent({ message: "20시간뒤에 로마 여행" });
assert.ok(travelAmbiguous);
assert.equal(travelAmbiguous!.intent, "travel");
assert.deepEqual(travelAmbiguous!.missing_slots, ["location"]);
assert.equal(travelAmbiguous!.clarify_mode, "schedule_confirm");
assert.equal(resolveEventCommitGate(travelAmbiguous!).decision, "CLARIFY");

const travelClarify = orchestrateEventCommitGate({ message: "20시간뒤에 로마 여행" });
assert.ok(travelClarify);
assert.equal(travelClarify!.pendingConfirm, true);
assert.equal(travelClarify!.metadata?.semantic_reason, "commit_gate_clarify");
assert.match(travelClarify!.confirmation?.persona_message ?? "", /일정으로 등록/);

const travelClear = parseEventIntent({ message: "20시간뒤에 오사카로 여행감" });
assert.ok(travelClear);
assert.equal(travelClear!.missing_slots.length, 0);
assert.equal(orchestrateEventCommitGate({ message: "20시간뒤에 오사카로 여행감" }), null);

const meetingNoPlace = parseEventIntent({ message: "내일 3시 미팅" });
assert.ok(meetingNoPlace);
assert.ok(meetingNoPlace!.missing_slots.includes("place"));
assert.ok(orchestrateEventCommitGate({ message: "내일 3시 미팅" })?.pendingConfirm);

const navigate = orchestrateEventCommitGate({ message: "길찾기" });
assert.ok(navigate);
assert.equal(navigate!.metadata?.semantic_reason, "commit_gate_slot_collect");

assert.equal(
  orchestrateEventCommitGate({ message: "배고파" }),
  null,
  "vitality utterances bypass commit gate slot collect",
);

async function main() {
  const hunger = await runOrchestratorPipeline({
    message: "배고파",
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
  assert.notEqual(hunger.metadata?.semantic_reason, "commit_gate_slot_collect");
  assert.ok(
    hunger.experienceChoice || hunger.cafeDiscovery || /배고|맛집|먹/i.test(hunger.summary ?? ""),
    "배고파 pipeline must route to vitality/meal, not commit gate",
  );

  const pipeline = await runOrchestratorPipeline({
    message: "20시간뒤에 다낭 여행",
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
  assert.equal(pipeline.metadata?.semantic_reason, "commit_gate_clarify");
  assert.equal(pipeline.pendingConfirm, true);
  assert.equal(pipeline.scheduledDelivery, undefined);
  console.log("test-event-commit-gate: ok");
}

void main();
