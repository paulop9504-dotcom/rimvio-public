/** P2 — read-only spatial trace from another user (experience + external). */

export type ExternalGlobeTrace = {
  traceId: string;
  eventId: string;
  title: string;
  placeLabel: string;
  lat: number;
  lng: number;
  authorUserId: string;
  authorDisplayName: string | null;
  photoCount: number;
  videoCount: number;
  startedAtIso: string | null;
  /** One-line caption — never a feed. */
  recallLine: string | null;
  pioneerCell: string | null;
};

export type ExternalGlobeTraceQuery = {
  lat: number;
  lng: number;
  radiusM?: number;
};
