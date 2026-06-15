import assert from "node:assert/strict";
import {
  buildFeedPeerTalkPromptLine,
  replaceLastPeerTalkChipWithThread,
  sliceFeedPeerTalkHistory,
  appendFeedPeerTalkMessage,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-message-state";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { PeerMessage } from "@/lib/context/peer-message-types";

function peerMsg(id: string, body: string): PeerMessage {
  return {
    id,
    peerThreadId: "t1",
    author: "peer",
    body,
    sentAt: `2026-01-01T00:00:${id.padStart(2, "0")}.000Z`,
    messageType: "human",
  };
}

const chipMessage: ActionChatMessage = {
  id: "chip-1",
  role: "assistant",
  text: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  inlineChatAction: {
    featureId: "peer_talk",
    displayName: "톡",
    icon: "💬",
    query: "monica",
    summaryLines: [],
    mainLabel: "대화",
    auxActions: [],
    peerTalkQuery: "monica",
  },
};

const history = Array.from({ length: 25 }, (_, i) => peerMsg(String(i), `m${i}`));
const sliced = sliceFeedPeerTalkHistory(history);
assert.equal(sliced.length, 20);
assert.equal(sliced[0]!.body, "m5");

const { messages, threadMessageId } = replaceLastPeerTalkChipWithThread(
  [chipMessage],
  {
    peerThreadId: "t1",
    displayName: "monica",
    messages: sliced,
    historyEndIndex: sliced.length - 1,
    promptLine: buildFeedPeerTalkPromptLine("monica"),
  },
);

assert.equal(messages.length, 1);
assert.equal(messages[0]!.inlineChatAction, undefined);
assert.ok(messages[0]!.feedPeerTalkThread);
assert.equal(messages[0]!.id, threadMessageId);
assert.equal(
  messages[0]!.feedPeerTalkThread!.promptLine,
  "monica님과 대화를 시작하세요",
);

const sent = peerMsg("new", "hello");
const appended = appendFeedPeerTalkMessage(messages, "t1", sent);
assert.equal(appended[0]!.feedPeerTalkThread!.messages.length, 21);

console.log("test-feed-peer-talk-state: ok");
