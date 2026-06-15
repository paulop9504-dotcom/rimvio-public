import type {
  EventKernelState,
  KernelCommitDecision,
  MicroIntentDistribution,
} from "@/lib/event-kernel/types";
import { assertValidEventKernelStrictOutput } from "@/lib/event-kernel/schema-lock/kernel-output-schema";

/** Strict Kernel wire — §8 of EVENT_KERNEL_SPEC.md (decision engine output only). */
export type EventKernelStrictOutput = {
  frame: {
    entities: string[];
    intent_hint: string;
    modifiers: string[];
  };
  micro_intent: MicroIntentDistribution;
  entropy: number;
  decision: KernelCommitDecision;
  response_hint: string;
};

export function serializeEventKernelOutput(
  state: EventKernelState
): EventKernelStrictOutput {
  const output: EventKernelStrictOutput = {
    frame: {
      entities: [...state.frame.entities],
      intent_hint: state.frame.intent_hint,
      modifiers: [...state.frame.modifiers],
    },
    micro_intent: { ...state.microIntentDistribution },
    entropy: state.entropy,
    decision: state.committedDecision,
    response_hint: state.responseHint,
  };
  assertValidEventKernelStrictOutput(output);
  return output;
}

export function formatEventKernelStrictJson(state: EventKernelState): string {
  return JSON.stringify(serializeEventKernelOutput(state), null, 2);
}
