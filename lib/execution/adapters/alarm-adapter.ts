import type { ExecutionAdapter } from "@/lib/execution/adapters/adapter-contract";
import { applyExecutionUri } from "@/lib/execution/adapters/apply-uri";
import {
  buildAlarmPrompt,
  buildCalendarPrompt,
  buildCheckinHandoff,
  buildFlightHandoff,
  buildGenericPrompt,
  buildHotelHandoff,
  buildSearchGoogle,
} from "@/lib/execution/adapters/internal/provider-urls";
import { failureResult, successResult } from "@/lib/execution/execution-result";

export const alarmAdapter: ExecutionAdapter = {
  id: "alarm-adapter",
  capabilityIds: [
    "ALARM",
    "CALENDAR",
    "OPEN_EVENT",
    "BOOK_FLIGHT",
    "BOOK_HOTEL",
    "CHECK_IN",
    "SEARCH",
    "CLARIFY_GOAL",
    "DISMISS_SURFACE",
    "LINK",
  ],
  buildPayload(input) {
    const { capabilityId, inputs } = input;
    let uri: string;
    switch (capabilityId) {
      case "ALARM":
        uri = buildAlarmPrompt(inputs);
        break;
      case "CALENDAR":
      case "OPEN_EVENT":
        uri = buildCalendarPrompt(inputs);
        break;
      case "BOOK_FLIGHT":
        uri = buildFlightHandoff();
        break;
      case "BOOK_HOTEL":
        uri = buildHotelHandoff();
        break;
      case "CHECK_IN":
        uri = buildCheckinHandoff();
        break;
      case "SEARCH":
      case "CLARIFY_GOAL":
        uri = buildSearchGoogle(inputs) ?? buildGenericPrompt(inputs, "search");
        break;
      case "LINK":
        uri = inputs.url?.trim() ?? "rimvio://link";
        break;
      case "DISMISS_SURFACE":
        uri = buildGenericPrompt(inputs, "dismiss");
        break;
      default:
        uri = buildGenericPrompt(inputs, capabilityId.toLowerCase());
    }
    return { uri };
  },
  execute(payload, context) {
    const uri = payload.uri;
    if (!uri) {
      return failureResult("missing_alarm_uri");
    }
    applyExecutionUri(uri, context);
    return successResult({ uri, message: "prompt_executed" });
  },
};
