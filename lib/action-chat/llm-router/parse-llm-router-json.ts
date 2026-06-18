import type {
  LlmRouterDecision,
  LlmRouterExecutor,
  LlmRouterPrimaryIntent,
} from "@/lib/action-chat/llm-router/llm-router-types";

const PRIMARY_INTENTS = new Set<LlmRouterPrimaryIntent>([
  "INFO",
  "HOW_TO",
  "DECISION",
  "CREATION",
  "COUNSELING",
  "CURIOSITY",
  "MEAL",
  "SCHEDULE",
  "VITALITY",
  "CLARIFY",
]);

const EXECUTORS = new Set<LlmRouterExecutor>([
  "MEAL",
  "SCHEDULE",
  "CONVERSATION",
  "CLARIFY",
]);

function clampConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(1, num));
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function parseLlmRouterJson(raw: string | null | undefined): LlmRouterDecision | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const primary = payload.primary_intent as LlmRouterPrimaryIntent;
    const executor = payload.executor as LlmRouterExecutor;

    if (!PRIMARY_INTENTS.has(primary) || !EXECUTORS.has(executor)) {
      return null;
    }

    return {
      primary_intent: primary,
      executor,
      confidence: clampConfidence(payload.confidence),
      forbid_info_fallback: Boolean(payload.forbid_info_fallback),
      user_reply: asString(payload.user_reply),
      clarify_question: asString(payload.clarify_question),
      reason: asString(payload.reason) ?? "llm_router",
    };
  } catch {
    return null;
  }
}
