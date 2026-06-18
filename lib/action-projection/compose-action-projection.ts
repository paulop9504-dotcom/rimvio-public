import type { ActionProjectionResult } from "@/lib/action-projection/types";
import { readSurface } from "@/lib/life-read-model";

/**
 * Action Projection — display overlay from routes (parallel to timeline view).
 * Does not read timeline list API; does not write SSOT or schedule.
 */
export function composeActionProjection(input?: {
  now?: Date;
}): ActionProjectionResult {
  const now = input?.now ?? new Date();
  return readSurface({ timelineContext: { now } }).actionProjection;
}