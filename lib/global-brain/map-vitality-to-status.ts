import type { UserStatusRecord, UserStatusFlag } from "@/lib/global-brain/types";
import type { VitalityStateMatch } from "@/lib/vitality-state/vitality-state-types";

const KIND_TO_FLAG: Record<string, UserStatusFlag> = {
  hunger: "hungry",
  energy_depletion: "tired",
  sleepiness: "tired",
  overload: "stressed",
  anxiety: "anxious",
  urgency_pressure: "urgent",
  relationship_longing: "lonely",
  stimulation_lack: "bored",
  priority_confusion: "overloaded",
  generic_state: "neutral",
};

export function mapVitalityMatchToUserStatus(
  match: VitalityStateMatch,
  sourceMessage: string
): UserStatusRecord {
  const flag = KIND_TO_FLAG[match.kind] ?? "neutral";
  return {
    flag,
    label: match.label,
    vitality: match.vitality,
    sourceMessage: sourceMessage.trim().slice(0, 120),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
  };
}
