import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";

export const PLACE_PREFILL_STATE_META_KEY = "placePrefillState";

export type PlacePrefillHubId = Extract<
  ContextHubServiceId,
  "lodging" | "flight" | "ticket"
>;

export type PlacePrefillHubSuggestion = {
  hubId: PlacePrefillHubId;
  labelKo: string;
  score: number;
  executedCount: number;
};

export type PlacePrefillPlan = {
  placeKey: string;
  placeLabel: string;
  headlineKo: string;
  lineKo: string;
  hubs: readonly PlacePrefillHubSuggestion[];
};

export type PlacePrefillState = {
  dismissedAtIso?: string | null;
  appliedAtIso?: string | null;
  lastPlanPlaceKey?: string | null;
};
