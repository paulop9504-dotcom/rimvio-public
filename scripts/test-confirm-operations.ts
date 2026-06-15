#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  applyLocationCorrectionToConfirm,
  attachConfirmInterrupt,
  buildLocationCorrectionFromInput,
  classifyConfirmInterrupt,
  findPendingPlaceConfirm,
  respondToConfirmSystemQuery,
} from "../lib/action-chat/confirm-interrupt";
import { isSystemQuery } from "../lib/action-chat/confirm-input-guard";
import { flushBatchPendingTransactionally } from "../lib/action-chat/transactional-flush";
import { resetKnowledgeEntityMemoryForTests } from "../lib/knowledge/knowledge-entity-db";
import type { ActionChatMessage } from "../lib/action-chat/orchestrator-types";

resetKnowledgeEntityMemoryForTests();

async function main() {
function assistantConfirm(id: string): ActionChatMessage {
  return {
    id,
    role: "assistant",
    text: "대전 둔산동 갤러리아가 맞습니까?",
    createdAt: new Date().toISOString(),
    pendingConfirm: true,
    confirmation: {
      meta: { intent: "CONFIRM" },
      confirm_message: "대전 둔산동 갤러리아가 맞습니까?",
      batch_pending: [
        {
          type: "PHONE",
          summary: "010-1234-5678 저장",
          extracted_data: { phone: "01012345678" },
        },
        {
          type: "DATETIME",
          summary: "오후 5시 일정",
          extracted_data: { datetime: "2026-05-29T17:00:00" },
        },
      ],
    },
  };
}

// ① Interrupt: off-topic while CONFIRM pending
assert.equal(classifyConfirmInterrupt("와 날씨 좋다"), "off_topic");
assert.equal(classifyConfirmInterrupt("네"), "continue_confirm");
assert.equal(classifyConfirmInterrupt("취소"), "cancel_task");
assert.equal(classifyConfirmInterrupt("왜 액션 안 줌??"), "system_query");
assert.ok(isSystemQuery("왜 액션 안 줌??"));

const thread = [
  { id: "u1", role: "user" as const, text: "둔산동 갤러리아", createdAt: "2026-05-29T10:00:00.000Z" },
  assistantConfirm("a1"),
];
const pending = findPendingPlaceConfirm(thread);
assert.ok(pending?.id === "a1");

const interrupted = attachConfirmInterrupt(
  thread,
  "a1",
  { id: "u2", role: "user", text: "와 날씨 좋다", createdAt: "2026-05-29T10:01:00.000Z" },
  "와 날씨 좋다"
);
assert.equal(interrupted.at(-1)?.text, "와 날씨 좋다");
assert.equal(interrupted.find((m) => m.id === "a1")?.confirmation?.interrupt?.awaiting_choice, true);

// ② Missing required params
const missingReport = await flushBatchPendingTransactionally([
  { type: "PHONE", summary: "번호 없음", extracted_data: {} },
  {
    type: "DATETIME",
    summary: "일정",
    extracted_data: { datetime: "2026-05-29T17:00:00" },
  },
]);
assert.equal(missingReport.failed.length, 1);
assert.equal(missingReport.failed[0]?.error, "missing_phone");
assert.equal(missingReport.succeeded.length, 1);
assert.match(missingReport.summary, /완료했지만|실패/);

// ③ Simulated timeout on 2nd item
const timeoutReport = await flushBatchPendingTransactionally(
  [
    {
      type: "PHONE",
      summary: "연락처",
      extracted_data: { phone: "01012345678" },
    },
    {
      type: "DATETIME",
      summary: "일정",
      extracted_data: { datetime: "2026-05-29T17:00:00" },
    },
    {
      type: "DATETIME",
      summary: "두번째 일정",
      extracted_data: { datetime: "2026-05-29T18:00:00" },
    },
  ],
  {
    simulateTimeoutOnIndex: 1,
    executor: async () => {
      /* success path */
    },
  }
);
assert.equal(timeoutReport.succeeded.length, 2);
assert.equal(timeoutReport.failed.length, 1);
assert.equal(timeoutReport.failed[0]?.error, "timeout");
assert.equal(timeoutReport.hasPartialFailure, true);
assert.match(timeoutReport.summary, /완료했지만/);

console.log("test-confirm-operations: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
