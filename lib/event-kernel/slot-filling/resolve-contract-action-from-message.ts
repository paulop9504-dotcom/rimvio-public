import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { inferContractAction } from "@/lib/event-kernel/slot-filling/infer-contract-action";

export type ResolvedContractAction = {
  action: string | null;
  routingMessage: string;
  mentionFeatureId: string | null;
  mentionSourceRef: string | null;
};

/**
 * @feature query → contract action when registered; otherwise NL infer on routing body.
 */
export function resolveContractActionFromMessage(message: string): ResolvedContractAction {
  const mention = parseActionMention(message);
  if (mention) {
    if (mention.feature.action) {
      return {
        action: mention.feature.action,
        routingMessage: mention.routingMessage,
        mentionFeatureId: mention.feature.featureId,
        mentionSourceRef: mention.feature.sourceRef,
      };
    }
    return {
      action: inferContractAction(mention.routingMessage),
      routingMessage: mention.routingMessage,
      mentionFeatureId: mention.feature.featureId,
      mentionSourceRef: mention.feature.sourceRef,
    };
  }

  return {
    action: inferContractAction(message),
    routingMessage: message,
    mentionFeatureId: null,
    mentionSourceRef: null,
  };
}
