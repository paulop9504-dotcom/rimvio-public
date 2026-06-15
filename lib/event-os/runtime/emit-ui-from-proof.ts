import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { UiEmitFromProof } from "@/lib/event-os/runtime/event-os-runtime-types";

/**
 * Proof-only UI surface — components must not read SSOT; only this emit payload.
 */
export function emitUiFromProof(
  proof: CausalProof,
  orchestrator: OrchestratorResult | null
): UiEmitFromProof {
  return {
    proofHash: proof.proofHash,
    uiDiff: proof.uiDiff,
    commitDecision: proof.commitDecision,
    orchestrator,
    uiTrigger: orchestrator?.uiTrigger,
    summary: orchestrator?.summary,
  };
}
