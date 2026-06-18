import type { VitalityTag } from "@/lib/vitality/types";

export type VitalityStateKind =
  | "hunger"
  | "energy_depletion"
  | "overload"
  | "priority_confusion"
  | "relationship_longing"
  | "urgency_pressure"
  | "stimulation_lack"
  | "thirst"
  | "sleepiness"
  | "anxiety"
  | "generic_state";

export type VitalityStateProtocol =
  | "food_discovery"
  | "haven_schedule_relief"
  | "sentinel_pause"
  | "apex_golden_path"
  | "nexus_connect"
  | "sentinel_conflict_resolve"
  | "haven_activity_suggest"
  | "haven_hydrate"
  | "haven_rest"
  | "sentinel_calm"
  | "state_router";

export type VitalityStateMatch = {
  kind: VitalityStateKind;
  vitality: VitalityTag;
  protocol: VitalityStateProtocol;
  label: string;
  confidence: number;
};
