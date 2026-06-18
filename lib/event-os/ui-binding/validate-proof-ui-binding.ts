import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { translateUiDiff } from "@/lib/event-os/ui-binding/translate-ui-diff";
import type { ProofUIRenderModel } from "@/lib/event-os/ui-binding/ui-render-types";

export function validateProofUiBinding(
  proof: CausalProof,
  render: ProofUIRenderModel
): string[] {
  const failures: string[] = [];

  if (!proof.proofHash) {
    failures.push("proof_hash_missing");
  }

  if (render.proofHash !== proof.proofHash) {
    failures.push("render_proof_hash_mismatch");
  }

  if (render.uiDiff !== proof.uiDiff) {
    failures.push("render_ui_diff_mismatch");
  }

  const expected = translateUiDiff(proof.uiDiff);
  if (render.instructions.length !== expected.length) {
    failures.push("instruction_count_mismatch");
  } else {
    for (let i = 0; i < expected.length; i += 1) {
      const a = render.instructions[i];
      const b = expected[i];
      if (a.type !== b.type || a.target !== b.target) {
        failures.push(`instruction_mismatch_at_${i}`);
        break;
      }
    }
  }

  if (proof.uiDiff !== "none" && proof.causalChain.length === 0) {
    failures.push("causal_chain_missing_for_ui_diff");
  }

  if (proof.uiDiff !== "none" && !render.explainability.causalChain.length) {
    failures.push("explainability_causal_chain_missing");
  }

  return failures;
}
