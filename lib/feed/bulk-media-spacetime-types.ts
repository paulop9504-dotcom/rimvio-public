import type { SpacetimeResolveSource } from "@/lib/location-ping/types";

/** Lightweight spacetime read before bulk ingest — no blob store write. */
export type BulkMediaSpacetimePeek = {
  index: number;
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  placeLabel: string | null;
  resolveSource: SpacetimeResolveSource;
  mediaKind: "photo" | "video";
  hasGps: boolean;
};

export type BulkMediaSpacetimeCluster = {
  id: string;
  indices: number[];
  anchor: BulkMediaSpacetimePeek;
  ambiguous: boolean;
  ambiguousReasons: string[];
  /** LLM / enrichment — applied before ingest. */
  title?: string | null;
  placeLabel?: string | null;
  bypassPool?: boolean;
  llmConfidence?: "high" | "medium" | "low";
};

export type BulkMediaClusterEnrichmentItem = {
  id: string;
  title: string | null;
  placeLabel: string | null;
  mergeIntoId: string | null;
  confidence: "high" | "medium" | "low";
};

export type BulkMediaClusterEnrichmentResult = {
  clusters: BulkMediaClusterEnrichmentItem[];
  fallback?: boolean;
};

export type BulkMediaClusterWireSummary = {
  id: string;
  fileCount: number;
  startIso: string;
  endIso: string;
  placeLabel: string | null;
  hasGps: boolean;
  gpsLessCount: number;
  ambiguous: boolean;
  ambiguousReasons: string[];
};
