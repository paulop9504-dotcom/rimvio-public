export function resolveSharedGlobeId(experienceRoomId: string): string {
  const roomId = experienceRoomId.trim();
  if (!roomId) {
    throw new Error("shared_globe:experience_room_id_required");
  }
  return roomId.startsWith("sg:") ? roomId : `sg:${roomId}`;
}

export function readSharedGlobeIdFromMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const raw = metadata?.sharedGlobeId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
