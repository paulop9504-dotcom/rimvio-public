/** Lifecycle spawn phases — controls which aux set appears (not UI). */

export type ActionSpawnPhase = "day_start" | "travel" | "on_site" | "prep" | "default";

export type SpawnPhaseInput = {
  title: string;
  location?: string | null;
  minutes_until_event?: number | null;
  /** e.g. "commute" | "at_venue" from future location signal */
  proximity?: "far" | "approaching" | "at_venue" | null;
};

export type SpawnPhaseResult = {
  phase: ActionSpawnPhase;
  /** Short nudge copy — bracket context line for UI */
  prompt_hint?: string;
  context_lines: string[];
};
