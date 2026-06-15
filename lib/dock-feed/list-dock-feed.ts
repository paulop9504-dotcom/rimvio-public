import { readSurface } from "@/lib/life-read-model";
import type { DockFeedContext, DockFeedResult } from "@/lib/dock-feed/types";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  DockCard,
  DockFeedContext,
  DockFeedResult,
  DockRenderMode,
  PriorityVisualState,
  ContainerOrigin,
} from "@/lib/dock-feed/types";

export { composeDockFeed } from "@/lib/dock-feed/compose-dock-feed";

/** Full decision stack → Netflix-style Dock feed (read-only). */
export function listDockFeedFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  dockContext?: DockFeedContext;
} = {}): DockFeedResult {
  return readSurface({
    opportunityContext: input.opportunityContext,
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    dockContext: input.dockContext,
  }).dockFeed;
}
