"use client";

import { InlineChatActionChip } from "@/components/action-chat/inline-chat-action-chip";
import { InlineChatCalendarChip } from "@/components/action-chat/inline-chat-calendar-chip";
import { InlineChatFocusChip } from "@/components/action-chat/inline-chat-focus-chip";
import { InlineChatNavigateChip } from "@/components/action-chat/inline-chat-navigate-chip";
import { InlineChatParkingChip } from "@/components/action-chat/inline-chat-parking-chip";
import { InlineChatReminderChip } from "@/components/action-chat/inline-chat-reminder-chip";
import { InlineChatScheduleOrganizeChip } from "@/components/action-chat/inline-chat-schedule-organize-chip";
import { InlineChatTimerChip } from "@/components/action-chat/inline-chat-timer-chip";
import { InlineChatTransferChip } from "@/components/action-chat/inline-chat-transfer-chip";
import type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";

export function hasMentionInlinePayload(message: ActionChatMessage): boolean {
  return Boolean(
    message.inlineChatTimer ||
      message.inlineChatFocus ||
      message.inlineChatCalendar ||
      message.inlineChatReminder ||
      message.inlineChatNavigate ||
      message.inlineChatScheduleOrganize ||
      message.inlineChatTransfer ||
      message.inlineChatParking ||
      message.inlineChatAction,
  );
}

export type MentionInlineMessageProps = {
  message: ActionChatMessage;
  calendarOverlayRows?: UnifiedCalendarOverlayRow[];
  calendarContextByMessageId?: Record<string, string>;
  onInlineTimerComplete?: (messageId: string) => void;
  onInlineFocusConfirm?: (messageId: string) => void;
  onInlineFocusCancel?: (messageId: string) => void;
  onInlineFocusComplete?: (messageId: string) => void;
  onOpenCalendarSheet?: () => void;
  onCalendarSpawnPrompt?: (uri: string) => void;
  onNavigateSpawnPrompt?: (uri: string) => void;
  onScheduleOrganizePrompt?: (prompt: string) => void;
  onTransferSpawnPrompt?: (uri: string) => void;
  onActionSpawnPrompt?: (uri: string) => void;
  onFocusHeldInAppAction?: (
    messageId: string,
    shadowId: string,
    action: FocusHeldActionWire,
  ) => void;
  onOpenCapture?: () => void;
  onFeedPeerTalkStart?: (contact: PeerContact) => void;
};

export function MentionInlineMessage({
  message,
  calendarOverlayRows = [],
  calendarContextByMessageId,
  onInlineTimerComplete,
  onInlineFocusConfirm,
  onInlineFocusCancel,
  onInlineFocusComplete,
  onOpenCalendarSheet,
  onCalendarSpawnPrompt,
  onNavigateSpawnPrompt,
  onScheduleOrganizePrompt,
  onTransferSpawnPrompt,
  onActionSpawnPrompt,
  onFocusHeldInAppAction,
  onOpenCapture,
  onFeedPeerTalkStart,
}: MentionInlineMessageProps) {
  const messageId = message.id;

  if (message.inlineChatAction) {
    return (
      <InlineChatActionChip
        action={message.inlineChatAction}
        onSpawnPrompt={onActionSpawnPrompt ?? onNavigateSpawnPrompt}
        onOpenCapture={onOpenCapture}
        onFeedPeerTalkStart={onFeedPeerTalkStart}
      />
    );
  }

  if (message.inlineChatFocus) {
    return (
      <InlineChatFocusChip
        focus={message.inlineChatFocus}
        onConfirm={() => onInlineFocusConfirm?.(messageId)}
        onCancel={() => onInlineFocusCancel?.(messageId)}
        onComplete={() => onInlineFocusComplete?.(messageId)}
        onHeldInAppAction={(shadowId, action) =>
          onFocusHeldInAppAction?.(messageId, shadowId, action)
        }
      />
    );
  }

  if (message.inlineChatTimer) {
    return (
      <InlineChatTimerChip
        timer={message.inlineChatTimer}
        onComplete={() => onInlineTimerComplete?.(messageId)}
      />
    );
  }

  if (message.inlineChatCalendar) {
    return (
      <InlineChatCalendarChip
        calendar={message.inlineChatCalendar}
        overlayRows={calendarOverlayRows}
        contextByMessageId={calendarContextByMessageId}
        onExpand={onOpenCalendarSheet}
        onSpawnPrompt={onCalendarSpawnPrompt}
      />
    );
  }

  if (message.inlineChatNavigate) {
    return (
      <InlineChatNavigateChip
        navigate={message.inlineChatNavigate}
        onSpawnPrompt={onNavigateSpawnPrompt}
      />
    );
  }

  if (message.inlineChatScheduleOrganize) {
    return (
      <InlineChatScheduleOrganizeChip
        organize={message.inlineChatScheduleOrganize}
        overlayRows={calendarOverlayRows}
        onRebalancePrompt={onScheduleOrganizePrompt}
        onOpenCalendar={onOpenCalendarSheet}
      />
    );
  }

  if (message.inlineChatTransfer) {
    return (
      <InlineChatTransferChip
        transfer={message.inlineChatTransfer}
        onSpawnPrompt={onTransferSpawnPrompt}
      />
    );
  }

  if (message.inlineChatParking) {
    return (
      <InlineChatParkingChip
        parking={message.inlineChatParking}
        onOpenCapture={onOpenCapture}
      />
    );
  }

  if (message.inlineChatReminder) {
    return <InlineChatReminderChip reminder={message.inlineChatReminder} />;
  }

  return null;
}
