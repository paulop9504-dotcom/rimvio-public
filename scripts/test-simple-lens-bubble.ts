import assert from "node:assert/strict";
import {
  isSimpleLensBubbleCandidate,
  partitionLensBubbleCandidates,
} from "@/lib/peer-chat/ai-lens/is-simple-lens-bubble";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";

function cand(actionType: DeepLinkBubbleCandidate["actionType"]): DeepLinkBubbleCandidate {
  return {
    id: actionType,
    actionType,
    label: "test",
    score: 1,
    confidence: 1,
    reason: "test",
    deepLink: "",
  };
}

assert.equal(isSimpleLensBubbleCandidate(cand("navigate")), true);
assert.equal(isSimpleLensBubbleCandidate(cand("schedule")), true);
assert.equal(isSimpleLensBubbleCandidate(cand("movie_schedule")), true);

const parts = partitionLensBubbleCandidates([
  cand("navigate"),
  cand("schedule"),
  cand("open_link"),
]);
assert.equal(parts.simple.length, 3);
assert.equal(parts.rich.length, 0);

console.log("test-simple-lens-bubble: ok");
