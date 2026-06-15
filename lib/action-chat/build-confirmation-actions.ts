import { buildActionAgentTaskActions, actionAgentWiresToLinkItems } from "@/lib/action-chat/build-action-agent-task-actions";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import type { LinkActionItem } from "@/types/database";

export function buildActionsFromConfirmationData(
  data: ConfirmationExtractedData,
  sourceMessage?: string | null
): LinkActionItem[] {
  const actions: LinkActionItem[] = [];
  const placeName = sanitizePlaceNameForNavigation(data.place_name, sourceMessage);

  if (data.address || placeName) {
    const taskType = data.address ? "ADDRESS" : "PLACE";
    actions.push(
      ...actionAgentWiresToLinkItems({
        type: taskType,
        extracted_data: {
          address: data.address,
          phone: data.phone,
          datetime: data.datetime,
          place_name: placeName,
          url: data.url,
          schedule_note: null,
        },
        actions: buildActionAgentTaskActions(taskType, {
          address: data.address,
          phone: data.phone,
          datetime: data.datetime,
          place_name: placeName,
          url: data.url,
          schedule_note: null,
        }),
      })
    );
  }

  if (data.phone) {
    actions.push(
      ...actionAgentWiresToLinkItems({
        type: "PHONE",
        extracted_data: {
          address: data.address,
          phone: data.phone,
          datetime: data.datetime,
          place_name: placeName,
          url: data.url,
          schedule_note: null,
        },
        actions: buildActionAgentTaskActions("PHONE", {
          address: data.address,
          phone: data.phone,
          datetime: data.datetime,
          place_name: placeName,
          url: data.url,
          schedule_note: null,
        }),
      })
    );
  }

  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = action.href ?? action.label;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 4);
}
