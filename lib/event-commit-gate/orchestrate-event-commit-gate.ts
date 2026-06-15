import { buildSlotClarifyResult } from "@/lib/event-commit-gate/build-slot-clarify";
import { parseEventIntent } from "@/lib/event-commit-gate/parse-event-intent";
import {
  resolveEventCommitGate,
  shouldBlockDirectExecution,
} from "@/lib/event-commit-gate/resolve-commit-gate";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { EventCommitGateResult } from "@/lib/event-commit-gate/types";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";

export type OrchestrateEventCommitGateInput = {
  message: string;
  referenceDate?: string;
};

export function evaluateEventCommitGate(
  input: OrchestrateEventCommitGateInput,
): EventCommitGateResult | null {
  const parsed = parseEventIntent({
    message: input.message,
    referenceDate: input.referenceDate,
  });
  if (!parsed) {
    return null;
  }
  return resolveEventCommitGate(parsed);
}

/**
 * Global commit gate — intent O / target X → clarify (ACK before prep + save).
 * Returns null when slots are complete (domain handlers may proceed).
 */
export function orchestrateEventCommitGate(
  input: OrchestrateEventCommitGateInput,
): OrchestratorResult | null {
  // Bare vitality utterances (e.g. 배고파) → VitalityState fast path, not slot collect.
  if (isVitalityStateUtterance(input.message)) {
    return null;
  }

  const gate = evaluateEventCommitGate(input);
  if (!gate || !shouldBlockDirectExecution(gate)) {
    return null;
  }

  return buildSlotClarifyResult({
    intent: gate.intent,
    message: input.message.trim(),
    referenceDate: input.referenceDate ?? new Date().toISOString().slice(0, 10),
  });
}
