/** Time × space bundle — one living situation for the user. */

export type PlanWindowConfidence = "confirmed" | "estimated" | "open";

export type PlanAttachMode = "new" | "continue";

export type PlanMode = "solo" | "group";

export type PlanContext = {
  planId?: string;
  title: string;
  windowStartIso?: string;
  windowEndIso?: string | null;
  windowConfidence: PlanWindowConfidence;
  nights?: number;
  place?: string | null;
  peerDisplayName?: string | null;
  peerThreadId?: string | null;
  attachMode: PlanAttachMode;
  /** Solo = personal signals on; group = shared layer defaults peer vitality off. */
  planMode?: PlanMode;
};

export type PlanAttachScoreSignals = {
  title: boolean;
  place: boolean;
  peer: boolean;
  window: boolean;
};

export type PlanAttachResolution = {
  mode: PlanAttachMode;
  candidatePlanId?: string;
  candidateTitle?: string;
  candidateWindowEndIso?: string | null;
  headline: string;
  detail?: string;
  /** User can switch when true */
  canContinue: boolean;
  attachScore?: number;
  signals?: PlanAttachScoreSignals;
};
