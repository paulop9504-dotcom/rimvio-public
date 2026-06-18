import type { FeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";

let session: FeedPeerTalkSession | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getFeedPeerTalkSession(): FeedPeerTalkSession | null {
  return session;
}

export function setFeedPeerTalkSession(next: FeedPeerTalkSession | null): void {
  session = next;
  notify();
}

export function clearFeedPeerTalkSession(): void {
  setFeedPeerTalkSession(null);
}

export function subscribeFeedPeerTalkSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
