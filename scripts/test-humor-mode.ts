#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildToneInstructionLine,
  detectTone,
  parseWittyConversationJson,
} from "../lib/action-chat/mode-switching";
import { tryWittyConversation } from "../lib/action-chat/witty-response-generator";
import { buildLayeredMasterOrchestratorSystemPrompt } from "../lib/action-chat/layered-system-prompt";
import { defaultMasterOrchestratorContext } from "../lib/action-chat/master-orchestrator-context";
import { resolveIntentRoute } from "../lib/action-chat/intent-router";
import { parseMasterOrchestratorJson } from "../lib/action-chat/wire-to-actions";
import { buildConversationalSystemPromptBlock } from "../lib/action-chat/conversational-system-prompt";

assert.equal(detectTone("너 몇 살이야?"), "WITTY");
assert.equal(detectTone("둔산동 갤러리아 내일 5시"), "DEFAULT");
assert.match(buildToneInstructionLine("WITTY"), /유머/);

const personalityBlock = buildConversationalSystemPromptBlock();
assert.match(personalityBlock, /RIMVIO PERSONALITY GUIDELINES/);
assert.match(personalityBlock, /지능형 친구/);
assert.match(personalityBlock, /지식을 먹고 자란다/);

const wittyJsonBlock = buildConversationalSystemPromptBlock({ tone: "WITTY", wittyJson: true });
assert.match(wittyJsonBlock, /WITTY JSON OUTPUT/);
assert.match(wittyJsonBlock, /witty_buttons/);

const wittyPrompt = buildLayeredMasterOrchestratorSystemPrompt({
  context: defaultMasterOrchestratorContext({ currentDate: "2026-05-29" }),
  route: resolveIntentRoute({ message: "몇 살이야?", history: [] }),
  message: "몇 살이야?",
  mode: "conversation",
});
assert.match(wittyPrompt, /Response Tone: WITTY/);
assert.match(wittyPrompt, /유머러스하고 위트 있게/);

const ageResult = tryWittyConversation("너 몇 살이야?");
assert.ok(ageResult);
assert.equal(ageResult!.confirmation?.meta.intent, "WITTY");
assert.match(ageResult!.confirmation?.persona_message ?? "", /나이|지식/);
assert.equal(ageResult!.confirmation?.witty_buttons?.length, 2);
assert.ok(ageResult!.confirmation?.witty_buttons?.some((b) => b.action === "feed_knowledge"));

const parsedWitty = parseWittyConversationJson(
  JSON.stringify({
    thought: "장난 맥락",
    persona_message: "저요? 숫자에 약해서...",
    witty_buttons: [
      { label: "나이 대신 지식 먹이기", action: "feed_knowledge" },
      { label: "우와, 계속 자라는구나!", action: "compliment" },
    ],
  })
);
assert.ok(parsedWitty);
assert.equal(parsedWitty!.witty_buttons.length, 2);

const parsedConfirmWitty = parseMasterOrchestratorJson(
  JSON.stringify({
    thought: "Found: 장소. Intent: 확인. Missing: 지점.",
    summary: "장소 확인",
    meta: { intent: "CONFIRM" },
    persona_message: "갤러리아 말씀이시죠? 좋습니다.",
    confirm_message: "아래 정보로 진행할까요?",
    witty_buttons: [
      { label: "맞아, 거기!", action: "accept_confirm" },
      { label: "다른 지점이야", action: "reject_place" },
    ],
    extracted_data: {
      address: null,
      phone: null,
      datetime: null,
      place_name: "갤러리아",
      url: null,
    },
    actions: [],
  })
);
assert.ok(parsedConfirmWitty);
assert.equal(parsedConfirmWitty!.confirmation?.witty_buttons?.length, 2);
assert.equal(parsedConfirmWitty!.confirmation?.meta.intent, "CONFIRM");

console.log("test-humor-mode: ok");
