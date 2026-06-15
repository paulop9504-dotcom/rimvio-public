import { PEER_MESSAGE_IMAGE_PLACEHOLDER } from "@/lib/peer-chat/peer-chat-image-constants";
import type { PeerMessageRow } from "@/lib/peer-chat/types";

/** Legacy DBs may lack image_url — list without it for PostgREST compatibility. */
export const PEER_MESSAGE_LIST_COLUMNS =
  "id, thread_id, sender_user_id, body, message_type, ai_payload, created_at";

export function isMissingPeerMessageImageColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("image_url") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("column"))
  );
}

export function buildPeerMessageInsertRow(input: {
  id?: string;
  threadId: string;
  senderUserId: string;
  body: string;
  imageUrl?: string | null;
  messageType?: PeerMessageRow["message_type"];
  aiPayload?: PeerMessageRow["ai_payload"];
}): Record<string, unknown> {
  const trimmed = input.body.trim();
  const imageUrl = input.imageUrl?.trim() || null;
  const body = trimmed || (imageUrl ? PEER_MESSAGE_IMAGE_PLACEHOLDER : "");

  const row: Record<string, unknown> = {
    thread_id: input.threadId,
    sender_user_id: input.senderUserId,
    body,
    message_type: input.messageType ?? "human",
    ai_payload: input.aiPayload ?? null,
  };

  if (input.id) {
    row.id = input.id;
  }
  if (imageUrl) {
    row.image_url = imageUrl;
  }

  return row;
}
