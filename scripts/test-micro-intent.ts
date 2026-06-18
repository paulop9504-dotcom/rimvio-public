#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  classifyMicroIntent,
  scoreMicroIntent,
} from "../lib/action-chat/micro-intent";
import { buildConversationEventState } from "../lib/action-chat/conversation-event-state";
import { deriveOrchestratorMode } from "../lib/action-chat/mode-switching";
import { formatWeightedHistoryBlock } from "../lib/action-chat/weighted-history";
import { eventStateToIntentRoute } from "../lib/action-chat/conversation-event-state";

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보 정리해 드릴게요. 예약할까요?" },
];

const thanks = classifyMicroIntent({ message: "고마워", history: diningHistory });
assert.equal(thanks.micro_intent, "CLOSE");
assert.ok(thanks.turn_pressure < 0.15);

const thanksContinue = classifyMicroIntent({
  message: "고마워 근데 하나만 더",
  history: diningHistory,
});
assert.equal(thanksContinue.micro_intent, "CONTINUE");

const ackLaugh = classifyMicroIntent({ message: "응 ㅋㅋ", history: diningHistory });
assert.equal(ackLaugh.micro_intent, "PASSIVE_STATE");
assert.ok(ackLaugh.turn_pressure < 0.2);

const passiveKk = classifyMicroIntent({ message: "ㅋㅋ", history: diningHistory });
assert.equal(passiveKk.micro_intent, "PASSIVE_STATE");

const continueAfterQuestion = classifyMicroIntent({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
});
assert.equal(continueAfterQuestion.micro_intent, "ACK");

const plainAck = classifyMicroIntent({
  message: "알겠어",
  history: diningHistory,
});
assert.equal(plainAck.micro_intent, "CLOSE");

const priceFollowUp = classifyMicroIntent({
  message: "가격은 얼마야?",
  history: diningHistory,
});
assert.equal(priceFollowUp.micro_intent, "DIRECT_QUERY");

const shortPrice = classifyMicroIntent({
  message: "이거 가격?",
  history: diningHistory,
});
assert.equal(shortPrice.micro_intent, "DIRECT_QUERY");

const nextQuestion = classifyMicroIntent({
  message: "그럼 다음은?",
  history: diningHistory,
});
assert.equal(nextQuestion.micro_intent, "CONTINUE");

const eventState = buildConversationEventState({
  message: "고마워",
  history: diningHistory,
  linkTitle: "쿠우쿠우",
});
assert.equal(eventState.micro_intent, "CLOSE");
assert.equal(eventState.mode, "conversation");
assert.ok(eventState.turn_pressure < 0.15);

const ackState = buildConversationEventState({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
  linkTitle: "쿠우쿠우",
});
assert.equal(ackState.micro_intent, "ACK");
assert.equal(ackState.intent_type, "CONTINUE");
assert.equal(ackState.continuity, "HOLD");
assert.ok(ackState.turn_pressure < 0.25);

const directState = buildConversationEventState({
  message: "가격은 얼마야?",
  history: diningHistory,
  linkTitle: "쿠우쿠우",
});
assert.equal(directState.micro_intent, "DIRECT_QUERY");
assert.equal(directState.intent_type, "NEW_TASK");
assert.equal(deriveOrchestratorMode("가격은 얼마야?", directState).mode, "action");

const route = eventStateToIntentRoute(ackState);
const mode = deriveOrchestratorMode("응", route);
assert.equal(mode.mode, "conversation");
assert.match(mode.reason, /conversation|ACK|kernel/);

assert.ok(scoreMicroIntent(thanks) >= 0.9);

const weighted = formatWeightedHistoryBlock([
  { role: "user", content: "old" },
  { role: "assistant", content: "mid" },
  { role: "user", content: "new" },
]);
assert.match(weighted, /primary.*new/);
assert.match(weighted, /hint.*old/);

console.log("test-micro-intent: ok");
