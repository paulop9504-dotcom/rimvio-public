import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import { planExecution } from "@/lib/event-kernel/execution-planner/plan-execution";
import type {
  KernelExecutionAction,
  KernelIntentDecision,
} from "@/lib/event-kernel/intent-kernel-system/types";

/** §5 — execution action derived from EXECUTION PLANNER (kernel mapping only). */
export function mapKernelToExecutionAction(
  decision: KernelIntentDecision,
  memory: EventKernelMemoryState | null = null,
  message?: string | null
): KernelExecutionAction {
  return planExecution(decision, memory, message).action;
}
