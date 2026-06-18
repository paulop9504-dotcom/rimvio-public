import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { scoreHubServiceRowBase } from "@/lib/globe/context-hub/score-hub-service-row";

/** Browse order in expanded hub panel — not MAIN priority (see rankContextResources). */
export function rankContextHubServices(
  services: readonly ContextHubServiceRow[],
): ContextHubServiceRow[] {
  return [...services]
    .filter((row) => row.offered)
    .sort((left, right) => {
      const delta = scoreHubServiceRowBase(right) - scoreHubServiceRowBase(left);
      if (delta !== 0) {
        return delta;
      }
      return left.labelKo.localeCompare(right.labelKo, "ko");
    });
}
