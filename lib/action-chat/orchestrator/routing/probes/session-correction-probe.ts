import { tryOrchestrateSessionCorrection } from "@/lib/action-chat/orchestrator/try-orchestrate-session-correction";
import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";

/** Tier 2 — must run before frustration escape (shared `아니` prefix). */
export const sessionCorrectionProbe: PrePipelineProbe = async (base) => {
  const sessionCorrection = tryOrchestrateSessionCorrection({
    message: base.message,
    scopeId: base.input.sessionScopeId,
    existingSchedule: base.context.existingSchedule,
  });
  if (!sessionCorrection) {
    return null;
  }
  return {
    tier: 2,
    label: "Correction",
    terminal: "EARLY_RETURN",
    partial: sessionCorrection,
  };
};
