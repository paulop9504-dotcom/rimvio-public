import type { OrchestratorPipelineContext } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { applyTierGoalPolicy } from "@/lib/goal-engine/apply-tier-goal-policy";

export type Phase1TierId = 0 | 1 | 2 | 3 | 4 | 5;

export type Phase1TierLabel =
  | "KillSwitch"
  | "Security"
  | "Correction"
  | "Workflow"
  | "Registry"
  | "Deterministic";

export type Phase1TierRunner = {
  tier: Phase1TierId;
  label: Phase1TierLabel;
  detail?: string;
  run: (
    ctx: OrchestratorPipelineContext
  ) => Promise<OrchestratorResult | null> | OrchestratorResult | null;
};

export async function runPhase1Tier(
  ctx: OrchestratorPipelineContext,
  runner: Phase1TierRunner
): Promise<OrchestratorResult | null> {
  const result = await runner.run(ctx);
  if (result) {
    const wired =
      runner.tier === 5
        ? applyTierGoalPolicy(result, {
            goalSnapshot: ctx.goalSnapshot,
            goalPriorityHint: ctx.goalPriorityHint,
            tierDetail: runner.detail,
            userMessage: ctx.message,
          })
        : result;
    ctx.trace.hit(1, runner.tier, runner.label, runner.detail);
    return wired;
  }
  ctx.trace.pass(1, runner.tier, runner.label);
  return null;
}
