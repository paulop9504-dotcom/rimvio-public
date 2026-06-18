import type { CausalProof } from "@/lib/event-os/causal-proof-types";

/** Behavioral Kernel v1 — exhaustive card states. */
export type DecisionCardState = "WAITING" | "WORKING" | "DONE" | "DEFERRED";

export type ForkChipRole = "default" | "alternative" | "escape";

export type ForkChip = {
  id: string;
  label: string;
  role: ForkChipRole;
};

export type ReviewDeltaRow = {
  label: string;
  value: string;
};

export type DecisionCardModel = {
  id: string;
  state: DecisionCardState;
  title: string;
  because: string;
  chips?: ForkChip[];
  settledLine?: string;
  /** Internal only — never rendered. */
  proof?: CausalProof;
  reviewDeltas?: ReviewDeltaRow[];
  updatedAt: string;
};

export type ThreadlineHeaderStatus = "needs_one_tap" | "all_set";

export type ResolveChipPayload =
  | { kind: "ocr_date"; patches: Array<{ candidateId: string; date: string }> }
  | { kind: "ocr_confirm"; message: string }
  | { kind: "ocr_approve"; message: string }
  | { kind: "open_date_picker" }
  | { kind: "defer" };
