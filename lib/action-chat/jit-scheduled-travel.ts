import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import {
  removePendingScheduledAction,
  upsertPendingScheduledAction,
} from "@/lib/action-chat/chat-scheduled-actions-store";
import { planJITShowAt } from "@/lib/context-resolver/compile-travel-action";
import { shouldUseJITEventDelivery } from "@/lib/context-resolver/event-from-schedule";
import { JIT_LOOKAHEAD_MS } from "@/lib/context-resolver/types";

const activeTimers = new Map<string, number>();

function timerKey(scopeId: string, messageId: string) {
  return `${scopeId}:${messageId}`;
}

function clearTimer(key: string) {
  const existing = activeTimers.get(key);
  if (existing) {
    window.clearTimeout(existing);
    activeTimers.delete(key);
  }
}

function scheduleTimer(key: string, delayMs: number, fn: () => void) {
  clearTimer(key);
  if (delayMs <= 0) {
    fn();
    return;
  }
  const timer = window.setTimeout(() => {
    activeTimers.delete(key);
    fn();
  }, delayMs);
  activeTimers.set(key, timer);
}

/**
 * JIT arm — static event stored; context resolved only near execution.
 * 1) Wait until lookahead window (or now)
 * 2) Resolve traffic/weather → compute show_at
 * 3) Fire at show_at (not meeting time)
 */
export function armJITScheduledActionDelivery(input: {
  scopeId: string;
  messageId: string;
  extracted: ConfirmationExtractedData;
  onFire: () => void;
}) {
  if (!shouldUseJITEventDelivery(input.extracted)) {
    return false;
  }

  const meetingAt = parseActionTargetDatetime(input.extracted.datetime);
  if (!meetingAt) {
    return false;
  }

  const key = timerKey(input.scopeId, input.messageId);
  clearTimer(key);

  upsertPendingScheduledAction({
    scopeId: input.scopeId,
    messageId: input.messageId,
    fireAt: input.extracted.datetime!,
    extracted: input.extracted,
  });

  const meetingMs = meetingAt.getTime();
  const planAtMs = Math.max(Date.now(), meetingMs - JIT_LOOKAHEAD_MS);
  const planDelay = planAtMs - Date.now();

  scheduleTimer(key, planDelay, () => {
    void (async () => {
      const plan = await planJITShowAt(input.extracted);
      if (!plan) {
        input.onFire();
        return;
      }

      upsertPendingScheduledAction({
        scopeId: input.scopeId,
        messageId: input.messageId,
        fireAt: plan.show_at,
        extracted: input.extracted,
      });

      const fireDelay = new Date(plan.show_at).getTime() - Date.now();
      scheduleTimer(key, fireDelay, () => {
        removePendingScheduledAction(input.scopeId, input.messageId);
        input.onFire();
      });
    })();
  });

  return true;
}

export function disarmJITScheduledActionDelivery(scopeId: string, messageId: string) {
  clearTimer(timerKey(scopeId, messageId));
}
