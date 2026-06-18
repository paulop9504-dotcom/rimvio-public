import type { ContextResource } from "@/lib/globe/resource/types";
import type { ApiWakeupPhase } from "@/lib/globe/resource/api-wakeup-types";

const STALE_MS: Record<ApiWakeupPhase, number> = {
  cold: Number.POSITIVE_INFINITY,
  warm: 30 * 60 * 1000,
  hot: 5 * 60 * 1000,
};

/** Hot phase + stale last sync → trigger ResourceSyncWorker (future). */
export function isResourceSyncStale(input: {
  resource: ContextResource;
  phase: ApiWakeupPhase;
  now?: Date;
}): boolean {
  if (input.phase === "cold") {
    return false;
  }

  const nowMs = (input.now ?? new Date()).getTime();
  const lastMs = input.resource.lastSyncedAtIso
    ? Date.parse(input.resource.lastSyncedAtIso)
    : NaN;
  const staleMs = STALE_MS[input.phase];

  if (Number.isNaN(lastMs)) {
    return true;
  }

  return nowMs - lastMs >= staleMs;
}
