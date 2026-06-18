import { computeContextualEventActions } from "@/lib/action-projection/compute-contextual-event-actions";
import type { ActionProjectionResult } from "@/lib/action-projection/types";
import type { ContainerReworkResult } from "@/lib/container-rework/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { projectTimelineDisplayFromRoutes } from "@/lib/timeline-projection/project-display-from-routes";

export function composeActionProjectionFromRoutes(
  routes: ContainerReworkResult,
  resolveEvent: (id: string) => EventCandidate | null,
  now: Date,
): ActionProjectionResult {
  const timeline = projectTimelineDisplayFromRoutes(routes, resolveEvent, { now });
  const entries = timeline.flatMap((section) =>
    section.items.flatMap((item) => {
      if (!item.startAt) {
        return [];
      }
      const actions = computeContextualEventActions({
        ecId: item.ecId,
        title: item.title,
        startAt: item.startAt,
        now,
      });
      if (actions.length === 0) {
        return [];
      }
      return [
        {
          ecId: item.ecId,
          title: item.title,
          startAt: item.startAt,
          actions,
        },
      ];
    }),
  );

  return {
    computedAt: now.toISOString(),
    entries,
  };
}
