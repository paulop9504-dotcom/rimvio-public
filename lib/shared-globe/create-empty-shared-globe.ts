import type { ExperienceRoom } from "@/lib/experience-room/experience-room-types";
import { projectSharedGlobe } from "@/lib/shared-globe/project-shared-globe";
import { resolveSharedGlobeId } from "@/lib/shared-globe/shared-globe-id";
import {
  SHARED_GLOBE_META_KEYS,
  type SharedGlobe,
  type SharedGlobeMember,
} from "@/lib/shared-globe/shared-globe-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type CreateSharedGlobeResult = {
  globe: SharedGlobe;
  metadataPatch: Record<string, unknown>;
  created: boolean;
};

/** Create empty collaborative globe shell for an ExperienceRoom. */
export function createEmptySharedGlobe(input: {
  primaryEvent: EventCandidate;
  threadId: string;
  ownerDisplayName: string;
  ownerUserId?: string;
  invitedMembers?: readonly SharedGlobeMember[];
  now?: Date;
}): CreateSharedGlobeResult {
  const now = input.now ?? new Date();
  const existingId =
    typeof input.primaryEvent.metadata?.sharedGlobeId === "string"
      ? input.primaryEvent.metadata.sharedGlobeId
      : null;

  const owner: SharedGlobeMember = {
    displayName: input.ownerDisplayName.trim() || "나",
    userId: input.ownerUserId,
    role: "owner",
    joinedAt: now.toISOString(),
  };

  const globe = projectSharedGlobe({
    primaryEvent: input.primaryEvent,
    threadId: input.threadId,
    globePins: [],
    extraMembers: [owner, ...(input.invitedMembers ?? [])],
    createdAt: now.toISOString(),
  });

  const metadataPatch: Record<string, unknown> = {
    ...input.primaryEvent.metadata,
    experienceRoomId: globe.experienceRoomId,
    [SHARED_GLOBE_META_KEYS.globeId]: globe.id,
    [SHARED_GLOBE_META_KEYS.threadId]: globe.threadId,
    [SHARED_GLOBE_META_KEYS.createdAt]: globe.createdAt,
  };

  return {
    globe,
    metadataPatch,
    created: !existingId,
  };
}

export function tryAutoCreateSharedGlobe(input: {
  experienceRoom: ExperienceRoom;
  primaryEvent: EventCandidate;
  threadId: string;
  ownerDisplayName: string;
  ownerUserId?: string;
  eligible: boolean;
}): CreateSharedGlobeResult | null {
  if (!input.eligible) {
    return null;
  }
  if (input.primaryEvent.metadata?.sharedGlobeId) {
    return null;
  }
  return createEmptySharedGlobe({
    primaryEvent: input.primaryEvent,
    threadId: input.threadId,
    ownerDisplayName: input.ownerDisplayName,
    ownerUserId: input.ownerUserId,
    invitedMembers: input.experienceRoom.participants
      .filter((row) => row.displayName !== input.ownerDisplayName)
      .map((row) => ({
        displayName: row.displayName,
        role: "member" as const,
        invitedAt: new Date().toISOString(),
      })),
  });
}
