import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type {
  KernelExecutionAction,
  KernelIntentDecision,
} from "@/lib/event-kernel/intent-kernel-system/types";
import {
  executeKernelWire,
  delegateKernelExecution,
  type KernelExecutionOutcome,
  type KernelExecutionRuntime,
} from "@/lib/event-kernel/execute-kernel-decision";
import type { EventKernelStrictOutput } from "@/lib/event-kernel/serialize-event-kernel-output";
import {
  KERNEL_MICRO_INTENT_KEYS,
  type KernelCommitDecision,
  type KernelMicroIntentKey,
  type MicroIntentDistribution,
} from "@/lib/event-kernel/types";

const SAFETY_CLARIFY_HINT = "무엇을 도와드릴까요?";

function decisionToWireDecision(state: KernelIntentDecision["state"]): KernelCommitDecision {
  switch (state) {
    case "CLARIFY_A":
    case "CLARIFY_B":
      return "CLARIFY";
    default:
      return "DIRECT_ACTION";
  }
}

function decisionToDominant(state: KernelIntentDecision["state"]): KernelMicroIntentKey {
  switch (state) {
    case "DIRECT_ACTION":
      return "QUERY";
    case "CONTINUE":
      return "CONTINUE";
    case "ACK":
      return "ACK";
    case "TERMINAL_ACK":
      return "CLOSE";
    case "CLARIFY_A":
    case "CLARIFY_B":
      return "QUERY";
    default:
      return "CONTINUE";
  }
}

function responseHintForDecision(decision: KernelIntentDecision): string {
  switch (decision.state) {
    case "CLARIFY_A":
    case "CLARIFY_B":
      return SAFETY_CLARIFY_HINT;
    case "TERMINAL_ACK":
    case "ACK":
      return "네.";
    default:
      return "";
  }
}

function buildDominantMicroIntent(
  dominant: KernelMicroIntentKey,
  confidence: number
): MicroIntentDistribution {
  const clamped = Math.min(0.98, Math.max(0.55, confidence));
  const remainder = (1 - clamped) / (KERNEL_MICRO_INTENT_KEYS.length - 1);
  const dist = {} as MicroIntentDistribution;
  for (const key of KERNEL_MICRO_INTENT_KEYS) {
    dist[key] = key === dominant ? clamped : remainder;
  }
  return dist;
}

function buildAdaptedWire(
  decision: KernelIntentDecision,
  wire: EventKernelStrictOutput
): EventKernelStrictOutput {
  const dominant = decisionToDominant(decision.state);
  return {
    ...wire,
    decision: decisionToWireDecision(decision.state),
    response_hint: responseHintForDecision(decision),
    micro_intent: buildDominantMicroIntent(dominant, decision.confidence),
  };
}

/**
 * §5 EXECUTION — follows KERNEL decision; optional contract-bound action from planner.
 */
export function executeKernelIntent(input: {
  decision: KernelIntentDecision;
  wire: EventKernelStrictOutput;
  runtime: KernelExecutionRuntime;
  executionAction?: KernelExecutionAction;
}): KernelExecutionOutcome {
  if (input.executionAction === "MEAL_RECOMMENDATION") {
    return delegateKernelExecution("meal_recommendation");
  }
  if (input.executionAction === "APPROVE_PENDING_EVENTS") {
    return delegateKernelExecution("calendar_commit");
  }

  const adaptedWire = buildAdaptedWire(input.decision, input.wire);
  return executeKernelWire(adaptedWire, input.runtime);
}

export function kernelIntentIsTerminal(outcome: KernelExecutionOutcome): boolean {
  return outcome.disposition === "terminal" || outcome.disposition === "hold";
}

export function orchestratorResultFromExecution(
  outcome: KernelExecutionOutcome
): OrchestratorResult | null {
  return outcome.result;
}
