#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  gateOrchestratorScopeAi,
  resolveOrchestratorPinScope,
  resolvePinScope,
  resolveScopeAiPolicy,
  scopeAiBlocks,
  SCOPE_AI_PERSONA_META_KEY,
  SCOPE_AI_PIN_SCOPE_META_KEY,
} from "../lib/scope-ai";
import { buildScopeAiMetadataPatch } from "../lib/scope-ai/stamp-scope-ai-metadata";
import { resolveActivePinScope } from "../lib/globe/pin-domain-registry";

assert.equal(resolvePinScope("external"), resolveActivePinScope("external"));
assert.equal(resolvePinScope("internal"), "internal");

assert.equal(resolveScopeAiPolicy("internal").persona, "guardian");
assert.equal(resolveScopeAiPolicy("external").persona, "explorer");
assert.deepEqual(resolveScopeAiPolicy("internal").verbs, [
  "recall",
  "nudge",
  "preserve",
]);
assert.deepEqual(resolveScopeAiPolicy("external").verbs, [
  "discover",
  "connect",
  "compose",
]);

assert.equal(
  resolveOrchestratorPinScope({ message: "안녕", pinScopeHint: null }),
  "internal",
);
assert.equal(
  resolveOrchestratorPinScope({
    message: "@모임 토요일 4명",
    pinScopeHint: null,
  }),
  "external",
);
assert.equal(
  resolveOrchestratorPinScope({
    message: "맛집 추천",
    pinScopeHint: "external",
  }),
  "external",
);
assert.equal(
  resolveOrchestratorPinScope({
    message: "맛집 추천",
    composerContext: "[@mention]\npin_scope: external",
  }),
  "external",
);

const internalDiscovery = gateOrchestratorScopeAi({
  scope: "internal",
  message: "강남 맛집 추천해줘",
});
assert.ok(scopeAiBlocks(internalDiscovery, "discovery_list_hero"));

const internalMealAxis = gateOrchestratorScopeAi({
  scope: "internal",
  message: "강남 맛집 추천해줘",
  chatAxis: "meal",
});
assert.equal(internalMealAxis.blockedCapabilities.length, 0);

const externalNudge = gateOrchestratorScopeAi({
  scope: "external",
  message: "내일 병원 예약 있음",
});
assert.ok(scopeAiBlocks(externalNudge, "private_schedule_nudge"));

const internalCareer = gateOrchestratorScopeAi({
  scope: "internal",
  message: "창업하고 싶어 인생 플랜 짜줘",
});
assert.ok(scopeAiBlocks(internalCareer, "life_plan_rewrite"));

const patch = buildScopeAiMetadataPatch(internalDiscovery);
assert.equal(patch[SCOPE_AI_PIN_SCOPE_META_KEY], "internal");
assert.equal(patch[SCOPE_AI_PERSONA_META_KEY], "guardian");

console.log("test-scope-ai-gates: ok");
