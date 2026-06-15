/** MVP: link list + invite URL only — no live SSE/presence/comments UI. */
export function isRoomMvpMode() {
  return process.env.NEXT_PUBLIC_ROOM_MVP !== "0";
}
