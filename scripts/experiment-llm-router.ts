#!/usr/bin/env npx tsx
/**
 * Live LLM router experiment — OpenAI required.
 *
 * Usage:
 *   npm run experiment:llm-router
 *   npm run experiment:llm-router -- "이거 사도 돼?" "어떡하지?"
 */
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { classifyAiIntentUtterance } from "../lib/action-chat/classify-ai-intent-utterance";
import { analyzeSemanticRouting } from "../lib/action-chat/classify-semantic-routing-surface";
import { orchestrateAiIntent } from "../lib/action-chat/orchestrate-ai-intent";
import {
  isLlmRouterEnabled,
  routeWithLlm,
  shouldInvokeLlmRouter,
} from "../lib/action-chat/llm-router";
import { resolveHonestRoutingSurface } from "../lib/testing/routing-stress/resolve-honest-routing-surface";
import { isOpenAiConfigured, openAiModel } from "../lib/llm/openai-config";
import { enrichPlaceDiscoveryMessage } from "../lib/context-resolver/discovery/enrich-place-discovery-message";
import { loadEnvLocal } from "../lib/test/load-env-local";

loadEnvLocal();

const DEFAULT_UTTERANCES = [
  "이거 사도 돼?",
  "어떡하지?",
  "뭐하지",
  "A vs B 뭐가 좋아?",
  "피곤한데 뭐 먹지",
  "스트레스 받아",
  "배고파",
  "쿠우쿠우",
  "둔산동 맛집",
  "오늘 뭐 먹지?",
];

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

function line(label: string, value: string) {
  console.log(`  ${label.padEnd(14)} ${value}`);
}

async function experimentOne(message: string) {
  const routingMessage = enrichPlaceDiscoveryMessage(message, undefined);
  const semantic = analyzeSemanticRouting(message);
  const aiCategory = classifyAiIntentUtterance(message);
  const ruleStub = orchestrateAiIntent(routingMessage);
  const invoke = shouldInvokeLlmRouter(message, routingMessage);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`INPUT: ${message}`);
  line("semantic", `${semantic.domain} | forbidInfo=${semantic.forbidInfo}`);
  line("rule category", aiCategory ?? "(null)");
  line("invoke router?", invoke ? "YES" : "NO (rule fast-path or disabled)");
  line("rule stub", ruleStub?.summary?.slice(0, 56) ?? "(null → pipeline)");

  if (!invoke) {
    const result = await runOrchestratorPipeline({ message, masterContext });
    line("pipeline", resolveHonestRoutingSurface(message, result));
    line("summary", (result.summary ?? "").slice(0, 120));
    line("source", result.source ?? "?");
    return;
  }

  const routerStart = Date.now();
  const outcome = await routeWithLlm({
    message,
    routingMessage,
  });
  const routerMs = Date.now() - routerStart;

  if (!outcome) {
    line("router", `FAIL (${routerMs}ms) → rule fallback`);
    if (process.env.LLM_ROUTER_DEBUG === "1") {
      const { debugRouteWithLlm } = await import("../lib/action-chat/llm-router/debug-route-with-llm");
      line("router err", (await debugRouteWithLlm({ message, routingMessage })) ?? "unknown");
    } else {
      line("hint", "429/quota? run: LLM_ROUTER_DEBUG=1 npm run experiment:llm-router -- \"…\"");
    }
    const result = await runOrchestratorPipeline({ message, masterContext });
    line("pipeline", resolveHonestRoutingSurface(message, result));
    line("summary", (result.summary ?? "").slice(0, 120));
    return;
  }

  line("router ms", String(routerMs));
  line("router kind", outcome.kind);

  if (outcome.kind === "result") {
    const meta = outcome.result.metadata as Record<string, unknown> | undefined;
    const routerMeta = meta?.llm_router as Record<string, unknown> | undefined;
    line("intent", String(routerMeta?.primary_intent ?? meta?.ai_intent ?? "?"));
    line("summary", (outcome.result.summary ?? "").slice(0, 160));
    line("source", outcome.result.source ?? "?");
    return;
  }

  if (outcome.kind === "defer_meal") {
    line("router", "defer → meal executor");
    const result = await runOrchestratorPipeline({ message, masterContext });
    line("pipeline", resolveHonestRoutingSurface(message, result));
    line("summary", (result.summary ?? "").slice(0, 120));
    line("forks", String(result.cafeDiscovery?.options?.length ?? 0));
  }
}

async function main() {
  const custom = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const utterances = custom.length > 0 ? custom : DEFAULT_UTTERANCES;

  console.log("=== LLM Router Experiment ===");
  console.log(`OpenAI configured: ${isOpenAiConfigured()}`);
  console.log(`LLM router enabled: ${isLlmRouterEnabled()}`);
  console.log(`Model: ${openAiModel()}`);

  if (!isOpenAiConfigured()) {
    console.error("\nOPENAI_API_KEY missing in .env.local — add key and retry.");
    process.exit(1);
  }

  if (!isLlmRouterEnabled()) {
    console.error("\nRouter disabled (RIMVIO_LLM_ROUTER=false). Remove flag to experiment.");
    process.exit(1);
  }

  for (const message of utterances) {
    await experimentOne(message);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("done — compare invoke=NO (rule) vs YES (LLM router + reply)");
}

void main();
