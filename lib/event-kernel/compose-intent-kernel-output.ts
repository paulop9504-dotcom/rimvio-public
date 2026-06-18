import type { IntentKernelSystemOutput } from "@/lib/event-kernel/intent-kernel-system/types";
import type { KernelIntentDecision } from "@/lib/event-kernel/intent-kernel-system/types";
import type { MemoryHints } from "@/lib/event-kernel/intent-kernel-system/types";
import type { ExecutionPlan } from "@/lib/event-kernel/execution-planner/types";

/** §6 strict JSON — no natural language. */
export function composeIntentKernelOutput(input: {
  kernel: KernelIntentDecision;
  memory: MemoryHints;
  plan: ExecutionPlan;
}): IntentKernelSystemOutput {
  return {
    kernel: {
      intent: input.kernel.intent,
      state: input.kernel.state,
      route: input.kernel.route,
      confidence: Number(input.kernel.confidence.toFixed(2)),
    },
    memory: {
      candidates: input.memory.candidates,
      scores: input.memory.scores,
    },
    execution: {
      action: input.plan.action,
    },
  };
}

export function formatIntentKernelSystemOutput(output: IntentKernelSystemOutput): string {
  return JSON.stringify(output);
}
