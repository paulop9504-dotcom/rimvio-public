import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import type { LinkReminder } from "@/lib/local-links/reminders";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import type { NotificationEventInput } from "@/lib/notification-shadow/types";
import { ingestNotification } from "@/lib/notification-shadow/route-notification";
import { appendShadowRecord } from "@/lib/notification-shadow/shadow-store";
import type { ShadowProcessedRecord } from "@/lib/notification-shadow/types";

export function linkReminderToNotificationEvent(
  reminder: LinkReminder,
  activeContainer?: CanonicalContainerKey | null
): NotificationEventInput {
  return {
    source: "internal",
    source_app: "rimvio",
    title: reminder.title,
    content: `${reminder.title} · ${reminder.url}`,
    timestamp: reminder.createdAt,
    active_container: activeContainer ?? null,
    internal_kind: "link_reminder",
    fire_at: reminder.fireAt,
    link_id: reminder.linkId,
  };
}

export function activeActionToNotificationEvent(
  entry: ActiveActionEntry,
  activeContainer?: CanonicalContainerKey | null
): NotificationEventInput {
  const kind =
    entry.kind === "scheduled_nav"
      ? "scheduled_nav"
      : entry.kind === "link_reminder"
        ? "link_reminder"
        : "calendar";

  return {
    source: "internal",
    source_app: "rimvio",
    title: entry.title,
    content: entry.subtitle,
    timestamp: new Date().toISOString(),
    active_container: activeContainer ?? null,
    internal_kind: kind,
    fire_at: entry.fireAt,
    link_id: entry.linkId,
    message_id: entry.messageId,
  };
}

export function externalNotificationToEvent(input: {
  source_app: string;
  title: string;
  content: string;
  timestamp?: string;
  active_container?: CanonicalContainerKey | null;
}): NotificationEventInput {
  return {
    source: "external",
    source_app: input.source_app,
    title: input.title,
    content: input.content,
    timestamp: input.timestamp ?? new Date().toISOString(),
    active_container: input.active_container ?? null,
  };
}

export function ingestInternalReminder(
  reminder: LinkReminder,
  activeContainer?: CanonicalContainerKey | null
): ShadowProcessedRecord {
  return appendShadowRecord(
    ingestNotification(linkReminderToNotificationEvent(reminder, activeContainer))
  );
}

export function ingestInternalActiveAction(
  entry: ActiveActionEntry,
  activeContainer?: CanonicalContainerKey | null
): ShadowProcessedRecord {
  return appendShadowRecord(
    ingestNotification(activeActionToNotificationEvent(entry, activeContainer))
  );
}

export function ingestExternalNotification(input: {
  source_app: string;
  title: string;
  content: string;
  timestamp?: string;
  active_container?: CanonicalContainerKey | null;
}): ShadowProcessedRecord {
  return appendShadowRecord(
    ingestNotification(externalNotificationToEvent(input))
  );
}
