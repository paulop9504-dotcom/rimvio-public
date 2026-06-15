import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { FeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import {
  getFeedPeerTalkSession,
  setFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";

/** Open inline @톡 thread on screen (not closed). */
export function findOpenFeedPeerTalkThread(
  messages: readonly ActionChatMessage[],
): FeedPeerTalkSession | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const wire = messages[i]?.feedPeerTalkThread;
    if (wire?.peerThreadId && !wire.closed) {
      return {
        peerThreadId: wire.peerThreadId,
        displayName: wire.displayName,
      };
    }
  }
  return null;
}

/** Read-only: open @톡 thread from persisted messages (no session write). */
export function resolveFeedPeerTalkSessionFromMessages(
  messages: readonly ActionChatMessage[],
): FeedPeerTalkSession | null {
  return findOpenFeedPeerTalkThread(messages);
}

/** Restore in-memory session when UI still shows an open @톡 thread (e.g. after reload). */
export function ensureFeedPeerTalkSessionFromMessages(
  messages: readonly ActionChatMessage[],
): FeedPeerTalkSession | null {
  const existing = getFeedPeerTalkSession();
  if (existing?.peerThreadId) {
    return existing;
  }
  const restored = findOpenFeedPeerTalkThread(messages);
  if (restored) {
    setFeedPeerTalkSession(restored);
  }
  return restored;
}
