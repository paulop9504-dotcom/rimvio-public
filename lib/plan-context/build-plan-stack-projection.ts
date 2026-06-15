import type { ActionSpawnPhase } from "@/lib/action-spawn/types";
import { resolveLifecycleSpawnPhase } from "@/lib/action-spawn/resolve-lifecycle-phase";
import type {
  CalendarOverlayAction,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";
import { compilePlanDepartureLeg } from "@/lib/plan-context/compile-plan-departure-leg";
import type { TrafficContext, WeatherContext } from "@/lib/context-resolver/types";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import type { PlanStackLeg, PlanStackProjection } from "@/lib/plan-context/plan-stack-types";

const TRAVEL_SIGNAL = /(?:여행|출국|제주|오사카|해외|trip|flight|호텔|숙소|공항)/iu;
const BEFORE_PHASES = new Set<ActionSpawnPhase>(["prep", "travel", "day_start"]);

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function isTravelPlan(plan: PlanContext, row: UnifiedCalendarOverlayRow): boolean {
  const blob = [plan.title, plan.place, row.event.title].filter(Boolean).join(" ");
  return TRAVEL_SIGNAL.test(blob);
}

function dedupeLegs(legs: PlanStackLeg[]): PlanStackLeg[] {
  const seen = new Set<string>();
  const out: PlanStackLeg[] = [];
  for (const leg of legs) {
    const key = leg.label.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(leg);
  }
  return out;
}

function overlayToLeg(
  action: CalendarOverlayAction,
  band: PlanStackLeg["band"],
  spawnPhase?: ActionSpawnPhase,
): PlanStackLeg {
  return {
    id: `overlay:${action.id}`,
    band,
    label: action.label,
    hint: action.ranking_why ?? action.secondary_reason ?? null,
    overlayActionId: action.id,
    spawnPhase,
  };
}

function ruleBeforeLegs(
  plan: PlanContext,
  row: UnifiedCalendarOverlayRow,
  spawnPhase: ActionSpawnPhase,
  minutesUntilStart: number | null,
): PlanStackLeg[] {
  const legs: PlanStackLeg[] = [];
  const travel = isTravelPlan(plan, row);

  if (spawnPhase === "travel") {
    legs.push({
      id: "rule:before:travel",
      band: "before",
      label: "이동·출발 준비",
      hint: row.prompt_hint ?? "이동 시간을 확인했어요",
      spawnPhase,
    });
  } else if (travel && (spawnPhase === "prep" || spawnPhase === "day_start")) {
    legs.push({
      id: "rule:before:prep",
      band: "before",
      label: "여행 전 준비",
      hint: "짐·서류·교통 확인",
      spawnPhase,
    });
  } else if (minutesUntilStart != null && minutesUntilStart > 60) {
    legs.push({
      id: "rule:before:upcoming",
      band: "before",
      label: "출발 전 확인",
      hint: row.prompt_hint ?? null,
      spawnPhase,
    });
  }

  return legs;
}

function ruleAfterLegs(plan: PlanContext, row: UnifiedCalendarOverlayRow): PlanStackLeg[] {
  if (!plan.windowEndIso) {
    return [];
  }

  const legs: PlanStackLeg[] = [];
  const travel = isTravelPlan(plan, row);

  if (travel) {
    legs.push({
      id: "rule:after:return",
      band: "after",
      label: "귀가·마무리",
      hint: "체크아웃·공항 이동",
      spawnPhase: "on_site",
    });
    if ((plan.nights ?? 0) >= 2) {
      legs.push({
        id: "rule:after:checkout",
        band: "after",
        label: "숙소 체크아웃",
        hint: plan.place ?? null,
        spawnPhase: "on_site",
      });
    }
  } else {
    legs.push({
      id: "rule:after:wrap",
      band: "after",
      label: "마무리",
      hint: "일정 종료 후 정리",
      spawnPhase: "default",
    });
  }

  return legs;
}

function overlayLegsForBand(
  actions: readonly CalendarOverlayAction[],
  band: PlanStackLeg["band"],
  spawnPhase: ActionSpawnPhase,
): PlanStackLeg[] {
  if (!BEFORE_PHASES.has(spawnPhase) && band === "before") {
    return [];
  }
  if (spawnPhase !== "on_site" && band === "after") {
    return actions
      .filter((action) => action.action_tier === "AUX")
      .slice(0, 2)
      .map((action) => overlayToLeg(action, band, spawnPhase));
  }
  if (band === "before") {
    const ranked = [
      ...actions.filter((action) => action.action_tier === "MAIN"),
      ...actions.filter((action) => action.action_tier !== "MAIN"),
    ];
    return ranked.slice(0, 3).map((action) => overlayToLeg(action, band, spawnPhase));
  }
  return [];
}

/** Living plan → before (주황) / after (하늘) legs for feed stack. Pure read. */
export function shouldShowPlanStack(plan: PlanContext | null): boolean {
  if (!plan) {
    return false;
  }
  return Boolean(plan.windowEndIso) || plan.nights != null || plan.windowConfidence !== "open";
}

export function buildPlanStackProjection(input: {
  plan: PlanContext;
  row: UnifiedCalendarOverlayRow;
  now?: Date;
  traffic?: TrafficContext;
  weather?: WeatherContext;
}): PlanStackProjection {
  const now = input.now ?? new Date();
  const startMs = parseMs(input.plan.windowStartIso) ?? input.row.event.startMs;
  const minutesUntilStart =
    startMs != null ? Math.round((startMs - now.getTime()) / 60_000) : null;

  const spawn = resolveLifecycleSpawnPhase(
    {
      title: input.plan.title,
      location: input.plan.place,
      minutes_until_event: minutesUntilStart,
    },
    now,
  );
  const spawnPhase = input.row.spawn_phase ?? spawn.phase;

  const departureLeg = compilePlanDepartureLeg({
    plan: input.plan,
    row: input.row,
    now,
    traffic: input.traffic,
    weather: input.weather,
  });

  const before = dedupeLegs([
    ...(departureLeg ? [departureLeg] : []),
    ...ruleBeforeLegs(input.plan, input.row, spawnPhase, minutesUntilStart),
    ...overlayLegsForBand(input.row.overlayActions, "before", spawnPhase),
  ]).slice(0, 3);

  const after = dedupeLegs([
    ...ruleAfterLegs(input.plan, input.row),
    ...overlayLegsForBand(input.row.overlayActions, "after", spawnPhase),
  ]).slice(0, 2);

  return { before, after };
}
