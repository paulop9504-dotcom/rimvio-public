export type {
  DecisionCardModel,
  DecisionCardState,
  ForkChip,
  ForkChipRole,
  ResolveChipPayload,
  ReviewDeltaRow,
  ThreadlineHeaderStatus,
} from "@/lib/threadline/threadline-types";

export {
  becauseFromProof,
  cardStateFromProof,
  proofToDecisionCard,
  resolvePayloadFromChip,
  reviewDeltasFromProof,
} from "@/lib/threadline/proof-to-decision-card";
export type { ProofProjectionInput } from "@/lib/threadline/proof-to-decision-card";

export {
  validateThreadlineKernelGuards,
  threadlineHeaderStatus,
} from "@/lib/threadline/validate-kernel-guards";

export {
  waitingCardFromOcrTrigger,
  THREADLINE_ACTIVE_OCR_CARD_ID,
} from "@/lib/threadline/seed-ocr-waiting-card";

export {
  applySendingToActiveWaiting,
  deferCard,
  moveCardToDeferred,
  restoreDeferredCard,
  resetThreadlineCards,
  upsertCardFromProof,
  upsertSeedCard,
} from "@/lib/threadline/threadline-reducer";
