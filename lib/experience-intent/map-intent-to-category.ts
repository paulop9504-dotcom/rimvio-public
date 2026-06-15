import type { EventCandidateCategory } from "@/lib/events/event-candidate";
import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";

/** Ingress parity — canonical intent → locked EventCandidate.category. */
export function mapIntentToCategory(intent: ExperienceIntent): EventCandidateCategory {
  switch (intent) {
    case "travel":
      return "travel";
    case "business":
    case "meeting":
      return "work";
    case "food":
    case "date":
      return "food";
    case "wedding":
    case "birthday":
    case "family":
    case "funeral":
      return "social";
    case "hospital":
    case "school":
    case "concert":
    case "sports":
    case "other":
      return "schedule";
    default:
      return "schedule";
  }
}
