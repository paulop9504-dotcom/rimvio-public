#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { parseLlmRouterJson } from "../lib/action-chat/llm-router/parse-llm-router-json";
import { validateLlmRouterDecision } from "../lib/action-chat/llm-router/validate-llm-router-decision";
import { executeLlmRouterDecision } from "../lib/action-chat/llm-router/execute-llm-router-decision";
import { shouldInvokeLlmRouter } from "../lib/action-chat/llm-router/should-invoke-llm-router";

function main() {
  const decisionJson = JSON.stringify({
    primary_intent: "DECISION",
    executor: "CONVERSATION",
    confidence: 0.88,
    forbid_info_fallback: true,
    user_reply: "지금 당장 필요한지, 예산은 어떤지에 따라 달라요.",
    clarify_question: null,
    reason: "purchase_decision",
  });

  const parsed = parseLlmRouterJson(decisionJson);
  assert.ok(parsed);
  assert.equal(parsed!.primary_intent, "DECISION");

  const validated = validateLlmRouterDecision("이거 사도 돼?", parsed!);
  assert.ok(validated);

  const executed = executeLlmRouterDecision(validated!);
  assert.equal(executed.kind, "result");
  if (executed.kind === "result") {
    assert.match(executed.result.summary ?? "", /예산|당장/);
    assert.equal(executed.result.source, "openai");
  }

  const mealGuard = validateLlmRouterDecision(
    "오늘 뭐 먹지?",
    parseLlmRouterJson(
      JSON.stringify({
        primary_intent: "INFO",
        executor: "CONVERSATION",
        confidence: 0.9,
        forbid_info_fallback: false,
        user_reply: null,
        clarify_question: null,
        reason: "bad_info",
      })
    )!
  );
  assert.ok(mealGuard);
  const mealExec = executeLlmRouterDecision(mealGuard!);
  assert.equal(mealExec.kind, "defer_meal");

  assert.equal(shouldInvokeLlmRouter("배고파"), false);
  assert.equal(shouldInvokeLlmRouter("쿠우쿠우"), false);
  assert.equal(shouldInvokeLlmRouter("둔산동 맛집"), false);
  assert.equal(shouldInvokeLlmRouter("이거 사도 돼?"), false);
  assert.equal(shouldInvokeLlmRouter("어떡하지?"), false);

  console.log("test-llm-router: ok");
}

main();
