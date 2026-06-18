import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";

export type ReviewExecutionType =
  | "approve"
  | "date"
  | "confirm"
  | "search"
  | "action"
  | "command";

export type CommandOsExecutionPayload = {
  eventCandidateId: string;
  intent: string;
  rawInput: string;
  normalizedQuery: string;
  command: string;
  extractedContext: {
    time: string | null;
    subject: string | null;
    date: string | null;
  };
  clockIso?: string;
};

export type ReviewApprovePayload = {
  message?: string;
  clockIso?: string;
};

export type ReviewDatePayload = {
  patches: Array<{ candidateId: string; date: string }>;
  clockIso?: string;
};

export type ReviewConfirmPayload = {
  message?: string;
  syncClient?: boolean;
  clockIso?: string;
};

export type ReviewExecutionPayload =
  | ReviewApprovePayload
  | ReviewDatePayload
  | ReviewConfirmPayload
  | CommandOsExecutionPayload;

/** Replayable ingress record — UI may only push this shape. */
export type ReviewExecutionInput = {
  scopeId: string;
  type: ReviewExecutionType;
  payload: ReviewExecutionPayload;
  enqueuedAt?: string;
};

export type ReviewExecutionStepResult = {
  input: ReviewExecutionInput;
  proof: CausalProof;
  orchestrator: OrchestratorResult | null;
  ok: boolean;
  error?: string;
};

export type ReviewExecutionProcessResult = {
  processed: ReviewExecutionStepResult[];
  remaining: ReviewExecutionInput[];
};
