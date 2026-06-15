import type { LearningObservation } from "@/lib/learning/learning-contract";

const STREAM: LearningObservation[] = [];
const MAX_OBSERVATIONS = 1000;

/** Append-only observation log — learning input, not SSOT. */
export function appendObservation(observation: LearningObservation): void {
  STREAM.push(structuredClone(observation));
  if (STREAM.length > MAX_OBSERVATIONS) {
    STREAM.splice(0, STREAM.length - MAX_OBSERVATIONS);
  }
}

export function listObservations(): readonly LearningObservation[] {
  return STREAM;
}

export function resetObservationStreamForTests(): void {
  STREAM.length = 0;
}
