import type { PeerMessage } from "@/lib/context/peer-message-types";
import {
  mergePeerMessages,
  sortPeerMessages,
} from "@/lib/peer-chat/message-mapper";

export const PENDING_PEER_MESSAGE_PREFIX = "pending-";

export function isPendingPeerMessageId(id: string): boolean {
  return id.startsWith(PENDING_PEER_MESSAGE_PREFIX);
}

export function createOptimisticPeerMessage(input: {
  peerThreadId: string;
  body: string;
  imageUrl?: string | null;
}): PeerMessage {
  const trimmed = input.body.trim();
  return {
    id: `${PENDING_PEER_MESSAGE_PREFIX}${crypto.randomUUID()}`,
    peerThreadId: input.peerThreadId,
    author: "me",
    body: trimmed,
    sentAt: new Date().toISOString(),
    messageType: "human",
    imageUrl: input.imageUrl ?? null,
  };
}

export function replaceOptimisticPeerMessage(
  messages: PeerMessage[],
  pendingId: string,
  confirmed: PeerMessage,
): PeerMessage[] {
  const index = messages.findIndex((message) => message.id === pendingId);
  if (index < 0) {
    return mergePeerMessages(messages, confirmed);
  }
  const next = [...messages];
  next[index] = confirmed;
  return sortPeerMessages(next);
}

export function removeOptimisticPeerMessage(
  messages: PeerMessage[],
  pendingId: string,
): PeerMessage[] {
  return messages.filter((message) => message.id !== pendingId);
}

/** Realtime echo of our own send — swap pending bubble instead of duplicating. */
export function mergeRealtimePeerMessage(
  messages: PeerMessage[],
  incoming: PeerMessage,
): PeerMessage[] {
  if (incoming.author !== "me") {
    return mergePeerMessages(messages, incoming);
  }
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }
  const pendingIndex = messages.findIndex(
    (message) =>
      isPendingPeerMessageId(message.id) &&
      message.author === "me" &&
      message.body === incoming.body &&
      (message.imageUrl ?? null) === (incoming.imageUrl ?? null),
  );
  if (pendingIndex >= 0) {
    const next = [...messages];
    next[pendingIndex] = incoming;
    return sortPeerMessages(next);
  }
  return mergePeerMessages(messages, incoming);
}
