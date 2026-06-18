import { composeActionProjectionFromRoutes } from "@/lib/life-read-model/compose-action-from-routes";
import { createEventResolver } from "@/lib/life-read-model/create-event-resolver";
import { readLifeProjections } from "@/lib/life-read-model/read-life-projections";
import type { SurfaceReadBundle, SurfaceReadInput } from "@/lib/life-read-model/types";
import { composeDockFeed } from "@/lib/dock-feed/compose-dock-feed";
import { composeNarrations } from "@/lib/narration-engine/compose-narrations";
import { mergeDecisionEntries } from "@/lib/container-rework/types";
import { listNotificationExecutions } from "@/lib/notification-shadow/list-notification-executions";
import { listEventBehaviors } from "@/lib/behavior-engine/list-event-behaviors";
import { listRankedEventOpportunities } from "@/lib/opportunity-engine/rank-event-opportunities";
import { routeFromDecisionLayers } from "@/lib/container-rework/list-container-routes";
import { projectTimelineDisplayFromRoutes } from "@/lib/timeline-projection/project-display-from-routes";

const EMPTY_ACTION_PROJECTION = { computedAt: new Date(0).toISOString(), entries: [] };

/**
 * Single UI read frame: life projections + decision routes + surface payloads.
 */
export function readSurface(input: SurfaceReadInput = {}): SurfaceReadBundle {
  const life = readLifeProjections({ dateKey: input.dateKey });
  const resolveEvent = createEventResolver(life.events);
  const now =
    input.timelineContext?.now ??
    input.opportunityContext?.now ??
    input.notificationContext?.now ??
    new Date();

  const opportunityContext = { ...input.opportunityContext, now };
  const opportunities = listRankedEventOpportunities(opportunityContext, life.events);
  const behaviors = listEventBehaviors(opportunityContext, input.behaviorContext ?? {});
  const notifications = listNotificationExecutions(behaviors, {
    ...input.notificationContext,
    now,
  });

  if (behaviors === "NO_ACTION") {
    return {
      life,
      routes: "NO_ACTION",
      timeline: [],
      dockFeed: [],
      narrations: [],
      actionProjection: { ...EMPTY_ACTION_PROJECTION, computedAt: now.toISOString() },
    };
  }

  const routes = routeFromDecisionLayers({
    opportunities,
    behaviors,
    notifications: notifications === "NO_ACTION" ? [] : notifications,
    ui: {
      dockVisible: input.dockContext?.dockVisible ?? input.notificationContext?.dockVisible,
      chatVisible: input.notificationContext?.chatVisible,
      timelineVisible: input.timelineContext?.timelineVisible,
      focusedEcId:
        input.timelineContext?.focusedEcId ??
        input.behaviorContext?.focusedEcId ??
        input.opportunityContext?.focusedEcId ??
        input.notificationContext?.dockFocusedEcId,
    },
  });

  if (routes === "NO_ACTION") {
    return {
      life,
      routes,
      timeline: [],
      dockFeed: [],
      narrations: [],
      actionProjection: { ...EMPTY_ACTION_PROJECTION, computedAt: now.toISOString() },
    };
  }

  const timeline = projectTimelineDisplayFromRoutes(routes, resolveEvent, {
    focusedEcId: input.timelineContext?.focusedEcId,
    recentEcIds:
      input.timelineContext?.recentEcIds ?? input.behaviorContext?.recentEcIds,
    now,
  });

  const dockFeed = composeDockFeed(routes, resolveEvent, {
    focusedEcId: input.dockContext?.focusedEcId,
    recentEcIds:
      input.dockContext?.recentEcIds ?? input.behaviorContext?.recentEcIds,
    scrollPosition: input.dockContext?.scrollPosition,
    dockVisible: input.dockContext?.dockVisible,
  });

  const entries = mergeDecisionEntries({
    opportunities,
    behaviors,
    notifications: notifications === "NO_ACTION" ? [] : notifications,
  });

  const narrations = composeNarrations(entries, routes, resolveEvent, {
    focusedEcId: input.narrationContext?.focusedEcId ?? input.behaviorContext?.focusedEcId,
    recentEcIds:
      input.narrationContext?.recentEcIds ?? input.behaviorContext?.recentEcIds,
    now,
  });

  const actionProjection = composeActionProjectionFromRoutes(
    routes,
    resolveEvent,
    now,
  );

  return {
    life,
    routes,
    timeline,
    dockFeed,
    narrations,
    actionProjection,
  };
}
