import assert from "node:assert/strict";
import { parseOutgoingMessage } from "../lib/chat-room/parse-ai-invoke";
import { canViewerSeeMessage } from "../lib/chat-room/types";

const ai = parseOutgoingMessage("@ai 강남역 이탈리안");
assert.equal(ai.kind, "ai_invoke");
if (ai.kind === "ai_invoke") {
  assert.equal(ai.prompt, "강남역 이탈리안");
}

assert.equal(parseOutgoingMessage("안녕").kind, "human");
assert.equal(parseOutgoingMessage("/ask 날씨").kind, "ai_invoke");

assert.equal(
  canViewerSeeMessage({
    messageType: "ai_private",
    senderUserId: "a",
    viewerUserId: "a",
  }),
  true,
);
assert.equal(
  canViewerSeeMessage({
    messageType: "ai_private",
    senderUserId: "a",
    viewerUserId: "b",
  }),
  false,
);

console.log("test-parse-ai-invoke: ok");
