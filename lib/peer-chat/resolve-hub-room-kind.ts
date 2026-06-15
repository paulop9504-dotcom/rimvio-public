import type { RoomKind } from "@/lib/chat-room/types";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { isDmThreadId } from "@/lib/peer-chat/dm-thread";

export function resolveHubRoomKind(peerThreadId: string): RoomKind {
  if (isGroupThreadId(peerThreadId)) {
    return "group";
  }
  if (isDmThreadId(peerThreadId)) {
    return "dm";
  }
  return "dm";
}
