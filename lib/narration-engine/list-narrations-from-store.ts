import { readSurface } from "@/lib/life-read-model";
import type { NarrationContext, NarrationResult } from "@/lib/narration-engine/types";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  EventNarration,
  NarrationContext,
  NarrationReasonTag,
  NarrationResult,
} from "@/lib/narration-engine/types";

export { composeNarrations } from "@/lib/narration-engine/compose-narrations";

/** Full decision stack → human-readable explanations (read-only). */
export function listNarrationsFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  narrationContext?: NarrationContext;
} = {}): NarrationResult {
  return readSurface({
    opportunityContext: input.opportunityContext,
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    narrationContext: input.narrationContext,
  }).narrations;
}
