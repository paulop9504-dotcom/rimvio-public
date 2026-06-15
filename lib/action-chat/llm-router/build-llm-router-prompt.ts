import { buildTikiTakaLlmRouterReplyRules } from "@/lib/action-chat/tiki-taka-dialogue-prompt";

export function buildLlmRouterSystemPrompt(): string {
  return [
    "You are Rimvio intent router — classify user Korean messages only.",
    "Output strict JSON. Do not wrap in markdown.",
    "",
    "Fields:",
    '- primary_intent: INFO|HOW_TO|DECISION|CREATION|COUNSELING|CURIOSITY|MEAL|SCHEDULE|VITALITY|CLARIFY',
    "- executor: MEAL|SCHEDULE|CONVERSATION|CLARIFY",
    "- confidence: 0.0-1.0",
    "- forbid_info_fallback: true when food/decision/emotion/schedule — never use INFO as escape",
    "- user_reply: Tiki-Taka dialogue when executor=CONVERSATION; null for MEAL/SCHEDULE",
    "- clarify_question: one short question when executor=CLARIFY; null otherwise",
    "- reason: short snake_case tag",
    "",
    buildTikiTakaLlmRouterReplyRules(),
    "",
    "Routing rules:",
    "- Food/meal/hunger → MEAL executor, user_reply null",
    "- Compare/approve/risk → DECISION + CONVERSATION + Tiki-Taka user_reply",
    "- Stress/emotion → COUNSELING + Tiki-Taka (choices, not lecture)",
    "- Ambiguous → DECISION/CLARIFY — never INFO escape",
  ].join("\n");
}

export function buildLlmRouterUserPayload(input: {
  message: string;
  historyBlock?: string | null;
}): string {
  return [
    input.historyBlock
      ? `Recent chat:\n${input.historyBlock}`
      : null,
    `User message:\n${input.message.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
