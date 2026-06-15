import type { GlobePinPeer } from "@/lib/globe/globe-pin-peer-types";

/** Classified map pin for Feed recall globe — FACT lineage only. */
export type ExperienceGlobePingKind = "photo" | "video" | "gps" | "dwell" | "place";

export type GlobePinSlotMeta = {
  experienceTitle: string;
  photoCount: number;
  videoCount: number;
  locked?: boolean;
};

export type ClassifiedGlobePin = {
  id: string;
  kind: ExperienceGlobePingKind;
  label: string;
  lat: number;
  lng: number;
  pinX: number;
  pinY: number;
  capturedAtIso?: string | null;
  sourceEventId?: string | null;
  /** Axis sibling pins render softer on globe */
  emphasis?: "primary" | "related";
  /** Shared ROOM globe — pin author */
  authorUserId?: string | null;
  authorDisplayName?: string | null;
  peerThreadId?: string | null;
  /** 2.5D experience stack on globe */
  pinShape?: "dot" | "slot" | "viewer" | "cluster";
  slot?: GlobePinSlotMeta;
  /** Overseas trip leg — departure airport vs destination stay. */
  tripLeg?: "departure" | "destination";
  /** Who shared this experience — avatar chips on globe pin card. */
  peers?: readonly GlobePinPeer[];
  /** Bridge invitees — top-right chip on pin card after share. */
  sharedWith?: readonly GlobePinPeer[];
};
