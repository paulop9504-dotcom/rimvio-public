import type { ExperienceMode } from "@/lib/experience/types";
import type { ScheduleEventBlock } from "@/lib/schedule/schedule-block-types";

/** Boost keep score for Nexus/Haven social blocks in MEMORY mode. */
export function memoryScheduleKeepBias(
  event: ScheduleEventBlock,
  mode: ExperienceMode
): number {
  if (mode !== "MEMORY") {
    return 0;
  }
  if (event.vitality === "Nexus") {
    return 18;
  }
  if (event.vitality === "Haven") {
    return 10;
  }
  return 0;
}
