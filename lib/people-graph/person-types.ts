import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";
import type { MeaningEdgeKind } from "@/lib/meaning/meaning-types";

export type PersonExperienceRef = {
  eventId: string;
  title: string;
  intent: ExperienceIntent;
  atIso: string | null;
};

export type PersonPlaceRef = {
  label: string;
  eventCount: number;
  lastAtIso: string | null;
};

export type PersonMeaningRef = {
  edgeId: string;
  kind: MeaningEdgeKind;
  meaningLabel: string;
  score: number;
};

export type PersonSharedGlobeRef = {
  globeId: string;
  experienceRoomId: string;
  title: string;
  pinCount: number;
  role?: string;
};

export type RelationshipScore = {
  /** Composite 0–100. */
  total: number;
  coExperienceCount: number;
  sharedThreadCount: number;
  /** 0–100 recency component. */
  recency: number;
  verifyCount: number;
  hasDirectThread: boolean;
};

export type PersonNode = {
  id: string;
  displayName: string;
  peerThreadId?: string;
  rimvioId?: string | null;
  source: "peer_contact" | "discovered";
  experiences: readonly PersonExperienceRef[];
  places: readonly PersonPlaceRef[];
  meanings: readonly PersonMeaningRef[];
  sharedGlobes: readonly PersonSharedGlobeRef[];
  relationshipScore: RelationshipScore;
  /** Aggregate from linked meaning edges 0–100. */
  meaningScore: number;
};

export type PeopleGraph = {
  people: readonly PersonNode[];
  builtAt: string;
  contactCount: number;
  discoveredCount: number;
};
