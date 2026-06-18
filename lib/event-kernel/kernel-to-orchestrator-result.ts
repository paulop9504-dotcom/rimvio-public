import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  executeKernelDecision,
  kernelExecutionIsTerminal,
} from "@/lib/event-kernel/execute-kernel-decision";
import type { EventKernelState } from "@/lib/event-kernel/types";

/** Kernel Orchestrator → OrchestratorResult (terminal / hold cases only). */
export function eventKernelToOrchestratorResult(
  kernel: EventKernelState
): OrchestratorResult | null {
  const outcome = executeKernelDecision(kernel);
  if (!kernelExecutionIsTerminal(outcome)) {
    return null;
  }
  return outcome.result;
}
