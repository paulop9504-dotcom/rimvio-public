import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { UiDiff } from "@/lib/event-os/causal-trace-types";
import type { EventOsStateSnapshot } from "@/lib/event-os/causal-trace-types";
import type {
  ReviewExecutionInput,
  ReviewExecutionStepResult,
} from "@/lib/event-os/review-execution-types";

/** UI receives proof-derived emit only — never raw SSOT handles. */
export type UiEmitFromProof = {
  proofHash: string;
  uiDiff: UiDiff;
  commitDecision: CausalProof["commitDecision"];
  orchestrator: OrchestratorResult | null;
  uiTrigger?: OrchestratorResult["uiTrigger"];
  summary?: string;
};

export type ExecutionGraphEntry = {
  sequence: number;
  scopeId: string;
  step: ReviewExecutionInput["type"];
  proofHash: string;
  parentProofHash?: string;
  replayAnchorIso: string;
};

export type EventOSRuntimeStepResult = ReviewExecutionStepResult & {
  uiEmit: UiEmitFromProof;
  replayAnchor: EventOsStateSnapshot;
  runtimeViolations: string[];
  lockHeld: boolean;
};

export type EventOSRuntimeProcessResult = {
  processed: EventOSRuntimeStepResult[];
  executionGraph: ExecutionGraphEntry[];
  remaining: ReviewExecutionInput[];
};
