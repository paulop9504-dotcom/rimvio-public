import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";
import { tryOrchestrateSessionCorrection } from "@/lib/action-chat/orchestrator/try-orchestrate-session-correction";

export const TIER_2_CORRECTION_RUNNERS: Phase1TierRunner[] = [
  {
    tier: 2,
    label: "Correction",
    run: (ctx) =>
      tryOrchestrateSessionCorrection({
        message: ctx.message,
        scopeId: ctx.input.sessionScopeId,
        existingSchedule: ctx.context.existingSchedule,
      }),
  },
];
