import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureKind } from "@/lib/feed/feed-capture-types";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";

export type ExperienceBridgeParticipantStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "left"
  | "removed";

export type ExperienceBridgeParticipant = {
  userId: string;
  displayName: string;
  status: ExperienceBridgeParticipantStatus;
  role: "host" | "member";
  invitedAtIso: string;
  joinedAtIso?: string | null;
  leftAtIso?: string | null;
};

export type ExperienceBridgeSnapshot = {
  eventId: string;
  hostUserId: string;
  peerThreadId: string | null;
  title: string;
  placeLabel: string;
  lat: number;
  lng: number;
  /** Minimal host event for participant recall projection. */
  eventSnapshot: EventCandidate;
  createdAtIso: string;
};

export type ExperienceBridgeState = {
  bridge: ExperienceBridgeSnapshot;
  participants: readonly ExperienceBridgeParticipant[];
};

export type ExperienceBridgeTimelineItem = {
  id: string;
  kind: FeedCaptureKind | "shared_pin_photo" | "shared_pin_video";
  capturedAtIso: string;
  ownerUserId: string;
  authorDisplayName: string;
  placeLabel?: string;
  imageUrl?: string | null;
  /** View-only for non-owner media in shared bridge UI. */
  viewOnly: boolean;
};

export type ExperienceBridgeContribution = {
  contributorUserId: string;
  capture: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  };
  createdAtIso: string;
};
