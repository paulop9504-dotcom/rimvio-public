/**
 * DEOS Decision Contract — single authority types.
 * @see docs/DEOS_DECISION_CONTRACT.md
 */

/** DEOS + Threadline aligned lifecycle states. */
export type DeosCardState = "WAITING" | "WORKING" | "DONE" | "DEFERRED";

/** Parsed user intent — structure only, no action selection. */
export type UserIntent = {
  raw: string;
  kind:
    | "add"
    | "resolve"
    | "approve_speech"
    | "date_patch"
    | "confirm"
    | "command"
    | "unknown";
  scopeId: string;
  clockIso: string;
};

/** Plugin-proposed action — input material, NOT a decision. */
export type CandidateAction = {
  id: string;
  pluginId: string;
  source: "internal" | "external";
  label: string;
  kind: CandidateActionKind;
  /** Machine payload for execution router — never shown in UX. */
  payload: Record<string, unknown>;
  /** Optional human hint for Because templates (engine may rewrite). */
  becauseHint?: string;
  preconditions?: string[];
};

export type CandidateActionKind =
  | "ocr_approve"
  | "ocr_date"
  | "ocr_confirm"
  | "ocr_open_date_picker"
  | "calendar_commit"
  | "search"
  | "command_compile"
  | "defer"
  | "noop"
  // Trading / quant (stub — Risk Envelope + router P6+)
  | "order_place_limit"
  | "order_place_market"
  | "order_replace"
  | "order_cancel"
  | "order_cancel_all"
  | "position_flatten"
  | "strategy_pause"
  | "strategy_resume";

/** Probability output — ordering only. */
export type RankedCandidate = {
  candidateId: string;
  rank: number;
  score: number;
  confidence: number;
};

export type ProbabilityFieldOutput = {
  ranked: RankedCandidate[];
  /** Diagnostic only — must not bypass composeDecision. */
  fieldVersion: string;
};

export type DeosStateContext = {
  scopeId: string;
  cardState: DeosCardState;
  /** Active card if any. */
  activeCardId: string | null;
  gatePhase?: "awaiting_date" | "awaiting_confirm" | null;
};

export type StateTransitionRequest = {
  from: DeosCardState;
  to: DeosCardState;
  viaActionId: string;
};

export type StateValidationResult = {
  allowed: boolean;
  reason?: string;
};

export type ForkChipSpec = {
  id: string;
  label: string;
  role: "default" | "alternative" | "escape";
  actionId: string;
};

/** UX-consumable output — ONLY egress from Decision Engine. */
export type DecisionSurface =
  | {
      mode: "auto";
      title: string;
      because: string;
      targetState: DeosCardState;
      action: CandidateAction;
      transition: StateTransitionRequest;
    }
  | {
      mode: "fork";
      title: string;
      because: string;
      targetState: "WAITING";
      chips: ForkChipSpec[];
      maxChips: 3;
    }
  | {
      mode: "blocked";
      title: string;
      because: string;
      targetState: DeosCardState;
      reason: string;
    };

export type ComposeDecisionInput = {
  intent: UserIntent;
  state: DeosStateContext;
  candidates: CandidateAction[];
  probability: ProbabilityFieldOutput;
  /** Optional title override from domain context. */
  title?: string;
  /** Mandate constraint — veto only; does not select actions. */
  envelope?: import("@/lib/deos/risk/risk-envelope-types").RiskEnvelope | null;
  envelopeUsage?: import("@/lib/deos/risk/risk-envelope-types").EnvelopeUsageSnapshot | null;
};

export type ComposeDecisionResult = {
  surface: DecisionSurface;
  /** Selected / offered action ids for audit. */
  actionIds: string[];
  composeVersion: string;
  diagnostics: string[];
};
