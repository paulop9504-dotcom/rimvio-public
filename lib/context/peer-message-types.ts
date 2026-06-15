/** Unified 1:1 / room chat message (human + AI layers). */

import type { AiMessagePayload, RoomMessageType } from "@/lib/chat-room/types";

export type PeerMessageAuthor = "me" | "peer" | "ai";

export type PeerMessage = {
  id: string;
  peerThreadId: string;
  author: PeerMessageAuthor;
  body: string;
  sentAt: string;
  messageType: RoomMessageType;
  aiPayload?: AiMessagePayload | null;
  /** Public storage URL when message is a photo. */
  imageUrl?: string | null;
  /** DM ai_private: only me. Group ai_shared: everyone. */
  visibleToMeOnly?: boolean;
};

export type PeerMessageLog = {
  peerThreadId: string;
  messages: PeerMessage[];
  updatedAt: string;
};
