/** Deterministic ExperienceRoom id from primary event SSOT. */
export function resolveExperienceRoomId(primaryEventId: string): string {
  const id = primaryEventId.trim();
  if (!id) {
    throw new Error("experience_room:event_id_required");
  }
  return `er:${id}`;
}

export function readExperienceRoomIdFromMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const raw = metadata?.experienceRoomId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
