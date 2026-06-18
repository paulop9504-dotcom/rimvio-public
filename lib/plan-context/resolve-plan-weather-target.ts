import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";

export type PlanWeatherTarget = {
  location: string;
  targetIso: string;
};

/** Plan-backed slot → forecast location + event start instant. Pure read. */
export function resolvePlanWeatherTarget(
  plan: PlanContext | null,
  row: UnifiedCalendarOverlayRow,
): PlanWeatherTarget | null {
  const location = plan?.place?.trim() || row.event.title.trim();
  if (!location) {
    return null;
  }

  const startIso = plan?.windowStartIso?.trim();
  const targetMs =
    startIso && !Number.isNaN(Date.parse(startIso))
      ? Date.parse(startIso)
      : row.event.startMs;

  if (!targetMs || Number.isNaN(targetMs)) {
    return null;
  }

  return {
    location,
    targetIso: new Date(targetMs).toISOString(),
  };
}

export function planWeatherTargetKey(target: PlanWeatherTarget): string {
  return `${target.location}|${target.targetIso}`;
}
