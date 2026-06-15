import type { ExperienceBurstCandidate } from "@/lib/experience-gravity/cohesion-types";

export const EXPERIENCE_BURST_DETECTED = "rimvio-experience-burst-detected";

export function emitExperienceBurstDetected(burst: ExperienceBurstCandidate) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ExperienceBurstCandidate>(EXPERIENCE_BURST_DETECTED, {
      detail: burst,
    }),
  );
}
