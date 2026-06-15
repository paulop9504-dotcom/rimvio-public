import {
  isEventInPrepSurfaceWindow,
  resolveSchedulePrepSurface,
  type SchedulePrepSurface,
  type SchedulePrepSurfaceOptions,
} from "@/lib/calendar/resolve-schedule-prep-surface";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import {
  detectCandidateDomain,
  isLlmCandidateDomainEnabled,
  isLlmActionCandidatesEnabled,
  type LlmActionCandidateWire,
} from "@/lib/llm-action-candidate-generator";

export type { SchedulePrepSurface, SchedulePrepSurfaceOptions };

/** @alias resolveSchedulePrepSurface — prep-time compact calendar slice. */
export const buildPrepSurface = resolveSchedulePrepSurface;

export function rowQualifiesForPrepLlm(
  row: UnifiedCalendarOverlayRow,
  now: Date,
): boolean {
  if (!isEventInPrepSurfaceWindow(row.event.startMs, now)) {
    return false;
  }
  const domain = detectCandidateDomain(row.event.title);
  return isLlmCandidateDomainEnabled(domain);
}

export function prepLlmQualifyingKey(
  overlayRows: readonly UnifiedCalendarOverlayRow[],
  now: Date,
  llmEnabled: boolean,
): string {
  if (!llmEnabled) {
    return "";
  }
  return overlayRows
    .filter((row) => rowQualifiesForPrepLlm(row, now))
    .map((row) => `${row.id}:${row.event.title}:${row.event.startMs}`)
    .join("|");
}

export async function fetchPrepLlmCandidatesByRowId(input: {
  overlayRows: readonly UnifiedCalendarOverlayRow[];
  now: Date;
}): Promise<Record<string, LlmActionCandidateWire[]>> {
  const next: Record<string, LlmActionCandidateWire[]> = {};

  await Promise.all(
    input.overlayRows
      .filter((row) => rowQualifiesForPrepLlm(row, input.now))
      .map(async (row) => {
        const minutesUntil = Math.round(
          (row.event.startMs - input.now.getTime()) / 60_000,
        );
        const placeHint =
          row.event.title.match(/(?:강남역|[^\s]{2,8}역)/u)?.[0] ?? null;

        try {
          const response = await fetch("/api/actions/llm-candidates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ec_id: row.event.eventId ?? row.id,
              title: row.event.title,
              location: placeHint,
              minutes_until_event: minutesUntil,
              use_llm: true,
            }),
          });

          if (!response.ok) {
            return;
          }

          const json = (await response.json()) as {
            candidates?: LlmActionCandidateWire[];
          };

          if (json.candidates?.length) {
            next[row.id] = json.candidates;
          }
        } catch {
          /* rules-only fallback in buildPrepSurface */
        }
      }),
  );

  return next;
}

export function isPrepLlmCandidatesEnabled(): boolean {
  return isLlmActionCandidatesEnabled();
}
