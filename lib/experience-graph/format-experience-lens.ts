import {
  experienceEventTypeById,
  type ExperienceEventTypeId,
} from "@/lib/experience-graph/experience-event-type-spec";
import type { ExperienceLensId } from "@/lib/experience-graph/resolve-experience-lens";

export type ExperienceLensChip = {
  kind: "type" | "lens";
  label: string;
  emoji?: string;
};

export function formatExperienceTypeChip(
  eventType: ExperienceEventTypeId,
): ExperienceLensChip {
  const spec = experienceEventTypeById(eventType);
  return {
    kind: "type",
    label: spec.label,
    emoji: spec.emoji,
  };
}

export function formatExperienceLensChip(input: {
  eventType: ExperienceEventTypeId;
  lens: ExperienceLensId;
}): ExperienceLensChip {
  const spec = experienceEventTypeById(input.eventType);
  return {
    kind: "lens",
    label: spec.lensLabels[input.lens],
  };
}
