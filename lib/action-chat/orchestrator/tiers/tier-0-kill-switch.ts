import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";
import { trySystemKillSwitch } from "@/lib/action-chat/orchestrator/try-system-kill-switch";
import {
  buildAffirmativeConfirmReminderResult,
  historyAwaitingConfirmReply,
} from "@/lib/action-chat/resolve-affirmative-confirm";
import { isUserConfirmingActions } from "@/lib/action-chat/action-confidence";
import { hasPendingEventReview } from "@/lib/event-kernel/review/infer-approval-action";

export const TIER_0_KILL_SWITCH_RUNNERS: Phase1TierRunner[] = [
  {
    tier: 0,
    label: "KillSwitch",
    run: () => trySystemKillSwitch(),
  },
  {
    tier: 0,
    label: "KillSwitch",
    detail: "AffirmativeConfirmGuard",
    run: (ctx) => {
      if (!isUserConfirmingActions(ctx.message)) {
        return null;
      }
      if (hasPendingEventReview()) {
        return null;
      }
      if (
        historyAwaitingConfirmReply({
          history: ctx.input.history,
          userMessage: ctx.message,
        })
      ) {
        return buildAffirmativeConfirmReminderResult();
      }
      return null;
    },
  },
];