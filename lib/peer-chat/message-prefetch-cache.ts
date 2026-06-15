import type { PeerMessage } from "@/lib/context/peer-message-types";
import { fetchPeerMessages } from "@/lib/peer-chat/peer-chat-client";

const TTL_MS = 30_000;

type Entry = {
  messages: PeerMessage[];
  at: number;
};

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<PeerMessage[]>>();

/** 친구 목록에서 방 들어가기 전 미리 불러오기 */
export function prefetchPeerMessages(threadId: string): void {
  if (typeof window === "undefined" || cache.has(threadId) || inflight.has(threadId)) {
    return;
  }
  const promise = fetchPeerMessages(threadId)
    .then((payload) => {
      cache.set(threadId, { messages: payload.messages, at: Date.now() });
      return payload.messages;
    })
    .catch(() => [] as PeerMessage[])
    .finally(() => {
      inflight.delete(threadId);
    });
  inflight.set(threadId, promise);
}

export function peekPrefetchedMessages(threadId: string): PeerMessage[] | null {
  const entry = cache.get(threadId);
  if (!entry || Date.now() - entry.at > TTL_MS) {
    return null;
  }
  return entry.messages;
}

export function takePrefetchedMessages(threadId: string): PeerMessage[] | null {
  const fresh = peekPrefetchedMessages(threadId);
  if (fresh) {
    cache.delete(threadId);
    return fresh;
  }
  return null;
}
