import type { GuardrailActionType, EventCriticality } from "@/lib/safety/types";
import type { PersistentEvent } from "@/lib/context-resolver/types";

export enum RiskLevel {
  LOW = 20,
  MEDIUM = 50,
  HIGH = 90,
}

export type RiskAssessment = {
  score: number;
  level: RiskLevel;
};

const DESTRUCTIVE_ACTIONS: GuardrailActionType[] = [
  "DELETE",
  "CANCEL",
  "TRANSFER_FUNDS",
  "BLOCK",
];

export function assessRisk(
  action: GuardrailActionType,
  event: PersistentEvent & { criticality?: EventCriticality }
): RiskAssessment {
  let score = RiskLevel.LOW;

  const criticality = event.criticality ?? "LOW";
  if (criticality === "HIGH") {
    score += 50;
  }

  if (DESTRUCTIVE_ACTIONS.includes(action)) {
    score += 30;
  }

  if (score >= RiskLevel.HIGH) {
    return { score, level: RiskLevel.HIGH };
  }
  if (score >= RiskLevel.MEDIUM) {
    return { score, level: RiskLevel.MEDIUM };
  }
  return { score, level: RiskLevel.LOW };
}

export function exceedsGuardrailThreshold(score: number): boolean {
  return score >= 80;
}
