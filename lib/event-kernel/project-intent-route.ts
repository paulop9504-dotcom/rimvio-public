import {
  detectDomain,
  extractCurrentTopic,
  scoreTopicRelevance,
} from "@/lib/action-chat/intent-router-core";
import type { IntentRoute } from "@/lib/action-chat/intent-router-core";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { kernelExecutionMode } from "@/lib/event-kernel/commit-gate";
import type { EventKernelState, KernelMicroIntentKey } from "@/lib/event-kernel/types";

export type ProjectedContinuity = "CONTINUE" | "NEW_TASK" | "SHIFT" | "HOLD";

const NEW_TASK_CUE =
  /(?:일정\s*(?:잡|등록|추가)|경기장|월드컵|새로\s*(?:찾|잡|등록))/i;

function legacyMicroIntent(key: KernelMicroIntentKey): IntentRoute["micro_intent"] {
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

function projectContinuity(input: {
  kernel: EventKernelState;
  message: string;
  currentTopic: string | null;
  relevanceScore: number;
}): { continuity: ProjectedContinuity; requires_context_switch: boolean } {
  const { kernel, message, currentTopic, relevanceScore } = input;
  const dominant = kernel.dominantIntent;
  const hasContext = Boolean(currentTopic) || kernel.history.length > 0;

  if (NEW_TASK_CUE.test(message) && relevanceScore < 0.25) {
    return { continuity: "SHIFT", requires_context_switch: true };
  }

  if (!hasContext) {
    return { continuity: "NEW_TASK", requires_context_switch: false };
  }

  if (dominant === "SHIFT") {
    return { continuity: "SHIFT", requires_context_switch: true };
  }

  if (dominant === "QUERY") {
    return { continuity: "NEW_TASK", requires_context_switch: false };
  }

  if (dominant === "CLOSE" || dominant === "ACK" || dominant === "PASSIVE") {
    return { continuity: "HOLD", requires_context_switch: false };
  }

  if (dominant === "CONTINUE") {
    return { continuity: "CONTINUE", requires_context_switch: false };
  }

  if (relevanceScore >= 0.12) {
    return { continuity: "CONTINUE", requires_context_switch: false };
  }

  return { continuity: "NEW_TASK", requires_context_switch: relevanceScore < 0.08 };
}

function stabilityFromKernel(kernel: EventKernelState): number {
  const dominantProb = kernel.microIntentDistribution[kernel.dominantIntent];
  return Math.min(1, Math.max(0, dominantProb + (1 - kernel.entropy) * 0.35));
}

/** Projection adapter — Kernel SSOT → legacy IntentRoute (no FOLLOW_UP). */
export function projectIntentRouteFromKernel(input: {
  kernel: EventKernelState;
  message: string;
  linkTitle?: string | null;
  history?: OrchestrateHistoryTurn[];
}): IntentRoute {
  const currentTopic = extractCurrentTopic({
    history: input.history,
    linkTitle: input.linkTitle,
    currentMessage: input.message,
  });
  const relevanceScore = scoreTopicRelevance(currentTopic, input.message);
  const messageDomain = detectDomain(input.message);
  const topicDomain = currentTopic ? detectDomain(currentTopic) : null;
  const domainShift = Boolean(messageDomain && topicDomain && messageDomain !== topicDomain);

  const { continuity, requires_context_switch } = projectContinuity({
    kernel: input.kernel,
    message: input.message,
    currentTopic,
    relevanceScore,
  });

  const contextSwitch =
    requires_context_switch || (domainShift && continuity === "NEW_TASK" && relevanceScore < 0.35);

  return {
    intent_type: continuity === "SHIFT" || continuity === "NEW_TASK" ? "NEW_TASK" : "CONTINUE",
    requires_context_switch: contextSwitch,
    current_topic: currentTopic,
    relevance_score: relevanceScore,
    micro_intent: legacyMicroIntent(input.kernel.dominantIntent),
    micro_confidence: input.kernel.microIntentDistribution[input.kernel.dominantIntent],
    stability_score: stabilityFromKernel(input.kernel),
    turn_pressure: input.kernel.turnPressure,
    continuity,
    kernel_entropy: input.kernel.entropy,
    kernel_decision: input.kernel.committedDecision,
    execution_mode: kernelExecutionMode(input.kernel),
  };
}
