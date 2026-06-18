import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  applyProofRenderToClient,
  type ProofUIRenderHandlers,
} from "@/lib/event-os/ui-binding";
import type { UiEmitFromProof } from "@/lib/event-os/runtime/event-os-runtime-types";

export type ReviewUiEmitHandlers = ProofUIRenderHandlers;

/**
 * Proof-only UI emit — requires full CausalProof; uiEmit is hash/orchestrator carrier only.
 */
export function applyUiEmitToClient(
  proof: CausalProof,
  uiEmit: UiEmitFromProof,
  handlers: ReviewUiEmitHandlers
): void {
  if (uiEmit.proofHash !== proof.proofHash) {
    throw new Error("ui_emit_proof_hash_mismatch");
  }
  if (uiEmit.uiDiff !== proof.uiDiff) {
    throw new Error("ui_emit_ui_diff_mismatch");
  }

  applyProofRenderToClient(proof, handlers, {
    orchestrator: uiEmit.orchestrator,
  });
}

/** Direct proof ingress when uiEmit wrapper is not needed. */
export function applyProofOnlyToClient(
  proof: CausalProof,
  handlers: ReviewUiEmitHandlers,
  orchestrator?: OrchestratorResult | null
): void {
  applyProofRenderToClient(proof, handlers, { orchestrator });
}
