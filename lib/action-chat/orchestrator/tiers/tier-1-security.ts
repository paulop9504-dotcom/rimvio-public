import { orchestrateContentPolicy } from "@/lib/policy/orchestrate-content-policy";
import { orchestratePiiSecurityGate } from "@/lib/safety/pii-security-gate";
import { orchestrateGuardrail } from "@/lib/safety/orchestrate-guardrail";
import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";

export const TIER_1_SECURITY_RUNNERS: Phase1TierRunner[] = [
  {
    tier: 1,
    label: "Security",
    detail: "ContentPolicy",
    run: async (ctx) => orchestrateContentPolicy(ctx.message),
  },
  {
    tier: 1,
    label: "Security",
    detail: "PII",
    run: (ctx) => orchestratePiiSecurityGate(ctx.message),
  },
  {
    tier: 1,
    label: "Security",
    detail: "Guardrail",
    run: async (ctx) =>
      orchestrateGuardrail({
        message: ctx.message,
        referenceDate: ctx.context.currentDate,
        existingSchedule: ctx.context.existingSchedule,
      }),
  },
];
