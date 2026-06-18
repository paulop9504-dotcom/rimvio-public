import type { ActionSpawnPhase } from "@/lib/action-spawn/types";

export type PlanStackBand = "before" | "after";

export type PlanStackLeg = {
  id: string;
  band: PlanStackBand;
  label: string;
  hint?: string | null;
  overlayActionId?: string;
  deeplink?: string | null;
  spawnPhase?: ActionSpawnPhase;
};

export type PlanStackProjection = {
  before: PlanStackLeg[];
  after: PlanStackLeg[];
};
