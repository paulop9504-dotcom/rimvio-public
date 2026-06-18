import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { rankContextHubServices } from "@/lib/globe/context-hub/rank-context-hub-services";

/** Collapsed hub rail — first ranked carousel slot. */
export function resolvePrimaryHubServiceRow(
  services: readonly ContextHubServiceRow[],
): ContextHubServiceRow | null {
  return rankContextHubServices(services)[0] ?? null;
}
