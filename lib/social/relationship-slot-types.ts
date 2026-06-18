/** Feed-facing DM slot (Room = peer thread; Slot = feed row). */
export type RelationshipFeedSlot = {
  slotId: string;
  roomId: string;
  friendId: string;
  displayName: string;
  rimvioId: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastActivityAt: string;
  unreadCount: number;
  isPinned: boolean;
};
