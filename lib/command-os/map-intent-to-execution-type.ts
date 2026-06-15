import type { EventIntent } from "@/lib/command-os/command-os-types";
import type { ReviewExecutionType } from "@/lib/event-os/review-execution-types";

export function mapIntentToExecutionType(
  intent: EventIntent
): ReviewExecutionType {
  switch (intent) {
    case "CREATE_EVENT":
      return "command";
    case "OPEN_WINDOW":
      return "search";
    case "ACTION_QUERY":
      return "action";
    case "SEARCH":
      return "search";
    default:
      return "search";
  }
}
