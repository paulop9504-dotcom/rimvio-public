import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";
import type { FeedCaptureKind } from "@/lib/feed/feed-capture-types";

export type ExperienceRoomParticipant = {
  displayName: string;
  userId?: string;
  role?: "host" | "guest" | "organizer";
  peerThreadId?: string;
};

export type ExperienceRoomCaptureRef = {
  id: string;
  kind: FeedCaptureKind;
  eventId: string;
  capturedAtIso: string;
  verified?: boolean;
  authorDisplayName?: string;
};

export type ExperienceRoom = {
  id: string;
  intent: ExperienceIntent;
  title: string;
  participants: readonly ExperienceRoomParticipant[];
  threadIds: readonly string[];
  eventIds: readonly string[];
  captures: readonly ExperienceRoomCaptureRef[];
  pinIds: readonly string[];
  createdAt: string;
  windowStartIso?: string;
  windowEndIso?: string | null;
};

export const EXPERIENCE_ROOM_META_KEYS = {
  roomId: "experienceRoomId",
  sharedGlobeId: "sharedGlobeId",
} as const;
