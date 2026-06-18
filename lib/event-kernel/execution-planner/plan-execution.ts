import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import type { ExecutionPlan } from "@/lib/event-kernel/execution-planner/types";
import type { KernelIntentDecision } from "@/lib/event-kernel/intent-kernel-system/types";
import { bindContractExecutionAction } from "@/lib/event-kernel/execution-planner/bind-contract-execution";

/**
 * EXECUTION PLANNER — pure deterministic mapping (KERNEL → action).
 * Does NOT decide intent. Does NOT reinterpret memory.
 */
export function planExecution(
  kernel: KernelIntentDecision,
  _memory: EventKernelMemoryState | null,
  message?: string | null
): ExecutionPlan {
  const bound =
    message?.trim() ? bindContractExecutionAction(kernel, message) : null;
  const action = bound ?? mapKernelStateToAction(kernel);

  return {
    action,
    kernel_state: kernel.state,
    kernel_route: kernel.route,
    ...(kernel.canonical_query ? { canonical_query: kernel.canonical_query } : {}),
  };
}

function mapKernelStateToAction(
  kernel: KernelIntentDecision
): ExecutionPlan["action"] {
  switch (kernel.state) {
    case "DIRECT_ACTION":
      if (kernel.route === "BUSINESS_LOOKUP") {
        return "BUSINESS_LOOKUP";
      }
      return "SEARCH";

    case "CLARIFY_A":
    case "CLARIFY_B":
      return "CLARIFY";

    case "CONTINUE":
      return "DELEGATE";

    case "ACK":
    case "TERMINAL_ACK":
      return "NONE";

    default:
      return "NONE";
  }
}
