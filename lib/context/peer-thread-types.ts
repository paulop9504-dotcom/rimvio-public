import type { RoomKind } from "@/lib/chat-room/types";

/**
 * Peer contacts (unlimited) + AI pin hub (5 slots).
 * @see docs/PEER_SOCIAL_POLICY.md
 */

export const PINNED_PEER_SLOTS = 5 as const;

export type PinnedSlotIndex = 0 | 1 | 2 | 3 | 4;

/** Per 1:1 DM room — stored client-side (cloud sync layer adds later). */
export type PeerThreadSettings = {
  peerThreadId: string;
  displayName: string;
  /** AI 렌즈 — OFF면 맥락·Rail만 중단 (저장은 5방이면 유지) */
  aiLensEnabled: boolean;
  /** 레거시/슬롯 할당 — 5방 제품에서는 슬롯에 있으면 true */
  isPinned: boolean;
  updatedAt: string;
};

/** ROOM = always on hub. `connected` = friend + pin + lens. */
export type HubRoomConnection = "vacant" | "connected" | "purge_pending";

export type HubRoomSlot = {
  slotIndex: PinnedSlotIndex;
  connection: HubRoomConnection;
  peerThreadId?: string;
  displayName?: string;
  /** dm · group — 단톡도 5슬롯 예산 공유 */
  roomKind?: RoomKind;
  pinnedAt?: string;
  /** Set when user removes pin — data purged after retention window. */
  unpinnedAt?: string;
  purgeAfter?: string;
};

/** @deprecated alias — use HubRoomSlot */
export type PinnedPeerSlot = HubRoomSlot & {
  peerThreadId: string;
  displayName: string;
  pinnedAt: string;
};

export type PinnedPeerRoster = {
  slots: HubRoomSlot[];
};

export type PeerStorageMode =
  | "none"           // unknown peer
  | "contact_basic"  // in contact book, not pinned — local chat only
  | "ephemeral"      // legacy: lens on, not pinned
  | "pinned_full";   // AI pin slot — full log + @import

export type PeerThreadPolicyInput = {
  settings: PeerThreadSettings;
  roster: PinnedPeerRoster;
};
