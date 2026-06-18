import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { validateActionContract } from "@/lib/event-kernel/action-contracts/validate-action-contract";
import { buildMissingSlotQuestion } from "@/lib/event-kernel/slot-filling/build-missing-slot-question";
import { extractSlots } from "@/lib/event-kernel/slot-filling/extract-slots";
import { inferApprovalAction } from "@/lib/event-kernel/review/infer-approval-action";
import { resolveContractActionFromMessage } from "@/lib/event-kernel/slot-filling/resolve-contract-action-from-message";
import type {
  KernelExecutionOutcome,
  KernelExecutionRuntime,
} from "@/lib/event-kernel/execute-kernel-decision";
import type { EventKernelStrictOutput } from "@/lib/event-kernel/serialize-event-kernel-output";
import { dominantMicroIntent } from "@/lib/event-kernel/types";

export type ContractExecutionState = "PROCEED" | "MISSING_SLOT";

export type ContractGateEvaluation =
  | { state: "PROCEED" }
  | {
      state: "MISSING_SLOT";
      action: string;
      question: string;
      missingSlots: string[];
      slots: Record<string, string>;
    };

/**
 * KERNEL → SLOT EXTRACTION → CONTRACT VALIDATION
 * Returns PROCEED when no contract applies or all required slots are filled.
 */
export function evaluateContractGate(message: string): ContractGateEvaluation {
  const approvalAction = inferApprovalAction(message);
  if (approvalAction) {
    return { state: "PROCEED" };
  }

  const resolved = resolveContractActionFromMessage(message);
  const action = resolved.action;
  if (!action) {
    return { state: "PROCEED" };
  }

  const { slots } = extractSlots(resolved.routingMessage);
  const validation = validateActionContract({
    action,
    extractedSlots: slots,
  });

  if (validation.valid) {
    return { state: "PROCEED" };
  }

  return {
    state: "MISSING_SLOT",
    action,
    question: buildMissingSlotQuestion({
      action,
      missingSlots: validation.missingSlots,
    }),
    missingSlots: validation.missingSlots,
    slots,
  };
}

export function buildMissingSlotKernelOutcome(input: {
  gate: Extract<ContractGateEvaluation, { state: "MISSING_SLOT" }>;
  wire: EventKernelStrictOutput;
  runtime: KernelExecutionRuntime;
}): KernelExecutionOutcome {
  const dominant = dominantMicroIntent(input.wire.micro_intent);
  const summary = input.gate.question;

  const result: OrchestratorResult = {
    summary,
    actions: [],
    source: "rules",
    confidence: Math.max(0.5, 1 - input.wire.entropy),
    disclosure: "medium",
    actionsRevealed: false,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
    meta: {
      intent_type: "CONTINUE",
      requires_context_switch: false,
      contract_state: "MISSING_SLOT",
      contract_action: input.gate.action,
      contract_missing_slots: input.gate.missingSlots,
      contract_slots: input.gate.slots,
      kernel_decision: input.wire.decision,
      kernel_entropy: input.wire.entropy,
      micro_intent: dominant,
      micro_confidence: input.wire.micro_intent[dominant],
      stability_score: 1 - input.wire.entropy,
      turn_pressure: input.runtime.turnPressure,
    },
    thought: `contract_gate · ${input.gate.action} · missing ${input.gate.missingSlots.join(",")}`,
  };

  return {
    disposition: "terminal",
    hint: "missing_slot",
    result,
  };
}
