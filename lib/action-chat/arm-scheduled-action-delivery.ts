import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import {
  removePendingScheduledAction,
  upsertPendingScheduledAction,
  readPendingScheduledActions,
} from "@/lib/action-chat/chat-scheduled-actions-store";
import {
  archiveChatScheduledEvent,
  ingestChatScheduledEvent,
  migratePendingChatScheduledToEventCandidates,
} from "@/lib/events/chat-scheduled-ingest";
import {
  armJITScheduledActionDelivery,
  disarmJITScheduledActionDelivery,
} from "@/lib/action-chat/jit-scheduled-travel";
import { shouldUseJITEventDelivery } from "@/lib/context-resolver/event-from-schedule";

const activeTimers = new Map<string, number>();

function timerKey(scopeId: string, messageId: string) {
  return `${scopeId}:${messageId}`;
}

export function disarmScheduledActionDelivery(scopeId: string, messageId: string) {
  disarmJITScheduledActionDelivery(scopeId, messageId);
  const key = timerKey(scopeId, messageId);
  const existing = activeTimers.get(key);
  if (existing) {
    window.clearTimeout(existing);
    activeTimers.delete(key);
  }
  removePendingScheduledAction(scopeId, messageId);
}

export function cancelChatScheduledEventDelivery(
  scopeId: string,
  messageId: string,
) {
  disarmScheduledActionDelivery(scopeId, messageId);
  archiveChatScheduledEvent(messageId);
}

function armLegacyScheduledActionDelivery(input: {
  scopeId: string;
  messageId: string;
  extracted: ConfirmationExtractedData;
  onFire: () => void;
}) {
  const fireAt = input.extracted.datetime;
  const target = parseActionTargetDatetime(fireAt);
  if (!target) {
    return;
  }

  const delay = target.getTime() - Date.now();
  const key = timerKey(input.scopeId, input.messageId);

  upsertPendingScheduledAction({
    scopeId: input.scopeId,
    messageId: input.messageId,
    fireAt: fireAt!,
    extracted: input.extracted,
  });

  if (delay <= 0) {
    input.onFire();
    return;
  }

  const timer = window.setTimeout(() => {
    activeTimers.delete(key);
    removePendingScheduledAction(input.scopeId, input.messageId);
    input.onFire();
  }, delay);

  activeTimers.set(key, timer);
}

export function armScheduledActionDelivery(input: {
  scopeId: string;
  messageId: string;
  extracted: ConfirmationExtractedData;
  onFire: () => void;
  peerThreadId?: string | null;
  peerDisplayName?: string | null;
}) {
  disarmScheduledActionDelivery(input.scopeId, input.messageId);

  ingestChatScheduledEvent({
    messageId: input.messageId,
    extracted: input.extracted,
    scopeId: input.scopeId,
    peerThreadId: input.peerThreadId,
    peerDisplayName: input.peerDisplayName,
  });

  if (shouldUseJITEventDelivery(input.extracted)) {
    const armed = armJITScheduledActionDelivery(input);
    if (armed) {
      return;
    }
  }

  armLegacyScheduledActionDelivery(input);
}

export function restoreScheduledActionDeliveries(input: {
  scopeId: string;
  onFire: (messageId: string, extracted: ConfirmationExtractedData) => void;
}) {
  const pending = readPendingScheduledActions(input.scopeId);
  migratePendingChatScheduledToEventCandidates(pending);
  for (const record of pending) {
    armScheduledActionDelivery({
      scopeId: input.scopeId,
      messageId: record.messageId,
      extracted: record.extracted,
      onFire: () => input.onFire(record.messageId, record.extracted),
    });
  }
}
