#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { ActionChatMessage } from "../lib/action-chat/orchestrator-types";
import {
  resetConversationMemoryForTests,
  saveConversationMemory,
  searchConversationMemories,
} from "../lib/conversation-memory/conversation-memory-store";
import { orchestrateConversationRecall } from "../lib/conversation-memory/orchestrate-conversation-recall";
import { summarizeChatSession } from "../lib/conversation-memory/summarize-session";

const messages: ActionChatMessage[] = [
  {
    id: "u1",
    role: "user",
    text: "대전역 치과 5/31 2시 예약 잡아줘",
  },
  {
    id: "a1",
    role: "assistant",
    text: "예약 확인",
    summary: "5/31 14:11 치과 예약 완료, 둔산동 위치함.",
  },
];

const draft = summarizeChatSession(messages);
assert.ok(draft);
assert.match(draft!.topic, /치과/u);
assert.match(draft!.summary, /치과|5\/31/u);

resetConversationMemoryForTests();
saveConversationMemory(draft!);

const hits = searchConversationMemories({ query: "치과", limit: 1 });
assert.equal(hits.length, 1);

const recall = orchestrateConversationRecall({
  message: "아까 치과 예약 얘기하던 거 가져와",
  memories: hits,
});
assert.ok(recall);
assert.match(recall!.summary, /치과/u);
assert.match(recall!.summary, /나누던/u);

console.log("test-conversation-memory: ok");
