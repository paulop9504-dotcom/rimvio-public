import type { ConversationEventState } from "@/lib/action-chat/conversation-event-state";
import { resolveSearchIntent, type ResolvedSearchIntent } from "@/lib/search-intent";

/** Bridge chat event state topic into search frame context (티키타카 ↔ search). */
export function resolveSearchIntentWithEventState(input: {
  text: string;
  eventState?: Pick<ConversationEventState, "current_topic" | "domain"> | null;
  deeplinkSeed?: string;
}): ResolvedSearchIntent {
  const context =
    input.eventState?.current_topic?.trim() ||
    input.eventState?.domain?.trim() ||
    undefined;

  return resolveSearchIntent({
    text: input.text,
    context,
    deeplinkSeed: input.deeplinkSeed,
  });
}
