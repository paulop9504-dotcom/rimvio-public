import assert from "node:assert/strict";
import { segmentComposerMentions } from "../lib/action-chat/composer-mention-highlight";

function kinds(text: string) {
  return segmentComposerMentions(text).map((segment) => segment.kind);
}

function texts(text: string) {
  return segmentComposerMentions(text).map((segment) => segment.text);
}

assert.deepEqual(kinds("@택시 강남역"), ["mention-valid", "plain"]);
assert.deepEqual(texts("@택시 강남역"), ["@택시", " 강남역"]);

assert.deepEqual(kinds("@unknown place"), ["plain", "plain"]);

assert.deepEqual(kinds("hello@world.com"), ["plain"]);
assert.equal(segmentComposerMentions("hello@world.com")[0]?.text, "hello@world.com");

assert.deepEqual(kinds("@타"), ["plain"]);
assert.deepEqual(kinds("@타이"), ["plain"]);
assert.deepEqual(kinds("@타이머 5분"), ["plain", "plain"]);
assert.deepEqual(kinds("@알림 5분"), ["mention-valid", "plain"]);

assert.deepEqual(kinds("go @송금 3만"), ["plain", "plain", "mention-valid", "plain"]);
assert.deepEqual(texts("go @송금 3만"), ["go", " ", "@송금", " 3만"]);

console.log("test-composer-mention-highlight: ok");
