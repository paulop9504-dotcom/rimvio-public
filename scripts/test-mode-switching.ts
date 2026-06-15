#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { tryBatchConfirmPriority } from "../lib/action-chat/batch-confirm-priority";
import {
  classifyIntentRouter,
  deriveOrchestratorMode,
  detectActionIntent,
  parseConversationalAssistantText,
  resolveOrchestratorMode,
} from "../lib/action-chat/mode-switching";
import { buildLayeredMasterOrchestratorSystemPrompt } from "../lib/action-chat/layered-system-prompt";
import { defaultMasterOrchestratorContext } from "../lib/action-chat/master-orchestrator-context";
import { resolveIntentRoute } from "../lib/action-chat/intent-router";
import { parseMasterOrchestratorJson } from "../lib/action-chat/wire-to-actions";

// Mode switching
// Intent Router examples (Step 1)
const actionRoute = resolveIntentRoute({ message: "쿠우쿠우 가격", history: [] });
const actionExample = deriveOrchestratorMode("쿠우쿠우 가격", actionRoute);
assert.equal(actionExample.mode, "action");
assert.match(actionExample.reason, /action|JSON|액션|실행|kernel/);

const chatRoute = resolveIntentRoute({ message: "와, 오늘 날씨 진짜 좋다 그치?", history: [] });
const chatExample = deriveOrchestratorMode("와, 오늘 날씨 진짜 좋다 그치?", chatRoute);
assert.equal(chatExample.mode, "conversation");
assert.match(chatExample.reason, /conversation|대화|kernel/);

assert.equal(resolveOrchestratorMode("ㅎㅇ"), "conversation");
assert.equal(resolveOrchestratorMode("둔산동 갤러리아 내일 5시"), "action");
assert.equal(detectActionIntent("요즘 기분이 좀 그래"), false);
assert.equal(detectActionIntent("010-1234-5678 저장해"), true);

const convPrompt = buildLayeredMasterOrchestratorSystemPrompt({
  context: defaultMasterOrchestratorContext({ currentDate: "2026-05-29" }),
  route: resolveIntentRoute({ message: "요즘 어때?", history: [] }),
  message: "요즘 어때?",
  mode: "conversation",
});
assert.match(convPrompt, /Conversational \(Natural Language\)/);
assert.match(convPrompt, /규격화된 데이터를 뱉는 기계가 아니라/);
assert.match(convPrompt, /RIMVIO PERSONALITY GUIDELINES/);
assert.match(convPrompt, /thought 과정을/);
assert.doesNotMatch(convPrompt, /Output \(strict JSON only\)/);

const actionPrompt = buildLayeredMasterOrchestratorSystemPrompt({
  context: defaultMasterOrchestratorContext({ currentDate: "2026-05-29" }),
  route: resolveIntentRoute({ message: "둔산동 갤러리아", history: [] }),
  message: "둔산동 갤러리아",
  mode: "action",
});
assert.match(actionPrompt, /strict JSON/i);

assert.equal(
  parseConversationalAssistantText("안녕하세요! 오늘 무엇을 도와드릴까요?"),
  "안녕하세요! 오늘 무엇을 도와드릴까요?"
);

// Batch vs Confirm priority
const mixed =
  "오늘 오후 5시 3분에 둔산동 갤러리아 갈 거야. 그리고 010-1234-5678 저장해 놔.";
const confirmRoot = tryBatchConfirmPriority({
  message: mixed,
  referenceDate: "2026-05-29",
});

assert.ok(confirmRoot);
assert.equal(confirmRoot!.confirmation?.meta.intent, "CONFIRM");
assert.ok(confirmRoot!.thought?.includes("Missing"));
assert.ok((confirmRoot!.confirmation?.batch_pending?.length ?? 0) >= 1);
assert.equal(confirmRoot!.actions.length, 0);

const parsed = parseMasterOrchestratorJson(
  JSON.stringify({
    thought: "테스트 의도",
    summary: "장소 확인",
    meta: { intent: "CONFIRM" },
    confirm_message: "맞습니까?",
    confirm_data: { subject: "갤러리아", category: "PLACE" },
    extracted_data: { address: null, phone: null, datetime: null, place_name: "갤러리아", url: null },
    batch_pending: [{ type: "PHONE", summary: "연락처 저장" }],
    actions: [],
  })
);

assert.ok(parsed);
assert.equal(parsed!.thought, "테스트 의도");
assert.equal(parsed!.confirmation?.confirm_data?.category, "PLACE");
assert.equal(parsed!.confirmation?.batch_pending?.length, 1);

console.log("test-mode-switching: ok");
