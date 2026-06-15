import type { AiMessagePayload, RoomMessageType } from "@/lib/chat-room/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { PeerMessageRow } from "@/lib/peer-chat/types";

function resolveAuthor(
  row: PeerMessageRow,
  currentUserId: string | null | undefined,
): PeerMessage["author"] {
  if (row.message_type === "ai_private" || row.message_type === "ai_shared") {
    return "ai";
  }
  if (currentUserId && row.sender_user_id === currentUserId) {
    return "me";
  }
  return "peer";
}

export function mapPeerMessageRow(
  row: PeerMessageRow,
  currentUserId: string | null | undefined,
): PeerMessage {
  const messageType = (row.message_type ?? "human") as RoomMessageType;
  const aiPayload = (row.ai_payload as AiMessagePayload | null) ?? null;

  return {
    id: row.id,
    peerThreadId: row.thread_id,
    author: resolveAuthor(row, currentUserId),
    body: row.body,
    sentAt: row.created_at,
    messageType,
    aiPayload,
    imageUrl: (row as { image_url?: string | null }).image_url ?? null,
    visibleToMeOnly:
      messageType === "ai_private" &&
      Boolean(currentUserId && row.sender_user_id === currentUserId),
  };
}

export function sortPeerMessages(messages: PeerMessage[]): PeerMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

export function mergePeerMessages(
  current: PeerMessage[],
  incoming: PeerMessage,
): PeerMessage[] {
  if (current.some((m) => m.id === incoming.id)) {
    return current;
  }
  return sortPeerMessages([...current, incoming]);
}

export function mergePeerMessagesBatch(
  current: PeerMessage[],
  incoming: PeerMessage[],
): PeerMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return sortPeerMessages([...byId.values()]);
}
