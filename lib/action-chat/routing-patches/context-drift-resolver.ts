import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { buildTikiTakaOfflineReply } from "@/lib/action-chat/tiki-taka-dialogue-prompt";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  isExtendedContextDriftInput,
  repairContextDrift,
} from "@/lib/action-chat/adaptive-behavior/context-repair";

export type ContextDriftResolution =
  | { kind: "clarify"; summary: string; confidence?: number }
  | { kind: "expand"; query: string; priorIntent: string; confidence?: number }
  | { kind: "none" };

const CONTEXT_DRIFT =
  /^(?:그거|그\s*거|아까(?:\s*거)?|비슷(?:하게)?|전에(?:\s*했던)?|대충\s*알아서|적당히|느낌대로|전에처럼|비슷하게\s*처리)/iu;

export function isContextDriftInput(message: string): boolean {
  const trimmed = message.trim();
  return CONTEXT_DRIFT.test(trimmed) || isExtendedContextDriftInput(trimmed);
}

/**
 * PATCH 2+ — reconstruction before clarify (confidence gate in context-repair).
 */
export function resolveContextDrift(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): ContextDriftResolution {
  const repaired = repairContextDrift(message, history);
  if (repaired.kind === "none") {
    return { kind: "none" };
  }
  if (repaired.kind === "reconstructed") {
    return {
      kind: "expand",
      query: repaired.query,
      priorIntent: repaired.priorIntent,
      confidence: repaired.confidence,
    };
  }
  return {
    kind: "clarify",
    summary: repaired.summary,
    confidence: repaired.confidence,
  };
}

export function buildContextDriftClarifyResult(
  resolution: Extract<ContextDriftResolution, { kind: "clarify" }>
): OrchestratorResult {
  return {
    summary: resolution.summary,
    actions: [],
    source: "conversation",
    confidence: 0.84,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      ai_intent: "DECISION",
      semantic_reason: "context_drift_clarify",
      routing_patch: "PATCH2_CONTEXT_DRIFT",
    },
  };
}

export function buildContextDriftDecisionResult(message: string): OrchestratorResult {
  return {
    summary: buildTikiTakaOfflineReply(message, "DECISION"),
    actions: [],
    source: "conversation",
    confidence: 0.83,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      ai_intent: "DECISION",
      semantic_reason: "context_drift_no_stack",
      routing_patch: "PATCH2_CONTEXT_DRIFT",
    },
  };
}
