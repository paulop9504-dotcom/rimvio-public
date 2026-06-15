import type { AiMessagePayload, AiMode, RoomKind } from "@/lib/chat-room/types";
import type { RoomMessageType } from "@/lib/chat-room/types";

export type PeerMessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  message_type: RoomMessageType;
  ai_payload: AiMessagePayload | null;
  image_url: string | null;
  created_at: string;
};
export type PeerThreadRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  invite_code: string;
  room_kind?: RoomKind;
  ai_mode?: AiMode;
  created_at: string;
};

export type ListedPeerThread = {
  threadId: string;
  displayName: string;
  roomKind: RoomKind;
  /** DM only — the other participant. */
  otherUserId: string | null;
};

export type PeerThreadEnsureResult = {
  threadId: string;
  inviteCode: string;
  displayName: string;
};
