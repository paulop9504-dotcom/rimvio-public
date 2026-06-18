import { BLINK_ACTION_IDS } from "@/lib/actions/blink-feature-actions";
import type { LinkActionItem } from "@/types/database";

const SCHEDULE_BLINK_ACTIONS = new Set<string>([
  BLINK_ACTION_IDS.remindLater,
  BLINK_ACTION_IDS.todoRegister,
  BLINK_ACTION_IDS.deadlineRemind,
  BLINK_ACTION_IDS.workoutTimer,
  BLINK_ACTION_IDS.studyTimer,
  BLINK_ACTION_IDS.morningBriefing,
]);

/** Actions that route through executeScheduledLinkReminder. */
export function isScheduleAction(action: LinkActionItem): boolean {
  if (action.kind === "remind") {
    return true;
  }

  const blinkAction = action.payload?.blinkAction;
  return typeof blinkAction === "string" && SCHEDULE_BLINK_ACTIONS.has(blinkAction);
}
