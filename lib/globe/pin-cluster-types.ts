/** Experience compressed to one globe pin — Constitution V2 SSOT. */

export type PinClusterEvidence = {
  photoCount: number;
  videoCount: number;
  chatCount: number;
  placePinCount: number;
};

export type PinClusterVariant = "experience" | "bridge_ghost";

export type PinCluster = {
  pinId: string;
  eventId: string;
  title: string;
  placeLabel: string;
  lat: number;
  lng: number;
  dateLabel: string | null;
  startedAtIso: string | null;
  evidence: PinClusterEvidence;
  /** One-line recall inside pin open — never a standalone tab. */
  recallLine: string | null;
  /** Pending Experience Bridge invite — tap to accept onto personal globe. */
  variant?: PinClusterVariant;
  bridgeHostName?: string | null;
};
