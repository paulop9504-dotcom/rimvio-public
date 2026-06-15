import { formatLeaveTimeClock } from "@/lib/context-resolver/leave-time-engine";
import { computeLeaveTime } from "@/lib/context-resolver/leave-time-engine";
import type {
  ContextSnapshot,
  PersistentEvent,
  TrafficContext,
  WeatherContext,
} from "@/lib/context-resolver/types";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import { buildTmapNavigateHref } from "@/lib/actions/domain-deep-links";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import type { PlanStackLeg } from "@/lib/plan-context/plan-stack-types";
import { resolveSyncTrafficContext } from "@/lib/plan-context/resolve-sync-traffic-context";

const TRAVEL_SIGNAL = /(?:여행|출국|제주|오사카|해외|trip|flight|호텔|숙소|공항|역|미팅|약속)/iu;
const DEPARTURE_WINDOW_MIN = 180;

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function isDepartureEligible(plan: PlanContext, row: UnifiedCalendarOverlayRow): boolean {
  const blob = [plan.title, plan.place, row.event.title].filter(Boolean).join(" ");
  return TRAVEL_SIGNAL.test(blob);
}

function persistentEventFromPlan(
  plan: PlanContext,
  row: UnifiedCalendarOverlayRow,
): PersistentEvent | null {
  const location = plan.place?.trim() || row.event.title.trim();
  const startTime = plan.windowStartIso?.trim();
  if (!location || !startTime) {
    return null;
  }
  return {
    id: plan.planId ?? row.event.eventId ?? `plan:${row.id}`,
    title: plan.title,
    start_time: startTime,
    location,
    origin_hint: null,
  };
}

function defaultWeatherContext(): WeatherContext {
  return {
    condition: "clear",
    summary: "맑음",
    is_unpleasant: false,
  };
}

function buildSyncContext(
  event: PersistentEvent,
  now: Date,
  trafficOverride?: TrafficContext,
  weatherOverride?: WeatherContext,
): ContextSnapshot {
  const meetingMs = parseMs(event.start_time) ?? now.getTime();
  const minutesUntil = Math.max(0, Math.round((meetingMs - now.getTime()) / 60_000));
  const traffic = trafficOverride ?? resolveSyncTrafficContext(event.location);

  return {
    resolved_at: now.toISOString(),
    weather: weatherOverride ?? defaultWeatherContext(),
    traffic,
    location: { label: event.location },
    calendar: {
      current_time: now.toISOString(),
      minutes_until_event: minutesUntil,
      event_title: event.title,
    },
  };
}

/**
 * Rule-engine departure leg for feed plan stack (before / 주황).
 * Mirrors compileTravelAction without async providers.
 */
export function compilePlanDepartureLeg(input: {
  plan: PlanContext;
  row: UnifiedCalendarOverlayRow;
  now?: Date;
  traffic?: TrafficContext;
  weather?: WeatherContext;
}): PlanStackLeg | null {
  const now = input.now ?? new Date();
  if (!isDepartureEligible(input.plan, input.row)) {
    return null;
  }

  const event = persistentEventFromPlan(input.plan, input.row);
  if (!event) {
    return null;
  }

  const startMs = parseMs(event.start_time);
  if (startMs === null) {
    return null;
  }

  const minutesUntilStart = Math.round((startMs - now.getTime()) / 60_000);
  if (minutesUntilStart <= 0 || minutesUntilStart > DEPARTURE_WINDOW_MIN) {
    return null;
  }

  const context = buildSyncContext(event, now, input.traffic, input.weather);
  const leave = computeLeaveTime({ event, context, now });
  if (now.getTime() < leave.show_at.getTime()) {
    return null;
  }

  const notes: string[] = [];
  if (context.weather.is_unpleasant || context.weather.condition === "rain") {
    notes.push("비");
  }
  if (context.traffic.delay_minutes > 0) {
    notes.push(`지연 ${context.traffic.delay_minutes}분`);
  }
  notes.push(`이동 ${context.traffic.travel_minutes}분`);
  notes.push(`${formatLeaveTimeClock(leave.show_at)} 출발`);

  return {
    id: "rule:before:departure",
    band: "before",
    label: "지금 출발해야 합니다",
    hint: notes.join(" · "),
    spawnPhase: "travel",
    deeplink: buildTmapNavigateHref(event.location),
  };
}
