import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import {
  buildConversationEventState,
  eventStateToIntentRoute,
} from "@/lib/action-chat/conversation-event-state";
import {
  topicTokens,
  type IntentRoute,
} from "@/lib/action-chat/intent-router-core";

export type { IntentRoute } from "@/lib/action-chat/intent-router-core";
export type IntentType = IntentRoute["intent_type"];

export {
  topicTokens,
  extractCurrentTopic,
  scoreTopicRelevance,
} from "@/lib/action-chat/intent-router-core";

export function resolveIntentRoute(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
}): IntentRoute {
  return eventStateToIntentRoute(buildConversationEventState(input));
}

export function resolveConversationEventState(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
}): ReturnType<typeof buildConversationEventState> {
  return buildConversationEventState(input);
}

export { eventStateToIntentRoute };

export function applyContextIsolation<T extends {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  linkUrl?: string | null;
  linkCategory?: string | null;
}>(input: T, route: IntentRoute): T {
  if (!route.requires_context_switch) {
    return input;
  }

  const mentionsLink =
    Boolean(input.linkTitle?.trim()) &&
    topicTokens(input.linkTitle ?? "").some((token) => input.message.toLowerCase().includes(token));

  return {
    ...input,
    history: [],
    linkTitle: mentionsLink ? input.linkTitle : null,
    linkUrl: mentionsLink ? input.linkUrl : null,
    linkCategory: mentionsLink ? input.linkCategory : null,
  };
}

export function stripPriorTopicReferences(summary: string, priorTopic: string): string {
  let cleaned = summary;

  for (const token of topicTokens(priorTopic)) {
    if (token.length < 2) {
      continue;
    }
    cleaned = cleaned.replace(new RegExp(token, "gi"), "");
  }

  cleaned = cleaned
    .replace(/(?:아까|이전|그\s*맛집|그\s*가게|방금\s*말한)\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 80) || summary;
}

export function buildIntentRouteUserBlock(route: IntentRoute): string | null {
  if (route.micro_intent === "CLOSE") {
    return "[Intent_Route]: CLOSE — user is ending the turn. Reply briefly and warmly; do NOT ask follow-up questions or suggest new tasks.";
  }

  if (route.micro_intent === "PASSIVE_STATE") {
    return "[Intent_Route]: PASSIVE_STATE — filler/emotion only (ㅋㅋ/ㅎㅎ/ㅇㅇ). Maintain mood; do NOT extend the thread or ask questions.";
  }

  if (route.micro_intent === "ACK") {
    return "[Intent_Route]: ACK — user received your message. Brief acknowledgment only; do NOT push the next question.";
  }

  if (route.micro_intent === "DIRECT_QUERY") {
    const topic = route.current_topic ? ` Topic anchor: "${route.current_topic}".` : "";
    return `[Intent_Route]: DIRECT_QUERY — short factual fetch (price/when/where). Answer or run search immediately; do not merely continue small talk.${topic}`;
  }

  if (route.intent_type === "NEW_TASK" && route.requires_context_switch) {
    const prior = route.current_topic ? ` (ignore prior topic: "${route.current_topic}")` : "";
    return `[Intent_Route]: NEW_TASK — treat as a fresh request${prior}. Do NOT mention earlier conversation topics. Respond only to the new user message.`;
  }

  if (route.intent_type === "CONTINUE" && route.current_topic) {
    return `[Intent_Route]: CONTINUE — maintain topic: "${route.current_topic}".`;
  }

  return null;
}

export function applyIntentRouteToResult(
  result: OrchestratorResult,
  route: IntentRoute
): OrchestratorResult {
  let summary = result.summary;

  if (route.requires_context_switch && route.current_topic) {
    summary = stripPriorTopicReferences(summary, route.current_topic);
  }

  return {
    ...result,
    summary,
    meta: {
      intent_type: route.intent_type,
      requires_context_switch: route.requires_context_switch,
      current_topic: route.current_topic,
      relevance_score: route.relevance_score,
      micro_intent: route.micro_intent,
      micro_confidence: route.micro_confidence,
      stability_score: route.stability_score,
      turn_pressure: route.turn_pressure,
      continuity: route.continuity,
      kernel_entropy: route.kernel_entropy,
      kernel_decision: route.kernel_decision,
      execution_mode: route.execution_mode,
    },
  };
}
