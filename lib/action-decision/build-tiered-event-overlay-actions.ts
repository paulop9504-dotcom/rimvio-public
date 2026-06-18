import { applyMainAuxToOverlayActions } from "@/lib/action-decision/apply-tier-to-overlay";
import { computeContextualEventActions } from "@/lib/action-projection/compute-contextual-event-actions";
import { resolveLifecycleSpawnPhase } from "@/lib/action-spawn/resolve-lifecycle-phase";
import { buildArchiveContextKey } from "@/lib/archive/build-archived-event";
import { readLifeProjections } from "@/lib/life-read-model";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import {
  filterCandidatesForPlanGate,
  inferPlanMode,
  resolvePlanSignalGate,
} from "@/lib/plan-context/resolve-plan-signal-gate";
import {
  generateActionCandidatesSync,
  isLlmCandidateDomainEnabled,
  llmCandidatesToOverlayActions,
  mergeOverlayActionPools,
  type LlmActionCandidateWire,
} from "@/lib/llm-action-candidate-generator";
import type {
  CalendarEventChip,
  CalendarOverlayAction,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";

function startAtFromChip(event: CalendarEventChip): string {
  const hour = String(event.hour).padStart(2, "0");
  const minute = String(event.minute).padStart(2, "0");
  if (event.hasTime) {
    return `${event.dateKey}T${hour}:${minute}:00`;
  }
  return `${event.dateKey}T09:00:00`;
}

function projectedToOverlayActions(
  projected: ReturnType<typeof computeContextualEventActions>,
): CalendarOverlayAction[] {
  return projected.map((action) => ({
    id: action.id,
    label: action.label,
    source: "projection" as const,
    projectedAction: action,
  }));
}

export type BuildTieredEventOverlayActionsInput = {
  ecId: string;
  title: string;
  startAt: string;
  startMs: number;
  now?: Date;
  streamActions?: readonly CalendarOverlayAction[];
  llmCandidates?: readonly LlmActionCandidateWire[];
  ranking_context_key?: string;
};

function rankingContextKeyForEcId(ecId: string, explicit?: string): string | undefined {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  const event =
    readLifeProjections().events.find((candidate) => candidate.id === ecId) ?? null;
  return event ? buildArchiveContextKey(event) : undefined;
}

/**
 * Single MAIN/AUX + phase derive path for prep surface and Action Calendar engine.
 * @see computeContextualEventActions + applyMainAuxToOverlayActions
 */
export function buildTieredEventOverlayActions(
  input: BuildTieredEventOverlayActionsInput,
): CalendarOverlayAction[] {
  const now = input.now ?? new Date();
  const deltaMs = input.startMs - now.getTime();
  const minutesUntil = Math.round(deltaMs / 60_000);
  const placeHint = input.title.match(/(?:강남역|[^\s]{2,8}역)/u)?.[0] ?? null;

  const projected = computeContextualEventActions({
    ecId: input.ecId,
    title: input.title,
    startAt: input.startAt,
    now,
  });

  const spawn = resolveLifecycleSpawnPhase(
    {
      title: input.title,
      location: placeHint,
      minutes_until_event: minutesUntil,
    },
    now,
  );

  const planEvent =
    readLifeProjections().events.find((candidate) => candidate.id === input.ecId) ?? null;
  const planContext = planEvent ? readPlanContextFromEvent(planEvent) : null;
  const planMode = inferPlanMode(planContext);

  const creativeSync = generateActionCandidatesSync(input.ecId, {
    title: input.title,
    location: placeHint,
    minutes_until_event: minutesUntil,
    spawn_phase: spawn.phase,
    planMode,
  });

  const gate = resolvePlanSignalGate(planContext);
  const gatedSync = filterCandidatesForPlanGate(creativeSync.candidates, gate);
  const gatedLlm = filterCandidatesForPlanGate(input.llmCandidates ?? [], gate);
  const creativePool = [...gatedSync, ...gatedLlm];
  const hasCreativePool =
    isLlmCandidateDomainEnabled(creativeSync.domain) && creativePool.length > 0;

  if (projected.length === 0 && !hasCreativePool) {
    return [];
  }

  const projectedOverlays = projectedToOverlayActions(projected);
  const creativeOverlays = llmCandidatesToOverlayActions(creativePool, placeHint);

  const streamOverlays =
    deltaMs <= 2 * 60 * 60 * 1000
      ? (input.streamActions ?? []).filter((action) => action.source === "stream")
      : [];

  let merged = mergeOverlayActionPools(projectedOverlays, creativeOverlays);
  for (const stream of streamOverlays) {
    merged = mergeOverlayActionPools(merged, [stream]);
  }

  return applyMainAuxToOverlayActions({
    actions: merged,
    minutes_until_event: minutesUntil,
    ranking_context_key: rankingContextKeyForEcId(input.ecId, input.ranking_context_key),
    event: {
      title: input.title,
      location: placeHint,
      minutes_until_event: minutesUntil,
      spawn_phase: spawn.phase,
    },
  });
}

export function enrichCalendarRowWithTieredActions(
  row: UnifiedCalendarOverlayRow,
  now: Date,
  options: { llmCandidates?: readonly LlmActionCandidateWire[] } = {},
): UnifiedCalendarOverlayRow | null {
  if (row.event.layer !== "event" || !row.event.eventId) {
    return null;
  }

  const tieredActions = buildTieredEventOverlayActions({
    ecId: row.event.eventId,
    title: row.event.title,
    startAt: startAtFromChip(row.event),
    startMs: row.event.startMs,
    now,
    streamActions: row.overlayActions,
    llmCandidates: options.llmCandidates,
  });

  if (tieredActions.length === 0) {
    return null;
  }

  const spawn = resolveLifecycleSpawnPhase(
    {
      title: row.event.title,
      location: row.event.title.match(/(?:강남역|[^\s]{2,8}역)/u)?.[0] ?? null,
      minutes_until_event: Math.round((row.event.startMs - now.getTime()) / 60_000),
    },
    now,
  );

  return {
    ...row,
    overlayActions: tieredActions,
    context_lines: spawn.context_lines,
    prompt_hint: spawn.prompt_hint,
    spawn_phase: spawn.phase,
  };
}
