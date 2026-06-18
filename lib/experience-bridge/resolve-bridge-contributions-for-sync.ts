import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";

/** Prefer plan payload contributions; fall back to dedicated GET. */
export function resolveBridgeContributionsForSync(input: {
  fromPlan: readonly ExperienceBridgeContribution[];
  fromDedicated?: readonly ExperienceBridgeContribution[] | null;
}): ExperienceBridgeContribution[] {
  if (input.fromPlan.length > 0) {
    return [...input.fromPlan];
  }
  return [...(input.fromDedicated ?? [])];
}
