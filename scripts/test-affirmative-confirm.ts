import assert from "node:assert/strict";
import { buildScheduleListBatchResult } from "../lib/global-brain/orchestrate-schedule-list-batch";
import { parseScheduleListFromText } from "../lib/schedule/parse-schedule-list-batch";
import {
  findPendingConfirmation,
  historyAwaitingConfirmReply,
  isAwaitingConfirmationMessage,
} from "../lib/action-chat/resolve-affirmative-confirm";
import { classifyConfirmInterrupt } from "../lib/action-chat/confirm-interrupt";
import { isUserConfirmingActions } from "../lib/action-chat/action-confidence";
import { isExecutionApproval } from "../lib/action-chat/commit-speech";
import { classifyApprovalSpeechAct } from "../lib/event-kernel/review/classify-approval-speech-act";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";
import type { ActionChatMessage } from "../lib/action-chat/orchestrator-types";

const parsed = parseScheduleListFromText(
  `2026-05-31 (일) 일정\n07:00 기상\n08:00 출근`,
  "2026-05-31"
);
assert.ok(parsed);

const batchResult = buildScheduleListBatchResult(parsed!);
const confirmMessage: ActionChatMessage = {
  id: "a-batch",
  role: "assistant",
  text: batchResult.summary,
  createdAt: "2026-05-31T10:00:00",
  pendingConfirm: false,
  confirmation: batchResult.confirmation,
  actions: [],
};

assert.ok(isAwaitingConfirmationMessage(confirmMessage));
assert.equal(findPendingConfirmation([confirmMessage])?.id, "a-batch");
assert.equal(classifyConfirmInterrupt("응"), "continue_confirm");
assert.equal(classifyConfirmInterrupt("응 넣어"), "continue_confirm");

assert.ok(isUserConfirmingActions("응 넣어"));
assert.ok(isExecutionApproval("음… 일단 해보자"));
assert.equal(classifyApprovalSpeechAct("응 넣어"), "APPROVE");
assert.equal(classifyApprovalSpeechAct("일단 적용해봐"), "APPROVE");

assert.equal(
  historyAwaitingConfirmReply({
    userMessage: "응",
    history: [
      { role: "user", content: "5/31 일정 등록해줘" },
      {
        role: "assistant",
        content: "**5월 31일 (일)** 일정 16개를 확인했어요. 모두 등록할까요?",
      },
      { role: "user", content: "응" },
    ],
  }),
  true
);

const searchMisroute = orchestrateByRules({ message: "응" });
assert.equal(searchMisroute.actions.length, 0);
assert.match(searchMisroute.summary, /네, 맞습니다|알겠어요/);

console.log("test-affirmative-confirm: ok");
