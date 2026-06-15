import assert from "node:assert/strict";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  findOpenFeedPeerTalkThread,
  resolveFeedPeerTalkSessionFromMessages,
} from "@/lib/action-chat/feed-peer-talk/restore-feed-peer-talk-session";
import { isFeedPeerTalkSendActive } from "@/lib/action-chat/feed-peer-talk/is-feed-peer-talk-send-active";
import {
  clearFeedPeerTalkSession,
  getFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";

clearFeedPeerTalkSession();

const openThreadMessage: ActionChatMessage = {
  id: "thread-1",
  role: "assistant",
  text: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  feedPeerTalkThread: {
    peerThreadId: "peer-abc",
    displayName: "민수",
    messages: [],
    historyEndIndex: -1,
    promptLine: "민수에게 메시지를 보내세요",
    hydrating: false,
  },
};

const messages = [openThreadMessage];

assert.deepEqual(findOpenFeedPeerTalkThread(messages), {
  peerThreadId: "peer-abc",
  displayName: "민수",
});
assert.deepEqual(resolveFeedPeerTalkSessionFromMessages(messages), {
  peerThreadId: "peer-abc",
  displayName: "민수",
});
assert.equal(getFeedPeerTalkSession(), null);
assert.equal(isFeedPeerTalkSendActive(null, messages), true);

clearFeedPeerTalkSession();
console.log("test-feed-peer-talk-session-restore: ok");
