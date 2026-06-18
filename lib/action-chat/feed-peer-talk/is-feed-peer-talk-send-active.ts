import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { FeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import { findOpenFeedPeerTalkThread } from "@/lib/action-chat/feed-peer-talk/restore-feed-peer-talk-session";
import {
  getFeedPeerTalkSession,
  clearFeedPeerTalkSession,
  setFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";

/** True when an open (non-closed) inline @톡 thread is on screen. */
export function isFeedPeerTalkSendActive(
  session: FeedPeerTalkSession | null,
  messages: ActionChatMessage[],
): boolean {
  const resolved = session ?? findOpenFeedPeerTalkThread(messages);
  if (!resolved?.peerThreadId) {
    return false;
  }
  return messages.some(
    (message) =>
      message.feedPeerTalkThread?.peerThreadId === resolved.peerThreadId &&
      !message.feedPeerTalkThread.closed,
  );
}

/** Drop stale in-memory session when UI no longer shows an open @톡 thread. */
export function syncFeedPeerTalkSessionWithMessages(
  messages: ActionChatMessage[],
): void {
  let session = getFeedPeerTalkSession();
  if (!session) {
    const restored = findOpenFeedPeerTalkThread(messages);
    if (restored) {
      setFeedPeerTalkSession(restored);
      session = restored;
    }
  }
  if (!session) {
    return;
  }
  if (!isFeedPeerTalkSendActive(session, messages)) {
    clearFeedPeerTalkSession();
  }
}
