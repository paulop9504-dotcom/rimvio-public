import type { HiddenIntentKind } from "@/lib/action-chat/adaptive-behavior/types";
import type { AdaptiveRoutingHint } from "@/lib/action-chat/adaptive-behavior/types";
import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";

export type VitalityRoutingBias = {
  hint: AdaptiveRoutingHint | null;
  foodWeight: number;
  decisionWeight: number;
  counselingWeight: number;
  scheduleWeight: number;
  simplifyBoost: number;
};

export function resolveVitalityRoutingBias(input: {
  vitalityStates: VitalityStateKind[];
  hiddenIntents: HiddenIntentKind[];
}): VitalityRoutingBias {
  const bias: VitalityRoutingBias = {
    hint: null,
    foodWeight: 0,
    decisionWeight: 0,
    counselingWeight: 0,
    scheduleWeight: 0,
    simplifyBoost: 0,
  };

  for (const kind of input.vitalityStates) {
    switch (kind) {
      case "hunger":
        bias.foodWeight += 0.7;
        break;
      case "energy_depletion":
      case "sleepiness":
        bias.decisionWeight += 0.6;
        bias.simplifyBoost += 0.4;
        break;
      case "anxiety":
        bias.counselingWeight += 0.8;
        bias.decisionWeight += 0.3;
        break;
      case "overload":
        bias.simplifyBoost += 0.9;
        bias.decisionWeight += 0.4;
        break;
      case "priority_confusion":
        bias.decisionWeight += 0.5;
        bias.scheduleWeight += 0.3;
        break;
      case "urgency_pressure":
        bias.scheduleWeight += 0.6;
        break;
      default:
        break;
    }
  }

  if (input.hiddenIntents.includes("anxiety")) {
    bias.counselingWeight += 0.5;
  }
  if (input.hiddenIntents.includes("avoidance")) {
    bias.simplifyBoost += 0.5;
  }
  if (input.hiddenIntents.includes("fatigue")) {
    bias.simplifyBoost += 0.4;
  }

  const hasHunger = input.vitalityStates.includes("hunger");
  const hasStress =
    input.vitalityStates.includes("overload") ||
    input.vitalityStates.includes("anxiety");
  const hasFatigue =
    input.vitalityStates.includes("energy_depletion") ||
    input.vitalityStates.includes("sleepiness");

  if (hasHunger && hasStress) {
    bias.hint = "FOOD_DECISION_MIX";
  } else if (hasFatigue && bias.scheduleWeight >= 0.3) {
    bias.hint = "SCHEDULE_RELIEF";
  } else if (bias.foodWeight >= 0.7) {
    bias.hint = "FOOD";
  } else if (bias.counselingWeight >= 0.8) {
    bias.hint = "COUNSELING";
  } else if (bias.scheduleWeight >= 0.6) {
    bias.hint = "SCHEDULE";
  } else if (bias.decisionWeight >= 0.5) {
    bias.hint = "DECISION";
  }

  return bias;
}
