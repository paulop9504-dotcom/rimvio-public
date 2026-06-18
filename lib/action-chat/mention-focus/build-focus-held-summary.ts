import type { FocusHeldItemWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";
import { shadowRecordToHeldItem } from "@/lib/action-chat/mention-focus/build-focus-held-panel";
import { formatFocusInAppSummaryHeader } from "@/lib/action-chat/mention-focus/focus-held-in-app-actions";
import { findShadowRecord } from "@/lib/notification-shadow/shadow-store";

export { shadowRecordToHeldItem } from "@/lib/action-chat/mention-focus/build-focus-held-panel";

export function listHeldItemsFromShadowIds(ids: readonly string[]): FocusHeldItemWire[] {
  const items: FocusHeldItemWire[] = [];
  for (const id of ids) {
    const record = findShadowRecord(id);
    if (record) {
      items.push(shadowRecordToHeldItem(record));
    }
  }
  return items;
}

export function formatFocusHeldSummary(items: FocusHeldItemWire[], label: string): string {
  return formatFocusInAppSummaryHeader(items, label);
}
