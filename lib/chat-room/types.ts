/** Rimvio Chat — room layers (human vs AI). */

export const ROOM_MESSAGE_TYPES = [
  "human",
  "ai_private",
  "ai_shared",
  "system",
] as const;

export type RoomMessageType = (typeof ROOM_MESSAGE_TYPES)[number];

export const ROOM_KINDS = ["dm", "group"] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export const AI_MODES = ["private", "shared"] as const;
export type AiMode = (typeof AI_MODES)[number];

export type AiMessagePayload = {
  summary: string;
  actions?: Array<{ id: string; label: string; href?: string }>;
  prompt?: string;
};

export function aiModeForRoomKind(kind: RoomKind): AiMode {
  return kind === "group" ? "shared" : "private";
}

export function aiMessageTypeForMode(mode: AiMode): "ai_private" | "ai_shared" {
  return mode === "shared" ? "ai_shared" : "ai_private";
}

/** DM: only caller sees AI. Group: everyone sees shared AI. */
export function canViewerSeeMessage(input: {
  messageType: RoomMessageType;
  senderUserId: string;
  viewerUserId: string;
}): boolean {
  if (input.messageType === "human" || input.messageType === "system") {
    return true;
  }
  if (input.messageType === "ai_shared") {
    return true;
  }
  if (input.messageType === "ai_private") {
    return input.senderUserId === input.viewerUserId;
  }
  return false;
}
