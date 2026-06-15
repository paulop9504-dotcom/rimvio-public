import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type { ConversationIntentDomain } from "@/lib/predictive-dock/action-opportunity-types";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";

const TRAVEL_CONTEXT =
  /(?:공항|airport|항공|인천|김포|여행|trip|탑승|체크인|비행|출장|탑승권|boarding|flight|짐\s*체크|패킹)/iu;

const SCHEDULE_CONTEXT =
  /(?:일정|약속|미팅|회의|예약|캘린더|스케줄|remind)/iu;

const PLACE_EXECUTION =
  /(?:길찾|네vi|가\s*줘|출발|이동|까지|역\s*으로)/iu;

function latestAssistantMessage(
  messages: readonly ActionChatMessage[]
): ActionChatMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return message;
    }
  }
  return null;
}

export function resolveConversationIntent(input: {
  lastUserMessage?: string | null;
  messages?: readonly ActionChatMessage[];
  activeChains?: readonly CanonicalContainerKey[];
}): ConversationIntentDomain {
  const trimmed = input.lastUserMessage?.trim() ?? "";
  const lastAssistant = input.messages
    ? latestAssistantMessage(input.messages)
    : null;

  if (trimmed && isPlaceRecommendationQuery(trimmed)) {
    return "dining_discovery";
  }

  if (lastAssistant?.cafeDiscovery?.options.length) {
    return "dining_discovery";
  }

  if (trimmed && TRAVEL_CONTEXT.test(trimmed)) {
    return "travel";
  }

  if (trimmed && SCHEDULE_CONTEXT.test(trimmed)) {
    return "schedule";
  }

  if (trimmed && PLACE_EXECUTION.test(trimmed)) {
    return "place_execution";
  }

  if (lastAssistant?.pendingConfirm || lastAssistant?.confirmation) {
    return "place_execution";
  }

  return "general";
}

export function intentDomainLabel(domain: ConversationIntentDomain): string {
  switch (domain) {
    case "dining_discovery":
      return "dining_discovery";
    case "travel":
      return "travel";
    case "schedule":
      return "schedule";
    case "place_execution":
      return "place_execution";
    default:
      return "general";
  }
}
