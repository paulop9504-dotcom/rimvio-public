#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { orchestrateEntityQuickPick } from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { parseFindPlaceIntent } from "../lib/context-resolver/discovery/parse-find-place-intent";
import { isVitalityStateUtterance } from "../lib/vitality-state/classify-vitality-state-intent";
import { inferContractAction } from "../lib/event-kernel";

const masterContext = {
  currentDate: "2026-06-02",
  trustLevel: "L1" as const,
  existingSchedule: [],
  allReminders: [],
  userGoals: [],
  activitySources: [],
  conversationMemories: [],
  activeContainers: [],
  activeChains: [],
  activeChain: null,
  userDefinedActions: [],
  mapApp: "kakao" as const,
};

const GENERIC_CLARIFY = "무엇을 도와드릴까요?";

async function main() {
  async function route(message: string) {
    return runOrchestratorPipeline({ message, masterContext });
  }

  const anchorDining = parseFindPlaceIntent("둔산동 맛집");
  assert.ok(anchorDining, "둔산동 맛집 parses as place discovery");
  assert.equal(anchorDining!.anchor, "둔산동");
  assert.equal(inferContractAction("둔산동 맛집"), "MEAL_RECOMMENDATION");

  assert.equal(isVitalityStateUtterance("배고파"), true);
  assert.equal(orchestrateEntityQuickPick("배고파"), null);

  const hunger = await route("배고파");
  assert.notEqual(hunger.summary, GENERIC_CLARIFY, "배고파 must not fall through to kernel CLARIFY");
  assert.ok(
    hunger.experienceChoice || hunger.cafeDiscovery || /배고|맛집|먹/i.test(hunger.summary ?? ""),
    "배고파 should route to vitality/meal response"
  );

  const anchorMeal = await route("둔산동 맛집");
  assert.notEqual(anchorMeal.summary, GENERIC_CLARIFY, "둔산동 맛집 must not fall through to kernel CLARIFY");
  assert.ok(
    anchorMeal.cafeDiscovery || /맛집|둔산동|찾/i.test(anchorMeal.summary ?? ""),
    "둔산동 맛집 should route to meal/discovery response"
  );

  const brand = await route("쿠우쿠우");
  assert.ok(brand.entityQuickPick || /쿠우쿠우/.test(brand.summary ?? ""), "쿠우쿠우 stays entity quick pick");

  for (const message of ["졸려", "스트레스"]) {
    const result = await route(message);
    assert.notEqual(result.summary, GENERIC_CLARIFY, `${message} must not CLARIFY`);
  }

  const apple = await route("애플");
  assert.ok(apple.entityQuickPick, "애플 entity quick pick");
  assert.ok(
    (apple.entityQuickPick?.options ?? []).some((option) => /뉴스|제품|채용/.test(option.label)),
    "애플 should expose company facets"
  );

  console.log("test-orchestrator-routing-matrix: ok");
}

void main();
