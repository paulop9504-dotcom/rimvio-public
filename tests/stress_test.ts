#!/usr/bin/env npx tsx
/**
 * Rimvio OS stress tests — redundancy sanitizer, multi-intent, resilience.
 * Run: npm run test:stress
 */
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { parseActionIntentWire } from "../lib/action-dispatcher/parse-action-intent-wire";
import {
  appendSanitizerThought,
  sanitizeActionParams,
  sanitizeParamValue,
} from "../lib/action-dispatcher/sanitize-action-params";
import { parseDockUpdateWire } from "../lib/action-os/parse-action-os-wire";
import { resolveTemporalExpression } from "../lib/time/temporal-resolver";
import { orchestrateConversationRecall } from "../lib/conversation-memory/orchestrate-conversation-recall";
import {
  assertValidJsonObject,
  parseJsonOnly,
  processActionOsMiddlewareJson,
} from "./lib/middleware-runner";
import { validateDockUpdateWire, formatViolations } from "./lib/action-os-schema";

const violations: ReturnType<typeof validateDockUpdateWire> = [];

function mockLlmNavigate(dest: string, thought?: string) {
  return {
    action_id: "NAVIGATE",
    params: { dest },
    fallback_url: "https://map.naver.com",
    thought,
  };
}

// --- Redundancy sanitizer (user-provided cases) ---
const redundancyCases = [
  {
    id: "redundancy-exact-dup",
    input: "대전 떡반집 대전 떡반집 길 찾기 해줘",
    dirtyDest: "대전 떡반집 대전 떡반집",
    expectedDest: "대전 떡반집",
  },
  {
    id: "redundancy-sentence-repeat",
    input: "떡반집 어디야? 떡반집 어디야?",
    dirtyDest: "대전 떡반집 대전 떡반집",
    expectedDest: "대전 떡반집",
  },
  {
    id: "redundancy-filler-dup",
    input: "음.. 저기 대전 떡반집 대전 떡반집 검색해줘 검색해줘",
    dirtyDest: "음.. 저기 대전 떡반집 대전 떡반집",
    expectedDest: "대전 떡반집",
  },
];

for (const testCase of redundancyCases) {
  const sanitized = sanitizeParamValue(testCase.dirtyDest);
  assert.equal(
    sanitized.value,
    testCase.expectedDest,
    `${testCase.id}: expected clean dest`
  );
  assert.equal(sanitized.deduped, true, `${testCase.id}: expected dedup flag`);

  const mockJson = mockLlmNavigate(testCase.dirtyDest, "Route planning");
  const intent = parseActionIntentWire(mockJson, testCase.input);
  assert.ok(intent, `${testCase.id}: parse failed`);
  assert.equal(intent!.params.dest, testCase.expectedDest);
  assert.ok(
    intent!.thought?.includes("중복 입력") || intent!.thought?.includes("정제"),
    `${testCase.id}: thought must mention dedupe`
  );

  const processed = processActionOsMiddlewareJson(mockJson, testCase.input);
  assert.ok(processed && "actions" in processed);
  assert.match(processed!.actions[0]?.url ?? "", /%EB%8C%80%EC%A0%84|대전/i);
}

// --- Multi-intent dock ---
const multiIntent = {
  thought: "Three parallel actions extracted",
  strategy: "DYNAMIC_INFERENCE",
  main_action: {
    label: "길찾기",
    execution: { action_id: "NAVIGATE", params: { dest: "대전역" } },
  },
  shadow_actions: [
    {
      label: "택시",
      execution: { action_id: "TAXI_CALL", params: { dest: "대전역" } },
      lifecycle: "WARM",
    },
    {
      label: "전화",
      execution: { action_id: "TEL_CALL", params: { number: "010-1234-5678" } },
      lifecycle: "WARM",
    },
  ],
};
const multiDock = parseDockUpdateWire(multiIntent);
assert.ok(multiDock);
assert.equal(multiDock!.shadow_actions.length, 2);
violations.push(...validateDockUpdateWire(multiDock!, "multi-intent"));

// --- Conditional branching (must not crash) ---
const conditionalRaw = {
  action_id: "NAVIGATE",
  params: { dest: "떡반집", if_closed: "대전역 맛집으로 변경" },
  fallback_url: "https://map.naver.com",
  thought: "Conditional noted — primary dest still parsed",
};
const conditional = parseActionIntentWire(conditionalRaw, "떡반집 문 닫았으면 대전역 맛집");
assert.ok(conditional);
assert.equal(conditional!.params.dest, "떡반집");

// --- Conversational correction (session state discards prior intent) ---
import {
  applySessionIntentCorrection,
  commitSessionIntent,
  getSessionIntent,
  resetSessionIntentStoreForTests,
} from "../lib/action-os/session-intent-state";
import { processActionOsWithSession } from "../lib/action-dispatcher/process-action-os-with-session";

resetSessionIntentStoreForTests("stress");

commitSessionIntent(
  {
    action_id: "NAVIGATE",
    params: { dest: "떡반집" },
    fallback_url: "https://map.naver.com",
    thought: "Initial navigate",
  },
  "stress"
);

const correctedState = applySessionIntentCorrection({
  message: "아니야 대전역으로",
  previous: getSessionIntent("stress"),
});
assert.ok(correctedState);
assert.equal(correctedState!.params.dest, "대전역");

const correctedRun = processActionOsWithSession({
  raw: {},
  userMessage: "아니야 대전역으로",
  scopeId: "stress",
});
assert.ok(correctedRun && "actions" in correctedRun);
assert.match(correctedRun!.actions[0]?.url ?? "", /%EB%8C%80%EC%A0%84|대전/i);
assert.equal(getSessionIntent("stress")?.params.dest, "대전역");

// --- Relative temporal context (minute-level + day-level) ---
const refNow = new Date("2026-05-29T12:00:00+09:00");
const tenMinutes = resolveTemporalExpression({
  message: "10분 안에 출발",
  referenceDate: "2026-05-29",
  now: refNow,
});
assert.ok(tenMinutes, "expected minute-level temporal for '10분 안에'");
assert.equal(tenMinutes!.offsetMinutes, 10);
assert.equal(tenMinutes!.iso, "2026-05-29T12:10:00");

const threeDays = resolveTemporalExpression({
  message: "3일 뒤 출발",
  referenceDate: "2026-05-29",
  now: refNow,
});
assert.ok(threeDays, "expected day-level temporal for '3일 뒤'");

// --- Ambiguity / prior context lookup ---
const recall = orchestrateConversationRecall({
  message: "아까 말한 그곳으로 길찾기",
  memories: [
    {
      id: "mem-1",
      topic: "place",
      summary: "대전 떡반집 검색했었음",
      keywords: ["대전", "떡반집"],
      createdAt: "2026-05-29T11:00:00.000Z",
    },
  ],
});
assert.ok(recall, "expected conversation recall for ambiguous place reference");

// --- Negative: malformed must not crash middleware ---
const invalidJsonInputs = ["{ not-json", "욕설만 하고 JSON 없음", '{"action_id":'];

for (const raw of invalidJsonInputs) {
  let threw = false;
  try {
    parseJsonOnly(raw, "negative");
  } catch {
    threw = true;
  }
  assert.equal(threw, true, `expected parseJsonOnly to reject: ${raw.slice(0, 30)}`);
}

const partial = assertValidJsonObject(
  JSON.parse('{"action_id":"TAXI_CALL","params":{"dest":null},"fallback_url":"https://map.naver.com"}'),
  "partial-null-param"
);
const partialResult = processActionOsMiddlewareJson(partial);
assert.ok(
  partialResult === null || ("actions" in partialResult && Array.isArray(partialResult.actions)),
  "partial JSON must not crash middleware"
);

const emptyDispatch = processActionOsMiddlewareJson({ summary: "hello" });
assert.equal(emptyDispatch, null);

// --- Performance budget ---
const perfStart = performance.now();
for (let i = 0; i < 200; i++) {
  parseActionIntentWire(
    mockLlmNavigate("대전 떡반집 대전 떡반집"),
    "대전 떡반집 대전 떡반집"
  );
}
const perfMs = performance.now() - perfStart;
assert.ok(perfMs < 500, `sanitizer loop too slow: ${perfMs.toFixed(0)}ms`);

if (violations.length > 0) {
  console.error(formatViolations(violations));
  process.exit(1);
}

console.log("stress_test: ok");
console.log(`sanitizer-200-iter: ${perfMs.toFixed(1)}ms`);
