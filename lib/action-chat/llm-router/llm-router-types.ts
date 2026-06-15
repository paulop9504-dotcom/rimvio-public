import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";

/** Executor bucket — rules handle MEAL/SCHEDULE; LLM handles conversation copy. */
export type LlmRouterExecutor =
  | "MEAL"
  | "SCHEDULE"
  | "CONVERSATION"
  | "CLARIFY";

export type LlmRouterPrimaryIntent =
  | AiIntentCategory
  | "MEAL"
  | "SCHEDULE"
  | "VITALITY"
  | "CLARIFY";

export type LlmRouterDecision = {
  primary_intent: LlmRouterPrimaryIntent;
  executor: LlmRouterExecutor;
  confidence: number;
  forbid_info_fallback: boolean;
  user_reply: string | null;
  clarify_question: string | null;
  reason: string;
};

export type LlmRouterInput = {
  message: string;
  routingMessage: string;
  history?: readonly { role: string; content: string }[];
};

export type LlmRouterOutcome =
  | { kind: "result"; result: import("@/lib/action-chat/orchestrator-types").OrchestratorResult }
  | { kind: "defer_meal" }
  | { kind: "defer_pipeline" };
