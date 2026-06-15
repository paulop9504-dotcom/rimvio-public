import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ActionProjectionResult } from "@/lib/action-projection/types";
import type { ContainerReworkResult } from "@/lib/container-rework/types";
import type { DockFeedResult } from "@/lib/dock-feed/types";
import type { NarrationResult } from "@/lib/narration-engine/types";
import type { TimelineProjectionResult } from "@/lib/timeline-projection/types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type { RimvioReminderWire } from "@/lib/source-of-truth/project-truth";
import type { DisplayRoutesContext } from "@/lib/projection-stack/list-display-routes-from-store";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";
import type { TimelineProjectionContext } from "@/lib/timeline-projection/types";
import type { DockFeedContext } from "@/lib/dock-feed/types";
import type { NarrationContext } from "@/lib/narration-engine/types";

export type LifeProjectionsInput = {
  dateKey?: string;
};

export type LifeProjections = {
  events: EventCandidate[];
  existingSchedule: ExistingScheduleInput;
  allReminders: RimvioReminderWire[];
  dateKey: string;
};

export type SurfaceReadInput = DisplayRoutesContext & {
  dateKey?: string;
  timelineContext?: TimelineProjectionContext;
  dockContext?: DockFeedContext;
  narrationContext?: NarrationContext;
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
};

export type SurfaceReadBundle = {
  /** Shared life projections for the same read frame. */
  life: LifeProjections;
  routes: ContainerReworkResult;
  timeline: TimelineProjectionResult;
  dockFeed: DockFeedResult;
  narrations: NarrationResult;
  actionProjection: ActionProjectionResult;
};
