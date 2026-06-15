import type { KernelExecutionAction } from "@/lib/event-kernel/intent-kernel-system/types";
import type { KernelIntentDecision } from "@/lib/event-kernel/intent-kernel-system/types";
import { inferApprovalAction } from "@/lib/event-kernel/review/infer-approval-action";
import { inferContractAction } from "@/lib/event-kernel/slot-filling/infer-contract-action";

const CONTRACT_BOUND_EXECUTION: ReadonlySet<string> = new Set([
  "MEAL_RECOMMENDATION",
  "APPROVE_PENDING_EVENTS",
]);

/**
 * When kernel is DIRECT_ACTION and contract is a bound action, execution follows contract.
 */
export function bindContractExecutionAction(
  kernel: KernelIntentDecision,
  message: string
): KernelExecutionAction | null {
  if (kernel.state !== "DIRECT_ACTION") {
    return null;
  }

  const approval = inferApprovalAction(message.trim());
  if (approval && CONTRACT_BOUND_EXECUTION.has(approval)) {
    return approval as KernelExecutionAction;
  }

  const contract = inferContractAction(message.trim());
  if (!contract || !CONTRACT_BOUND_EXECUTION.has(contract)) {
    return null;
  }

  return contract as KernelExecutionAction;
}
