#!/usr/bin/env npx tsx
/**
 * Playbook audit — #1–#9 routing matrix (deterministic gates, no UI).
 */
import assert from "node:assert/strict";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { orchestrateEntityQuickPick } from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { parseFindPlaceIntent } from "../lib/context-resolver/discovery/parse-find-place-intent";
import { isVitalityStateUtterance } from "../lib/vitality-state/classify-vitality-state-intent";
import { inferContractAction } from "../lib/event-kernel";
import { buildEntityActionSurface } from "../lib/event-kernel/entity/entity-action-surface";
import { isOpenAiConfigured } from "../lib/llm/openai-config";

const GENERIC = "무엇을 도와드릴까요?";
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

type Case = {
  id: number;
  message: string;
  forbid?: RegExp;
  require?: RegExp;
  gate?: (msg: string) => boolean;
};

const cases: Case[] = [
  { id: 1, message: "배고파", forbid: new RegExp(GENERIC), require: /배고|맛|먹/i },
  { id: 1, message: "둔산동 맛집", forbid: new RegExp(GENERIC), require: /맛집|둔산|찾|식당/i },
  { id: 2, message: "배고파", gate: (m) => orchestrateEntityQuickPick(m) === null },
  { id: 2, message: "스트레스", gate: (m) => orchestrateEntityQuickPick(m) === null },
  { id: 3, message: "둔산동 맛집", gate: (m) => parseFindPlaceIntent(m) !== null },
  { id: 4, message: "졸려", gate: (m) => isVitalityStateUtterance(m) },
  { id: 4, message: "스트레스", gate: (m) => isVitalityStateUtterance(m) },
  { id: 5, message: "쿠우쿠우", require: /쿠우쿠우/, gate: (m) => buildEntityActionSurface(m) !== null },
  { id: 5, message: "삼성전자", gate: (m) => buildEntityActionSurface(m)?.entityType === "COMPANY" },
];

async function main() {
  const failures: string[] = [];

  for (const c of cases) {
    if (c.gate && !c.gate(c.message)) {
      failures.push(`#${c.id} gate fail: ${c.message}`);
    }
  }

  for (const message of ["배고파", "졸려", "스트레스", "둔산동 맛집", "쿠우쿠우", "삼성전자", "애플"]) {
    const result = await runOrchestratorPipeline({ message, masterContext });
    const summary = result.summary ?? "";
    const caseMeta = cases.find((c) => c.message === message && (c.forbid || c.require));
    if (caseMeta?.forbid?.test(summary)) {
      failures.push(`#${caseMeta.id} pipeline generic: ${message} → ${summary.slice(0, 40)}`);
    }
    if (caseMeta?.require && !caseMeta.require.test(summary) && !result.entityQuickPick && !result.experienceChoice && !result.cafeDiscovery) {
      failures.push(`#${caseMeta.id} pipeline weak: ${message} → ${summary.slice(0, 60)}`);
    }
  }

  assert.equal(inferContractAction("둔산동 맛집"), "MEAL_RECOMMENDATION");
  console.log("OpenAI configured:", isOpenAiConfigured());

  if (failures.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", failures }, null, 2));
    process.exit(1);
  }
  console.log("test-playbook-routing-audit: ok", { cases: cases.length });
}

void main();
