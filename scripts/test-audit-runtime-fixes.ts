#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  decideKernelIntent,
  orchestrateEventKernel,
  collectMemoryHints,
  runEventKernelOS,
  inferContractAction,
  extractSlots,
  evaluateContractGate,
  resetKernelMemoryStoreForTests,
} from "../lib/event-kernel";
import { orchestrateEntityQuickPick } from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import {
  buildEntityActionSurface,
  detectEntityOnlyInput,
} from "../lib/event-kernel/entity/entity-action-surface";
import { eventKernelOSIsTerminal } from "../lib/event-kernel/run-event-kernel-os";

resetKernelMemoryStoreForTests();

function snapshot(message: string) {
  const kernel = orchestrateEventKernel({ message, history: [] });
  const hints = collectMemoryHints({
    message,
    history: [],
    memory: null,
    frameEntities: kernel.frame.entities,
  });
  const kd = decideKernelIntent({ message, history: [], base: kernel, memoryHints: hints });
  const os = runEventKernelOS({ message, history: [] });
  return {
    kernelIntent: { state: kd.state, route: kd.route },
    actionBucket: inferContractAction(message),
    extractedSlots: extractSlots(message).slots,
    contractGate: evaluateContractGate(message).state,
    entityQuickPick: orchestrateEntityQuickPick(message) !== null,
    entityOnly: detectEntityOnlyInput(message) !== null,
    executionRoute: {
      plan: os.executionPlan.action,
      hint: os.execution.hint,
      terminal: eventKernelOSIsTerminal(os),
    },
  };
}

const airport = snapshot("인천공항 길찾기");
assert.equal(airport.kernelIntent.state, "DIRECT_ACTION");
assert.equal(airport.actionBucket, "NAVIGATE");
assert.equal(airport.extractedSlots.destination, "인천공항");
assert.equal(airport.contractGate, "PROCEED");

const schedule = snapshot("일정 정리");
assert.equal(schedule.actionBucket, "SCHEDULE_ORGANIZE");
assert.equal(schedule.entityOnly, false);
assert.equal(schedule.entityQuickPick, false);

const meal = snapshot("오늘 점심 추천");
assert.equal(meal.actionBucket, "MEAL_RECOMMENDATION");
assert.equal(meal.executionRoute.plan, "MEAL_RECOMMENDATION");
assert.notEqual(meal.executionRoute.hint, "search");
assert.equal(meal.executionRoute.hint, "meal_recommendation");

const hunger = snapshot("배고파");
assert.equal(hunger.entityOnly, false, "배고파 is not entity-only");
assert.equal(hunger.entityQuickPick, false, "배고파 must not trigger entity quick pick");
assert.equal(buildEntityActionSurface("배고파"), null);
assert.equal(orchestrateEntityQuickPick("배고파"), null);

console.log("test-audit-runtime-fixes: ok");
