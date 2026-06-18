import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { buildExplainabilityFromProof } from "@/lib/event-os/ui-binding/build-explainability";
import { translateUiDiff } from "@/lib/event-os/ui-binding/translate-ui-diff";
import type {
  ProofUIRenderModel,
  RenderFromProofContext,
} from "@/lib/event-os/ui-binding/ui-render-types";

/**
 * UI = f(CausalProof) — pure projection; no SSOT reads.
 */
export function renderFromProof(
  proof: CausalProof,
  context: RenderFromProofContext = {}
): ProofUIRenderModel {
  const orchestrator = context.orchestrator ?? null;
  const instructions = translateUiDiff(proof.uiDiff);
  const explainability = buildExplainabilityFromProof(proof);

  return {
    proofHash: proof.proofHash,
    uiDiff: proof.uiDiff,
    instructions,
    explainability,
    uiTrigger: orchestrator?.uiTrigger ?? null,
    orchestratorSummary: orchestrator?.summary ?? null,
  };
}
