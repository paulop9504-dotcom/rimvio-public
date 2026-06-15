import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import {
  dominantMicroIntent,
  orchestrateEventKernel,
  type EventKernelState,
  type KernelMicroIntentKey,
} from "@/lib/event-kernel";

export type MicroIntent =
  | "CONTINUE"
  | "ACK"
  | "CLOSE"
  | "DIRECT_QUERY"
  | "PASSIVE_STATE"
  | "SOFT_SHIFT"
  | "NONE";

export type MicroIntentClassification = {
  micro_intent: MicroIntent;
  confidence: number;
  signals: string[];
  turn_pressure: number;
  distribution?: Record<KernelMicroIntentKey, number>;
  entropy?: number;
};

function legacyFromKernel(key: KernelMicroIntentKey): MicroIntent {
  switch (key) {
    case "QUERY":
      return "DIRECT_QUERY";
    case "PASSIVE":
      return "PASSIVE_STATE";
    case "SHIFT":
      return "SOFT_SHIFT";
    default:
      return key;
  }
}

function turnPressureFromKernel(kernel: EventKernelState): number {
  return kernel.turnPressure;
}

/** Legacy adapter — projects Kernel SSOT distribution to single label. */
export function classifyMicroIntent(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
}): MicroIntentClassification {
  const kernel = orchestrateEventKernel(input);
  const dominant = dominantMicroIntent(kernel.microIntentDistribution);

  return {
    micro_intent: legacyFromKernel(dominant),
    confidence: kernel.microIntentDistribution[dominant],
    signals: kernel.signals,
    turn_pressure: turnPressureFromKernel(kernel),
    distribution: kernel.microIntentDistribution,
    entropy: kernel.entropy,
  };
}

export function scoreMicroIntent(micro: MicroIntentClassification): number {
  const base = micro.confidence;
  const pressurePenalty = micro.turn_pressure < 0.25 ? 0.08 : 0;
  const entropyBoost = micro.entropy != null ? (1 - micro.entropy) * 0.1 : 0;
  return Math.min(1, Math.max(0, base + pressurePenalty + entropyBoost));
}

export function microIntentStabilityScore(micro: MicroIntentClassification): number {
  switch (micro.micro_intent) {
    case "CONTINUE":
      return 0.82 * micro.confidence + 0.08;
    case "DIRECT_QUERY":
      return 0.78 * micro.confidence + 0.14;
    case "ACK":
      return 0.35 * micro.confidence + 0.05;
    case "PASSIVE_STATE":
      return 0.22 * micro.confidence;
    case "CLOSE":
      return 0.15 * micro.confidence;
    case "SOFT_SHIFT":
      return 0.42 * micro.confidence;
    default:
      return 0.55;
  }
}
