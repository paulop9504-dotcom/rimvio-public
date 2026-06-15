import type { LearningEngineState } from "@/lib/learning/learning-types";

const ALLOWED: Record<LearningEngineState, readonly LearningEngineState[]> = {
  idle: ["ingesting", "replaying"],
  ingesting: ["idle"],
  replaying: ["idle"],
};

export function canLearningTransition(
  from: LearningEngineState,
  to: LearningEngineState,
): boolean {
  return ALLOWED[from].includes(to);
}

export function assertLearningTransition(
  from: LearningEngineState,
  to: LearningEngineState,
): void {
  if (!canLearningTransition(from, to)) {
    throw new Error(`Invalid learning transition: ${from} → ${to}`);
  }
}
