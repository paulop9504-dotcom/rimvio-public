import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  applyFocusHeldItemResolved,
  formatFocusInAppSummaryHeader,
} from "@/lib/action-chat/mention-focus/focus-held-in-app-actions";
import type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/build-focus-held-panel";
import { listHeldItemsFromShadowIds } from "@/lib/action-chat/mention-focus/build-focus-held-summary";
import {
  buildCancelledFocusWire,
  buildCompletedFocusWire,
  buildRunningFocusWire,
} from "@/lib/action-chat/mention-focus/inline-chat-focus";
import {
  clearFocusSession,
  readFocusSession,
  startFocusSessionFromWire,
} from "@/lib/action-chat/mention-focus/focus-session-store";

export function applyFocusConfirmToMessages(
  messages: ActionChatMessage[],
  messageId: string,
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatFocus) {
      return message;
    }
    if (message.inlineChatFocus.phase !== "awaiting_confirm") {
      return message;
    }
    const running = buildRunningFocusWire(message.inlineChatFocus);
    startFocusSessionFromWire({ messageId, wire: running });
    return {
      ...message,
      text: `집중 **${running.label}** 시작! 카카오톡·이메일 알림을 모아둘게요.`,
      inlineChatFocus: running,
    };
  });
}

export function applyFocusCancelToMessages(
  messages: ActionChatMessage[],
  messageId: string,
): ActionChatMessage[] {
  clearFocusSession();
  return messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatFocus) {
      return message;
    }
    if (message.inlineChatFocus.phase !== "awaiting_confirm") {
      return message;
    }
    return {
      ...message,
      text: "집중 모드를 취소했어요.",
      inlineChatFocus: buildCancelledFocusWire(message.inlineChatFocus),
    };
  });
}

export function applyFocusCompleteToMessages(
  messages: ActionChatMessage[],
  messageId: string,
): ActionChatMessage[] {
  const session = readFocusSession();
  const heldItems = listHeldItemsFromShadowIds(session?.heldShadowIds ?? []);

  return messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatFocus) {
      return message;
    }
    if (message.inlineChatFocus.phase !== "running") {
      return message;
    }
    const summaryText = formatFocusInAppSummaryHeader(
      heldItems,
      message.inlineChatFocus.label,
    );
    const done = buildCompletedFocusWire({
      running: message.inlineChatFocus,
      heldItems,
      summaryText,
    });
    clearFocusSession();
    return {
      ...message,
      text: summaryText,
      inlineChatFocus: done,
    };
  });
}

export function applyFocusHeldInAppActionToMessages(
  messages: ActionChatMessage[],
  messageId: string,
  shadowId: string,
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatFocus?.heldItems) {
      return message;
    }
    const heldItems = applyFocusHeldItemResolved(message.inlineChatFocus.heldItems, shadowId);
    const summaryText = formatFocusInAppSummaryHeader(
      heldItems,
      message.inlineChatFocus.label,
    );
    return {
      ...message,
      text: summaryText,
      inlineChatFocus: {
        ...message.inlineChatFocus,
        heldItems,
        heldCount: heldItems.filter((item) => !item.resolved).length,
        summaryText,
      },
    };
  });
}

export type { FocusHeldActionWire };
