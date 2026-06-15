#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";
import {
  applyContextIsolation,
  applyIntentRouteToResult,
  extractCurrentTopic,
  resolveIntentRoute,
  scoreTopicRelevance,
  stripPriorTopicReferences,
} from "../lib/action-chat/intent-router";

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 맛집" },
];

const followUp = resolveIntentRoute({
  message: "그럼 다른 날은?",
  history: [...diningHistory, { role: "user", content: "그럼 다른 날은?" }],
  linkTitle: "쿠우쿠우 도안점",
});
assert.equal(followUp.intent_type, "CONTINUE");
assert.equal(followUp.requires_context_switch, false);
assert.equal(followUp.micro_intent, "CONTINUE");

const priceFollowUp = resolveIntentRoute({
  message: "가격은 얼마야?",
  history: [...diningHistory, { role: "user", content: "가격은 얼마야?" }],
  linkTitle: "쿠우쿠우 도안점",
});
assert.equal(priceFollowUp.micro_intent, "DIRECT_QUERY");
assert.equal(priceFollowUp.intent_type, "NEW_TASK");

const thanks = resolveIntentRoute({
  message: "고마워",
  history: [...diningHistory, { role: "user", content: "고마워" }],
  linkTitle: "쿠우쿠우 도안점",
});
assert.equal(thanks.micro_intent, "CLOSE");
assert.equal(thanks.intent_type, "CONTINUE");
assert.equal(thanks.continuity, "HOLD");
assert.equal(thanks.requires_context_switch, false);

const newTask = resolveIntentRoute({
  message: "대전 월드컵 경기장 일정 잡아줘",
  history: [...diningHistory, { role: "user", content: "대전 월드컵 경기장 일정 잡아줘" }],
  linkTitle: "쿠우쿠우 도안점",
});
assert.equal(newTask.intent_type, "NEW_TASK");
assert.equal(newTask.requires_context_switch, true);

const isolated = applyContextIsolation(
  {
    message: "대전 월드컵 경기장 일정 잡아줘",
    history: diningHistory,
    linkTitle: "쿠우쿠우 도안점",
    linkUrl: "https://example.com/kuukuu",
    linkCategory: "place",
  },
  newTask
);
assert.equal(isolated.linkTitle, null);
assert.equal(isolated.history?.length ?? 0, 0);

const topic = extractCurrentTopic({
  history: diningHistory,
  linkTitle: "쿠우쿠우 도안점",
  currentMessage: "대전 월드컵 경기장 일정 잡아줘",
});
assert.match(topic ?? "", /쿠우쿠우/);

const relevance = scoreTopicRelevance("쿠우쿠우 도안점", "대전 월드컵 경기장 일정 잡아줘");
assert.ok(relevance < 0.2);

const stripped = stripPriorTopicReferences(
  "쿠우쿠우 도안점 일정도 같이 넣을까요?",
  "쿠우쿠우 도안점"
);
assert.ok(!stripped.includes("쿠우쿠우"));

const ruleResult = orchestrateByRules({
  message: "대전 월드컵 경기장 일정 잡아줘",
  linkTitle: "쿠우쿠우 도안점",
  intentRoute: newTask,
});
assert.ok(!ruleResult.summary.includes("쿠우쿠우"));

const withMeta = applyIntentRouteToResult(
  {
    summary: "월드컵 경기장 일정",
    actions: [],
    source: "rules",
  },
  newTask
);
assert.equal(withMeta.meta?.intent_type, "NEW_TASK");
assert.equal(withMeta.meta?.requires_context_switch, true);

const continueAfterQuestion = resolveIntentRoute({
  message: "응",
  history: [
    ...diningHistory,
    { role: "assistant", content: "예약 도와드릴까요?" },
    { role: "user", content: "응" },
  ],
});
assert.equal(continueAfterQuestion.micro_intent, "ACK");

console.log("test-intent-router: ok");
