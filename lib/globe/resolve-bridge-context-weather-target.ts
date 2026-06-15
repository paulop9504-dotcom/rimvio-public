import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { PlanWeatherTarget } from "@/lib/plan-context/resolve-plan-weather-target";

/** Bridge context tab — forecast at experience place (now, for revisit prep). */
export function resolveBridgeContextWeatherTarget(
  event: EventCandidate,
): PlanWeatherTarget | null {
  const plan = readPlanContextFromEvent(event);
  const location =
    plan?.place?.trim() || event.place?.trim() || event.title.trim();
  if (!location) {
    return null;
  }

  const targetIso = new Date().toISOString();

  return {
    location,
    targetIso,
  };
}
