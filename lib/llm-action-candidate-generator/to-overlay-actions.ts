import type { CalendarOverlayAction } from "@/lib/calendar/calendar-view-types";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import type { LlmActionCandidateWire } from "@/lib/llm-action-candidate-generator/types";

export function llmCandidatesToOverlayActions(
  candidates: readonly LlmActionCandidateWire[],
  destination?: string | null,
): CalendarOverlayAction[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    source: "projection" as const,
    action_tier: candidate.category_hint === "main" ? "MAIN" : "AUX",
    plugin: candidate.plugin,
    deeplink: resolvePluginDeeplink(candidate.plugin, {
      label: candidate.label,
      destination,
    }),
  }));
}

export function mergeOverlayActionPools(
  base: readonly CalendarOverlayAction[],
  extra: readonly CalendarOverlayAction[],
): CalendarOverlayAction[] {
  const merged = [...base];
  for (const item of extra) {
    if (
      merged.some(
        (existing) =>
          existing.id === item.id ||
          existing.label === item.label ||
          (existing.plugin && existing.plugin === item.plugin && item.plugin !== "search.web"),
      )
    ) {
      continue;
    }
    merged.push(item);
  }
  return merged;
}
