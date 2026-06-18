import assert from "node:assert/strict";
import {
  isEndPeerTalkMentionInput,
  tryBuildMentionEndPeerTalkTurn,
} from "../lib/action-chat/mention-peer-talk-end/commit-mention-end-peer-talk-turn";
import {
  stripFeedPeerTalkSurfaceFromMessages,
  wipeFeedPeerTalkSurfaceIfNeeded,
} from "../lib/action-chat/feed-peer-talk/end-feed-peer-talk";
import {
  getFeedPeerTalkSession,
  setFeedPeerTalkSession,
} from "../lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import type { ActionChatMessage } from "../lib/action-chat/orchestrator-types";

assert.ok(isEndPeerTalkMentionInput("@대화끝"));

let store: ActionChatMessage[] = [
  { id: "u1", role: "user", text: "@톡 이미형", createdAt: "2026-01-01T00:00:00.000Z" },
  {
    id: "t1",
    role: "assistant",
    text: "",
    createdAt: "2026-01-01T00:00:01.000Z",
    feedPeerTalkThread: {
      peerThreadId: "peer-dm-a__b",
      displayName: "이미형",
      messages: [],
      historyEndIndex: -1,
      promptLine: "이미형님과 대화를 시작하세요",
    },
  },
];

setFeedPeerTalkSession({ peerThreadId: "peer-dm-a__b", displayName: "이미형" });

const turn = tryBuildMentionEndPeerTalkTurn(
  { text: "@대화끝" },
  {
    readMessages: () => store,
    persist: (next) => {
      store = next;
    },
  },
);

assert.ok(turn);
assert.equal(getFeedPeerTalkSession(), null);
assert.equal(store.some((m) => m.feedPeerTalkThread), false);
assert.equal(store.some((m) => m.text === "@톡 이미형"), false);
store = [...store, ...turn];
assert.ok(store.some((m) => m.text.includes("AI 피드")));

const stripped = stripFeedPeerTalkSurfaceFromMessages([
  { id: "a", role: "user", text: "점심 추천", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "b", role: "user", text: "@톡 박", createdAt: "2026-01-01T00:00:01.000Z" },
]);
assert.equal(stripped.length, 1);

setFeedPeerTalkSession({ peerThreadId: "peer-dm-a__b", displayName: "이미형" });
store = [
  {
    id: "old",
    role: "assistant",
    text: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    feedPeerTalkThread: {
      peerThreadId: "peer-dm-a__b",
      displayName: "이미형",
      messages: [],
      historyEndIndex: -1,
      promptLine: "x",
    },
  },
];

const switched = wipeFeedPeerTalkSurfaceIfNeeded(
  {
    readMessages: () => store,
    persist: (next) => {
      store = next;
    },
  },
  "peer-dm-c__d",
);

assert.equal(switched.previousDisplayName, "이미형");
assert.equal(store.length, 0);
assert.equal(getFeedPeerTalkSession(), null);

console.log("test-mention-end-peer-talk: ok");
