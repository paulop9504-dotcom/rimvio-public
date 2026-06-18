#!/usr/bin/env npx tsx
/**
 * Rimvio OS QA — 5 core Action OS protocol scenarios + schema validation.
 * Run: npm run test:qa
 */
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  buildArchitectWireFromTemplate,
  matchActionTemplate,
} from "../lib/action-registry/match-template";
import { parseActionArchitectWire } from "../lib/action-registry/parse-action-architect";
import {
  resetActionRegistryForTests,
  upsertLearningTemplate,
} from "../lib/action-registry/action-registry-store";
import { interceptActionOsFromMessage } from "../lib/action-os/intercept-action-os";
import { parseDockUpdateWire, parseRegisterActionWire } from "../lib/action-os/parse-action-os-wire";
import { parseActionIntentWire } from "../lib/action-dispatcher/parse-action-intent-wire";
import { dispatchAction } from "../lib/action-dispatcher/dispatch-action";
import { orchestratePiiSecurityGate } from "../lib/safety/pii-security-gate";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";
import { runGlobalBrainMiddleware } from "../lib/global-brain/run-global-brain-middleware";
import { masterContextFromApiPayload } from "../lib/action-chat/client-master-context";
import { resolveIntentRoute } from "../lib/action-chat/intent-router";
import {
  formatViolations,
  validateActionIntentWire,
  validateDockUpdateWire,
  validateRegisterActionWire,
} from "./lib/action-os-schema";
import { processActionOsMiddlewareJson } from "./lib/middleware-runner";

type QaCase = {
  id: string;
  input: string;
  run: () => Promise<void> | void;
};

const violations: ReturnType<typeof validateActionIntentWire> = [];
const timings: Array<{ id: string; ms: number }> = [];

function trackTiming(id: string, fn: () => Promise<void> | void) {
  return async () => {
    const start = performance.now();
    await fn();
    timings.push({ id, ms: performance.now() - start });
  };
}

resetActionRegistryForTests([
  {
    id: "learned-fatigue-youtube",
    contextKey: "나\\s*피곤|피곤해",
    category: "Haven",
    scenario: "fatigue_youtube",
    template_status: "PROMOTED",
    strategy_source: "LEARNED_TEMPLATE",
    usage_count: 5,
    main_action: {
      type: "MEDIA",
      label: "유튜브 뮤직",
      prompt: "youtube://",
      priority: 92,
    },
    shadow_actions: [],
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    lastUsedAt: null,
  },
]);

const cases: QaCase[] = [
  {
    id: "1-manual-core",
    input: "10시 인천공항",
    run: trackTiming("1-manual-core", () => {
      const match = matchActionTemplate({ message: "10시 인천공항" });
      assert.ok(match, "expected MANUAL_CORE airport template match");
      assert.equal(match!.tier, "MANUAL_CORE");

      const architect = buildArchitectWireFromTemplate(match!, "10시 인천공항", 120);
      assert.equal(architect.strategy_applied, "MANUAL_CORE");
      assert.ok(architect.shadow_actions.length >= 1, "shadow_actions required");

      const mockLlmDock = {
        thought: "Airport departure at 10 — MANUAL_CORE template",
        strategy: "MANUAL_CORE",
        main_action: {
          label: architect.main_action!.label,
          execution: {
            action_id: "NAVIGATE",
            params: { dest: "인천공항" },
          },
        },
        shadow_actions: architect.shadow_actions.map((item) => ({
          label: item.label,
          execution: { action_id: "FLIGHT_CHECK", params: {} },
          lifecycle: "WARM",
        })),
      };

      const dock = parseDockUpdateWire(mockLlmDock);
      assert.ok(dock);
      violations.push(...validateDockUpdateWire(dock!, "1-manual-core"));

      const processed = processActionOsMiddlewareJson(mockLlmDock, "10시 인천공항");
      assert.ok(processed && "actions" in processed);
      assert.ok(processed!.actions.length >= 1);
      assert.match(processed!.actions[0]?.url ?? "", /kakaomap|인천/i);
    }),
  },
  {
    id: "2-custom-trigger",
    input: "앞으로 '나 피곤해'라고 하면 '유튜브 뮤직' 띄워줘",
    run: trackTiming("2-custom-trigger", () => {
      const nl = interceptActionOsFromMessage(
        "앞으로 '나 피곤해'라고 하면 '유튜브 뮤직' 띄워줘"
      );
      assert.ok(nl);
      assert.equal(nl!.summary, "설정이 완료되었습니다");

      const mockRegister = {
        action: "REGISTER_ACTION",
        trigger_pattern: "나 피곤해",
        action_schema: {
          type: "ACTION_ID",
          action_id: "YOUTUBE_OPEN",
          label: "유튜브 뮤직",
        },
      };
      const register = parseRegisterActionWire(mockRegister);
      assert.ok(register);
      violations.push(...validateRegisterActionWire(register!, "2-custom-trigger"));
    }),
  },
  {
    id: "3-learned-template",
    input: "나 피곤해",
    run: trackTiming("3-learned-template", () => {
      const match = matchActionTemplate({ message: "나 피곤해" });
      assert.ok(match, "expected LEARNED_TEMPLATE match after registration");
      assert.equal(match!.tier, "LEARNED_TEMPLATE");

      const mockLlmDock = {
        thought: "Fatigue pattern → learned youtube template",
        strategy: "LEARNED_TEMPLATE",
        main_action: {
          label: "유튜브 뮤직",
          execution: { action_id: "YOUTUBE_OPEN", params: {} },
        },
        shadow_actions: [],
      };
      const dock = parseDockUpdateWire(mockLlmDock);
      assert.ok(dock);
      assert.equal(dock!.strategy, "LEARNED_TEMPLATE");
      const processed = processActionOsMiddlewareJson(mockLlmDock, "나 피곤해");
      assert.ok(processed && "actions" in processed);
      assert.match(processed!.actions[0]?.url ?? "", /youtube/i);
    }),
  },
  {
    id: "4-security-lock",
    input: "내 주민번호 알려줘",
    run: trackTiming("4-security-lock", async () => {
      const gate = orchestratePiiSecurityGate("내 주민번호 알려줘");
      assert.ok(gate);
      assert.equal(gate!.metadata?.security_level, "HIGH");
      assert.ok(gate!.actions.length >= 1);
      assert.match(gate!.summary, /본인 확인|민감/u);

      const orchestrated = await orchestrateUserMessage({ message: "내 주민번호 알려줘" });
      assert.equal(orchestrated.metadata?.security_level, "HIGH");
    }),
  },
  {
    id: "5-fallback",
    input: "세상에서 제일 맛있는 떡볶이 찾아줘",
    run: trackTiming("5-fallback", () => {
      const mockLlm = {
        action_id: "UNKNOWN",
        params: { query: "세상에서 제일 맛있는 떡볶이" },
        fallback_url: "https://www.google.com/search?q=떡볶이+맛집",
        thought: "Subjective ranking — no registry action · DYNAMIC_INFERENCE fallback",
      };
      const intent = parseActionIntentWire(mockLlm, "세상에서 제일 맛있는 떡볶이 찾아줘");
      assert.ok(intent);
      assert.equal(intent!.action_id, "UNKNOWN");
      violations.push(...validateActionIntentWire(intent!, "5-fallback"));

      const dispatched = dispatchAction(intent!);
      assert.equal(dispatched.type, "WEB_OPEN");
      assert.match(dispatched.url, /^https?:\/\//);

      const dockFallback = parseDockUpdateWire({
        thought: mockLlm.thought,
        strategy: "DYNAMIC_INFERENCE",
        main_action: {
          label: "웹에서 찾기",
          execution: {
            action_id: "WEB_SEARCH",
            params: { query: "떡볶이 맛집" },
          },
        },
        shadow_actions: [],
      });
      assert.ok(dockFallback);
      assert.equal(dockFallback!.strategy, "DYNAMIC_INFERENCE");
    }),
  },
];

async function main() {
  for (const testCase of cases) {
    await testCase.run();
  }

  const context = masterContextFromApiPayload(null);
  const brainStart = performance.now();
  await runGlobalBrainMiddleware({
    message: "10시 인천공항",
    context,
    route: resolveIntentRoute({ message: "10시 인천공항" }),
  });
  timings.push({ id: "global-brain-middleware", ms: performance.now() - brainStart });

  if (violations.length > 0) {
    console.error("Schema violations:\n" + formatViolations(violations));
    process.exit(1);
  }

  const slow = timings.filter((item) => item.ms > 500);
  if (slow.length > 0) {
    console.warn(
      "Performance warning (>500ms):",
      slow.map((item) => `${item.id}=${item.ms.toFixed(0)}ms`).join(", ")
    );
  }

  console.log("rimvio_qa: ok");
  console.log(
    "timings:",
    timings.map((item) => `${item.id}:${item.ms.toFixed(1)}ms`).join(" | ")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
