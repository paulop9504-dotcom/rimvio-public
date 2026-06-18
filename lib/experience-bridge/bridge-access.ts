import type { ExperienceBridgeParticipant } from "@/lib/experience-bridge/experience-bridge-types";

export function isActiveBridgeParticipant(
  row: ExperienceBridgeParticipant,
): boolean {
  return row.status === "accepted" || row.role === "host";
}

export function canReadBridgeExperience(input: {
  viewerUserId: string;
  participants: readonly ExperienceBridgeParticipant[];
}): boolean {
  const viewer = input.participants.find((row) => row.userId === input.viewerUserId);
  if (!viewer) {
    return false;
  }
  return viewer.role === "host" || viewer.status === "accepted";
}

export function canEditBridgeMedia(input: {
  viewerUserId: string;
  ownerUserId: string;
}): boolean {
  return input.viewerUserId.trim() === input.ownerUserId.trim();
}

export function canExportBridgeMedia(input: {
  viewerUserId: string;
  ownerUserId: string;
}): boolean {
  return canEditBridgeMedia(input);
}

export function countActiveBridgeParticipants(
  participants: readonly ExperienceBridgeParticipant[],
): number {
  return participants.filter(isActiveBridgeParticipant).length;
}
