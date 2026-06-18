/** Self-learning loop — normalized interaction + failure records. */

export type FailureKind =
  | "routing_error"
  | "execution_error"
  | "ux_mismatch"
  | "unknown";

export type ImplicitSignalKind =
  | "repeat_query"
  | "short_negative"
  | "rephrase"
  | "abandonment"
  | "explicit_down";

export type FixTarget =
  | "router_prompt"
  | "intent_mapping"
  | "confidence_threshold"
  | "fallback_policy"
  | "executor_rule";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export type ImplicitSignal = {
  kind: ImplicitSignalKind;
  message: string;
  detail?: string;
};

export type InteractionRecord = {
  id: string;
  timestamp: string;
  userMessage: string;
  assistantSummary: string;
  routing?: {
    chat_axis_route?: string;
    routing_patch?: string;
    ai_intent?: string;
    semantic_reason?: string;
  };
  explicitVerdict?: "up" | "down";
  implicitSignals: ImplicitSignal[];
  failureKind: FailureKind;
  isFailure: boolean;
};

export type FixProposal = {
  target: FixTarget;
  intentKey: string;
  reason: string;
  action:
    | "strengthen_routing_rule"
    | "add_disambiguation_question"
    | "tighten_confidence_gate"
    | "adjust_executor_rule"
    | "review_fallback_policy";
  failureCount: number;
};

export type RegressionCaseResult = {
  message: string;
  ok: boolean;
  detail?: string;
};

export type RegressionGateResult = {
  total: number;
  passed: number;
  successRate: number;
  threshold: number;
  accepted: boolean;
  failures: RegressionCaseResult[];
};

export type SelfLearningReport = {
  analyzedAt: string;
  interactionCount: number;
  failureCount: number;
  failureRate: number;
  byFailureKind: Record<FailureKind, number>;
  byIntentKey: Record<string, number>;
  proposals: FixProposal[];
  regression?: RegressionGateResult;
  accepted: boolean;
};
