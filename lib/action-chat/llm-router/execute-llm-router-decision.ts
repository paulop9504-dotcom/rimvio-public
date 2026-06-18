import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";
import { RIMVIO_CONVERSATION_LINES } from "@/lib/action-chat/rimvio-persona";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type {
  LlmRouterDecision,
  LlmRouterOutcome,
} from "@/lib/action-chat/llm-router/llm-router-types";
import type { ValidatedLlmRouterDecision } from "@/lib/action-chat/llm-router/validate-llm-router-decision";

const RULE_STUB: Record<AiIntentCategory, string> = {
  INFO: "어떤 부분이 궁금하신지 알려주시면 쉽게 풀어서 설명해 드릴게요.",
  HOW_TO: "원하시는 작업을 조금만 구체적으로 말씀해 주시면 단계별로 안내해 드릴게요.",
  DECISION: "선택지나 상황을 알려주시면 장단점을 정리해 드릴게요.",
  CREATION: "어떤 톤과 분량으로 쓸지 알려주시면 바로 초안을 만들어 드릴게요.",
  COUNSELING: RIMVIO_CONVERSATION_LINES.tired,
  CURIOSITY:
    "저는 Rimvio예요. 질문에 맞춰 설명·실행·정리를 도와드리는 AI 도우미입니다. 궁금한 점을 말씀해 주세요.",
};

function isAiIntentCategory(
  intent: LlmRouterDecision["primary_intent"]
): intent is AiIntentCategory {
  return (
    intent === "INFO" ||
    intent === "HOW_TO" ||
    intent === "DECISION" ||
    intent === "CREATION" ||
    intent === "COUNSELING" ||
    intent === "CURIOSITY"
  );
}

function conversationSummary(decision: ValidatedLlmRouterDecision): string {
  if (decision.user_reply?.trim()) {
    return decision.user_reply.trim();
  }
  if (decision.clarify_question?.trim()) {
    return decision.clarify_question.trim();
  }
  if (isAiIntentCategory(decision.primary_intent)) {
    return RULE_STUB[decision.primary_intent];
  }
  return "조금만 더 구체적으로 말씀해 주시면 바로 도와드릴게요.";
}

function buildConversationResult(
  decision: ValidatedLlmRouterDecision
): OrchestratorResult {
  const aiIntent = isAiIntentCategory(decision.primary_intent)
    ? decision.primary_intent
    : decision.primary_intent === "CLARIFY"
      ? "DECISION"
      : "INFO";

  return {
    summary: conversationSummary(decision),
    actions: [],
    source: "openai",
    confidence: decision.confidence,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      ai_intent: aiIntent,
      semantic_reason: decision.reason,
      llm_router: {
        primary_intent: decision.primary_intent,
        executor: decision.executor,
        adjusted: decision.adjusted,
      },
    },
  };
}

export function executeLlmRouterDecision(
  decision: ValidatedLlmRouterDecision
): LlmRouterOutcome {
  if (decision.executor === "MEAL" || decision.primary_intent === "MEAL") {
    return { kind: "defer_meal" };
  }

  if (decision.executor === "SCHEDULE" || decision.primary_intent === "SCHEDULE") {
    return { kind: "defer_pipeline" };
  }

  if (decision.executor === "CLARIFY" || decision.primary_intent === "CLARIFY") {
    return {
      kind: "result",
      result: buildConversationResult({
        ...decision,
        primary_intent: "DECISION",
        executor: "CONVERSATION",
      }),
    };
  }

  if (decision.executor === "CONVERSATION") {
    return { kind: "result", result: buildConversationResult(decision) };
  }

  return { kind: "defer_pipeline" };
}
