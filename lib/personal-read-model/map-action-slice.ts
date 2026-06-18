import { listManualCoreTemplates } from "@/lib/action-registry/manual-templates";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { listLearningRollup } from "@/lib/archive/learning-rollup-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { SurfaceReadBundle } from "@/lib/life-read-model/types";
import type { PersonalReadActionSlice } from "@/lib/personal-read-model/types";

const REGISTRY_LIMIT = 12;
const RANKED_MAIN_LIMIT = 3;

function extractSlotNames(prompt: string | undefined): string[] {
  if (!prompt?.trim()) {
    return [];
  }
  const slots: string[] = [];
  if (/확인|체크|check/iu.test(prompt)) {
    slots.push("confirmTarget");
  }
  if (/일정|schedule|calendar/iu.test(prompt)) {
    slots.push("scheduleTarget");
  }
  if (/길찾|navigate|map/iu.test(prompt)) {
    slots.push("place");
  }
  return slots.length > 0 ? slots : ["message"];
}

export function mapActionSlice(input: {
  focusEvent: EventCandidate | null;
  surface: SurfaceReadBundle;
}): PersonalReadActionSlice {
  const registryEntries = listManualCoreTemplates()
    .slice(0, REGISTRY_LIMIT)
    .map((entry) => ({
      id: entry.id,
      contextKey: entry.contextKey,
      category: entry.category,
      scenario: entry.scenario,
      mainActionType: entry.main_action?.type ?? null,
      slotNames: extractSlotNames(entry.main_action?.prompt),
      templateStatus: entry.template_status,
    }));

  const rankedMainCandidates: PersonalReadActionSlice["rankedMainCandidates"] = [];

  for (const entry of input.surface.actionProjection.entries) {
    for (const action of entry.actions) {
      rankedMainCandidates.push({
        actionKey: action.id,
        label: action.label,
        score: 0.7,
        contextKey: entry.ecId,
        source: "registry",
      });
    }
  }

  for (const rollup of listLearningRollup()) {
    rankedMainCandidates.push({
      actionKey: rollup.actionKey,
      label: rollup.label,
      score: rollup.scoreDelta,
      contextKey: rollup.contextKey,
      source: "rollup",
    });
  }

  rankedMainCandidates.sort((a, b) => b.score - a.score);

  const hubServices = listContextHubServicesForEvent(input.focusEvent);

  return {
    registryEntries,
    rankedMainCandidates: rankedMainCandidates.slice(0, RANKED_MAIN_LIMIT),
    hubServiceIds: hubServices?.services.filter((row) => row.offered).map((row) => row.serviceId) ?? [],
  };
}
