import { composeActionProjection } from "@/lib/action-projection/compose-action-projection";
import type { ActionProjectionResult } from "@/lib/action-projection/types";

let revision = 0;
let cache: {
  revision: number;
  timeBucket: number;
  result: ActionProjectionResult;
} | null = null;

function timeBucket(now: Date): number {
  return Math.floor(now.getTime() / (60 * 1000));
}

export function invalidateActionProjection(): void {
  revision += 1;
  cache = null;
}

export function getActionProjection(now = new Date()): ActionProjectionResult {
  const bucket = timeBucket(now);
  if (cache && cache.revision === revision && cache.timeBucket === bucket) {
    return cache.result;
  }
  const result = composeActionProjection({ now });
  cache = { revision, result, timeBucket: bucket };
  return result;
}

export function resetActionProjectionCacheForTests(): void {
  revision = 0;
  cache = null;
}

export function getActionProjectionRevision(): number {
  return revision;
}
