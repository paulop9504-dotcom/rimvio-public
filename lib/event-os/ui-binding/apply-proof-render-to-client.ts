import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { applyUiInstructions } from "@/lib/event-os/ui-binding/apply-ui-instructions";
import { renderFromProof } from "@/lib/event-os/ui-binding/render-from-proof";
import type { ProofUIRenderHandlers } from "@/lib/event-os/ui-binding/ui-render-types";
import { validateProofUiBinding } from "@/lib/event-os/ui-binding/validate-proof-ui-binding";

export type ApplyProofRenderContext = {
  orchestrator?: OrchestratorResult | null;
};

/**
 * Proof-only UI ingress — UI must not update without a CausalProof.
 */
export function applyProofRenderToClient(
  proof: CausalProof,
  handlers: ProofUIRenderHandlers,
  context: ApplyProofRenderContext = {}
): ReturnType<typeof renderFromProof> {
  const render = renderFromProof(proof, { orchestrator: context.orchestrator });
  const failures = validateProofUiBinding(proof, render);
  if (failures.length > 0) {
    throw new Error(`proof_ui_binding:${failures.join(",")}`);
  }

  applyUiInstructions(
    render.instructions,
    handlers,
    render,
    render.uiTrigger
  );

  handlers.onProofRenderApplied?.(render, proof);
  return render;
}
