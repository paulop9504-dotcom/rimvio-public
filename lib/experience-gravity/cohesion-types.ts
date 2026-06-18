import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export type CohesionWindowInput = {
  contexts: readonly MediaSpacetimeContext[];
  windowStartIso: string;
  windowEndIso: string;
};

export type CohesionScoreBreakdown = {
  mediaScore: number;
  threadScore: number;
  placeScore: number;
  timeScore: number;
  total: number;
};

export type ExperienceBurstCandidate = {
  burstId: string;
  title: string;
  placeLabel: string;
  windowStartIso: string;
  windowEndIso: string;
  photoCount: number;
  videoCount: number;
  uniqueThreadCount: number;
  contextIds: readonly string[];
  peerThreadIds: readonly string[];
  targetEventId: string | null;
  score: number;
  recallLine: string;
};
