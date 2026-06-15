import type { SemanticFrame } from "@/lib/search-intent/types";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

/** Kernel SSOT micro-intent keys — probabilities sum to 1.0 */
export type KernelMicroIntentKey =
  | "CONTINUE"
  | "QUERY"
  | "SHIFT"
  | "ACK"
  | "CLOSE"
  | "PASSIVE";

export type MicroIntentDistribution = Record<KernelMicroIntentKey, number>;

export type KernelCommitDecision = "DIRECT_ACTION" | "OPTIONS" | "CLARIFY";

export type EventKernelFrame = {
  entities: string[];
  intent_hint: string;
  modifiers: string[];
  context: string;
  raw: string;
};

export type EventKernelAction = {
  id: string;
  label: string;
  kind: "search" | "continue" | "shift" | "close" | "clarify";
};

export type EventKernelState = {
  frame: EventKernelFrame;
  microIntentDistribution: MicroIntentDistribution;
  entropy: number;
  committedDecision: KernelCommitDecision;
  dominantIntent: KernelMicroIntentKey;
  turnPressure: number;
  actions: EventKernelAction[];
  /** Minimal response instruction — §2.5 / §8 (not user-facing prose). */
  responseHint: string;
  signals: string[];
  history: OrchestrateHistoryTurn[];
};

export type OrchestrateEventKernelInput = {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  deeplinkSeed?: string;
};

export const KERNEL_MICRO_INTENT_KEYS: KernelMicroIntentKey[] = [
  "CONTINUE",
  "QUERY",
  "SHIFT",
  "ACK",
  "CLOSE",
  "PASSIVE",
];

export const ENTROPY_DIRECT_THRESHOLD = 0.3;
export const ENTROPY_OPTIONS_THRESHOLD = 0.7;

export function frameFromSemanticFrame(frame: SemanticFrame): EventKernelFrame {
  return {
    entities: frame.entities,
    intent_hint: frame.intent,
    modifiers: frame.modifiers,
    context: frame.context,
    raw: frame.raw,
  };
}

export function uniformMicroIntentDistribution(): MicroIntentDistribution {
  const n = KERNEL_MICRO_INTENT_KEYS.length;
  const p = 1 / n;
  return {
    CONTINUE: p,
    QUERY: p,
    SHIFT: p,
    ACK: p,
    CLOSE: p,
    PASSIVE: p,
  };
}

export function dominantMicroIntent(
  distribution: MicroIntentDistribution
): KernelMicroIntentKey {
  let best: KernelMicroIntentKey = "CONTINUE";
  let bestScore = -1;
  for (const key of KERNEL_MICRO_INTENT_KEYS) {
    const score = distribution[key];
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}
