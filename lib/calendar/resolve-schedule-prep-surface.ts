import { enrichCalendarRowWithTieredActions } from "@/lib/action-decision/build-tiered-event-overlay-actions";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { LlmActionCandidateWire } from "@/lib/llm-action-candidate-generator";

const MS_36H = 36 * 60 * 60 * 1000;
const MS_2H_PAST = 2 * 60 * 60 * 1000;

export type SchedulePrepSurfaceOptions = {
  llmCandidatesByRowId?: Readonly<Record<string, readonly LlmActionCandidateWire[]>>;
};

export type SchedulePrepSurfacePhase = "preparation" | "execution" | "at_event" | "mixed";

export type SchedulePrepSurface = {
  visible: boolean;
  rows: UnifiedCalendarOverlayRow[];
  phase: SchedulePrepSurfacePhase;
  title: string;
};

/** Whether the compact prep board may appear for this event time. */
export function isEventInPrepSurfaceWindow(startMs: number, now: Date): boolean {
  const deltaMs = startMs - now.getTime();
  return deltaMs <= MS_36H && deltaMs >= -MS_2H_PAST;
}

function inferSurfacePhase(
  rows: readonly UnifiedCalendarOverlayRow[],
): SchedulePrepSurfacePhase {
  const phases = new Set(
    rows.flatMap((row) =>
      row.overlayActions
        .map((action) => action.projectedAction?.phase)
        .filter((phase): phase is NonNullable<typeof phase> => Boolean(phase)),
    ),
  );

  if (phases.has("T-24h") && (phases.has("T-2h") || phases.has("T-departure"))) {
    return "mixed";
  }
  if (phases.has("T-24h")) {
    return "preparation";
  }
  if (phases.has("T-2h") || phases.has("T-departure")) {
    return "execution";
  }
  if (phases.has("AT_EVENT")) {
    return "at_event";
  }
  return "mixed";
}

function titleForPhase(phase: SchedulePrepSurfacePhase): string {
  switch (phase) {
    case "preparation":
      return "일정 준비";
    case "execution":
    case "at_event":
      return "출발 준비";
    default:
      return "다가오는 일정";
  }
}

/**
 * Compact chat prep board — only when auxiliary actions are needed now.
 * Auto-hides when events are too far away or already finished.
 */
export function resolveSchedulePrepSurface(
  rows: readonly UnifiedCalendarOverlayRow[],
  now = new Date(),
  options: SchedulePrepSurfaceOptions = {},
): SchedulePrepSurface {
  const qualified: UnifiedCalendarOverlayRow[] = [];

  for (const row of rows) {
    if (!isEventInPrepSurfaceWindow(row.event.startMs, now)) {
      continue;
    }

    const llmExtra = options.llmCandidatesByRowId?.[row.id] ?? [];
    const enriched = enrichCalendarRowWithTieredActions(row, now, {
      llmCandidates: llmExtra,
    });

    if (!enriched || enriched.overlayActions.length === 0) {
      continue;
    }

    qualified.push(enriched);
  }

  const phase = inferSurfacePhase(qualified);

  return {
    visible: qualified.length > 0,
    rows: qualified,
    phase,
    title: titleForPhase(phase),
  };
}
