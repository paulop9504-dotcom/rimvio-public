import assert from "node:assert/strict";
import {
  isDmThreadParticipantById,
} from "../lib/peer-chat/caller-peer-thread-access";
import {
  buildDmThreadId,
  extractOtherUserIdFromDmThread,
} from "../lib/peer-chat/server-peer-chat";

function testDmThreadParticipantById() {
  const a = "5a0ca37e-902f-48ab-9c1d-111111111111";
  const b = "7b1db48f-a13g-59bc-0d2e-222222222222";
  const threadId = buildDmThreadId(a, b);

  assert.equal(isDmThreadParticipantById(threadId, a), true);
  assert.equal(isDmThreadParticipantById(threadId, b), true);
  assert.equal(isDmThreadParticipantById(threadId, "other-user"), false);
  assert.equal(extractOtherUserIdFromDmThread(threadId, a), b);
  assert.equal(extractOtherUserIdFromDmThread(threadId, b), a);
}

testDmThreadParticipantById();
console.log("test-caller-peer-thread-access: ok");
