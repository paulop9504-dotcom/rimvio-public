export type {
  CandidateAction,
  CandidateActionKind,
  ComposeDecisionInput,
  ComposeDecisionResult,
  DecisionSurface,
  DeosCardState,
  DeosStateContext,
  ForkChipSpec,
  ProbabilityFieldOutput,
  RankedCandidate,
  StateTransitionRequest,
  StateValidationResult,
  UserIntent,
} from "@/lib/deos/decision/decision-contract-types";

export {
  COMPOSE_DECISION_VERSION,
  composeDecision,
} from "@/lib/deos/decision/compose-decision";

export {
  applyEnvelopeGateToCompose,
  envelopeBlockedSurface,
  vetoActionForEnvelope,
} from "@/lib/deos/decision/compose-envelope-gate";

export {
  rankCandidates,
  candidateById,
  topRanked,
  filterProbabilityToCandidates,
} from "@/lib/deos/decision/rank-candidates";

export {
  validateStateTransition,
  validateSurfaceTransition,
} from "@/lib/deos/decision/validate-state-transition";

export {
  projectSurfaceToDecisionCard,
  resolvePayloadFromActionId,
} from "@/lib/deos/decision/project-surface-to-threadline";

export { ocrReviewCandidatesFromTrigger } from "@/lib/deos/decision/ocr-plugin-candidates";

export {
  composeThreadlineFromOcr,
  composeThreadlineFromProof,
} from "@/lib/deos/decision/compose-threadline-card";

export {
  candidatesFromProof,
  deosStateFromProof,
  titleFromProofContext,
} from "@/lib/deos/decision/candidates-from-proof";

export type {
  RiskEnvelope,
  EnvelopeUsageSnapshot,
  OrderPayload,
  RiskEnvelopeVetoResult,
} from "@/lib/deos/risk/risk-envelope-types";

export {
  RISK_ENVELOPE_VERSION,
  filterCandidatesByEnvelope,
  validateActionAgainstEnvelope,
  validateEnqueueAgainstEnvelope,
  createStubRiskEnvelope,
  createStubEnvelopeUsage,
} from "@/lib/deos/risk";
