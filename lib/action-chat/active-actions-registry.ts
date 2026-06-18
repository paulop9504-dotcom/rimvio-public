import {
  computeActionCountdown,
  computeStudyCountUpElapsed,
  formatActionTargetClock,
} from "@/lib/action-chat/action-countdown";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { readLinkReminders } from "@/lib/local-links/reminders";

export type ActiveActionKind =
  | "scheduled_nav"
  | "link_reminder"
  | "revealed_actions"
  | "pending_confirm"
  | "projected_event"
  | "study_focus";

export type ActiveActionEntry = {
  id: string;
  messageId: string | null;
  linkId: string | null;
  reminderId: string | null;
  kind: ActiveActionKind;
  title: string;
  subtitle: string;
  fireAt: string | null;
  placeName: string | null;
  actionCount: number;
  countdownLabel: string | null;
};

function readPlaceLabel(message: ActionChatMessage): string | null {
  return (
    message.scheduleExtract?.place_name ??
    message.confirmation?.extracted_data?.place_name ??
    null
  );
}

function readFireAt(message: ActionChatMessage): string | null {
  return (
    message.scheduledDelivery?.fire_at ??
    message.scheduleExtract?.datetime ??
    message.confirmation?.extracted_data?.datetime ??
    null
  );
}

function fromChatMessages(messages: ActionChatMessage[]): ActiveActionEntry[] {
  const entries: ActiveActionEntry[] = [];

  for (const message of messages) {
    if (message.role !== "assistant" || message.loading) {
      continue;
    }

    const focusSession = (
      message.metadata as { study_focus_session?: { startedAt?: string; label?: string } } | undefined
    )?.study_focus_session;
    if (focusSession?.startedAt) {
      const elapsed = computeStudyCountUpElapsed(focusSession.startedAt);
      entries.push({
        id: `${message.id}:study-focus`,
        messageId: message.id,
        linkId: null,
        reminderId: null,
        kind: "study_focus",
        title: focusSession.label ?? "공부 · 집중",
        subtitle: `${formatActionTargetClock(focusSession.startedAt)} 시작`,
        fireAt: focusSession.startedAt,
        placeName: null,
        actionCount: 0,
        countdownLabel: elapsed?.headline ?? null,
      });
      continue;
    }

    if (message.scheduledDelivery?.status === "pending") {
      const placeName = readPlaceLabel(message);
      const fireAt = readFireAt(message);
      const countdown = fireAt ? computeActionCountdown(fireAt) : null;

      entries.push({
        id: `${message.id}:scheduled`,
        messageId: message.id,
        linkId: null,
        reminderId: null,
        kind: "scheduled_nav",
        title: placeName ? `${placeName} 길찾기` : "예약된 이동",
        subtitle: fireAt ? `${formatActionTargetClock(fireAt)} 공개` : "시간 대기 중",
        fireAt,
        placeName,
        actionCount: message.actions?.length ?? 0,
        countdownLabel: countdown?.isPast ? "지금 실행 가능" : countdown?.headline ?? null,
      });
      continue;
    }

    if (message.pendingConfirm && message.confirmation?.meta?.intent === "CONFIRM") {
      const placeName = readPlaceLabel(message);
      const fireAt = readFireAt(message);
      const countdown = fireAt ? computeActionCountdown(fireAt) : null;

      entries.push({
        id: `${message.id}:confirm`,
        messageId: message.id,
        linkId: null,
        reminderId: null,
        kind: "pending_confirm",
        title: placeName ? `${placeName} 확인` : "장소 확인 대기",
        subtitle: message.confirmation.persona_message?.slice(0, 48) ?? "확인이 필요해요",
        fireAt,
        placeName,
        actionCount: message.confirmation.batch_pending?.length ?? 0,
        countdownLabel: countdown?.headline ?? null,
      });
      continue;
    }

    if (
      message.actionsRevealed &&
      (message.actions?.length ?? 0) > 0 &&
      message.scheduledDelivery?.status !== "fired"
    ) {
      const placeName = readPlaceLabel(message);
      const primaryAction = message.actions?.[0];
      const fireAt = readFireAt(message);

      entries.push({
        id: `${message.id}:actions`,
        messageId: message.id,
        linkId: null,
        reminderId: null,
        kind: "revealed_actions",
        title: placeName ?? primaryAction?.label ?? "실행 가능한 액션",
        subtitle: `${message.actions?.length ?? 0}개 액션 활성`,
        fireAt,
        placeName,
        actionCount: message.actions?.length ?? 0,
        countdownLabel: null,
      });
    }
  }

  return entries;
}

function fromLinkReminders(linkIds?: Set<string>): ActiveActionEntry[] {
  return readLinkReminders()
    .filter((reminder) => !linkIds || linkIds.has(reminder.linkId))
    .map((reminder) => {
      const countdown = computeActionCountdown(reminder.fireAt);
      return {
        id: `link:${reminder.id}`,
        messageId: null,
        linkId: reminder.linkId,
        reminderId: reminder.id,
        kind: "link_reminder" as const,
        title: reminder.title,
        subtitle: `${formatActionTargetClock(reminder.fireAt)} 알림`,
        fireAt: reminder.fireAt,
        placeName: null,
        actionCount: 1,
        countdownLabel: countdown?.isPast ? "지금 확인" : countdown?.headline ?? null,
      };
    });
}

/** Action Stream — time-triggered items only (chat schedules + link reminders). */
export function collectActionStream(
  messages: ActionChatMessage[],
  options?: { linkIds?: string[] }
): ActiveActionEntry[] {
  const linkIdSet = options?.linkIds?.length ? new Set(options.linkIds) : undefined;
  const merged = [...fromChatMessages(messages), ...fromLinkReminders(linkIdSet)];

  return merged.sort((left, right) => {
    if (left.fireAt && right.fireAt) {
      return left.fireAt.localeCompare(right.fireAt);
    }
    if (left.fireAt) {
      return -1;
    }
    if (right.fireAt) {
      return 1;
    }
    return 0;
  });
}

export function countActionStream(
  messages: ActionChatMessage[],
  options?: { linkIds?: string[] }
) {
  return collectActionStream(messages, options).length;
}

/** @deprecated use collectActionStream */
export function collectActiveActions(messages: ActionChatMessage[]) {
  return collectActionStream(messages);
}

export function countActiveActions(messages: ActionChatMessage[]) {
  return countActionStream(messages);
}
