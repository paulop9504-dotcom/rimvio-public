import type { RimvioLayerId } from "@/lib/experience-graph/rimvio-layer-stack";

export type SharedGlobeMemberRole = "owner" | "member";

export type SharedGlobeMember = {
  userId?: string;
  displayName: string;
  role: SharedGlobeMemberRole;
  invitedAt?: string;
  joinedAt?: string;
};

export type SharedGlobePinAuthor = {
  userId: string;
  displayName: string;
};

/** Collaborative globe pin — FACT lineage. */
export type SharedGlobeFoundationPin = {
  id: string;
  author: SharedGlobePinAuthor;
  lat: number;
  lng: number;
  /** feedCapture id · mediaContextId · pin payload id */
  captureRef: string | null;
  timestamp: string;
  placeLabel: string;
  messageId?: string;
  imageUrl?: string | null;
};

export type SharedGlobe = {
  id: string;
  experienceRoomId: string;
  threadId: string;
  title: string;
  members: readonly SharedGlobeMember[];
  pins: readonly SharedGlobeFoundationPin[];
  experiences: readonly string[];
  createdAt: string;
  layerId: RimvioLayerId;
  isEmpty: boolean;
};

export type SharedGlobeLayer = {
  layerId: "shared_graph";
  globeId: string;
  experienceRoomId: string;
  title: string;
  memberCount: number;
  pinCount: number;
  isEmpty: boolean;
  recallLine: string;
};

export const SHARED_GLOBE_MIN_MEMBERS = 3;
export const SHARED_GLOBE_MIN_JOINT_VERIFIERS = 2;

export const SHARED_GLOBE_META_KEYS = {
  globeId: "sharedGlobeId",
  threadId: "sharedGlobeThreadId",
  createdAt: "sharedGlobeCreatedAt",
} as const;
