import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { UiDiff } from "@/lib/event-os/causal-trace-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";

export type UIRenderInstructionType = "SHOW" | "HIDE" | "UPDATE" | "TRANSITION";

/** Deterministic UI command derived from proof.uiDiff only. */
export type UIRenderInstruction = {
  type: UIRenderInstructionType;
  target: string;
  payload: Record<string, unknown>;
};

export type ExplainabilityPanelModel = {
  proofHash: string;
  causalChain: string[];
  validationReason: string;
  commitDecisionReason: string;
  stateDiffSummary: string;
  uiDiff: UiDiff;
  headline: string;
};

export type ProofUIRenderModel = {
  proofHash: string;
  uiDiff: UiDiff;
  instructions: UIRenderInstruction[];
  explainability: ExplainabilityPanelModel;
  uiTrigger: ActionUiTriggerWire | null;
  orchestratorSummary: string | null;
};

export type RenderFromProofContext = {
  orchestrator?: OrchestratorResult | null;
};

export type ProofUIRenderHandlers = {
  setDatePickerRequest: (trigger: ActionUiTriggerWire | null) => void;
  setReviewGatePhase: (phase: "awaiting_date" | "awaiting_confirm" | null) => void;
  onProofRenderApplied?: (model: ProofUIRenderModel, proof: CausalProof) => void;
};
