import type { FocusHeldActionWire, FocusHeldItemWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";

export type FocusHeldInAppActionInput = {
  shadowId: string;
  action: FocusHeldActionWire;
};

export function applyFocusHeldItemResolved(
  items: FocusHeldItemWire[] | undefined,
  shadowId: string,
): FocusHeldItemWire[] {
  return (items ?? []).map((item) =>
    item.shadowId === shadowId ? { ...item, resolved: true } : item,
  );
}

export function countUnresolvedHeldItems(items: FocusHeldItemWire[] | undefined): number {
  return (items ?? []).filter((item) => !item.resolved).length;
}

export function formatFocusInAppSummaryHeader(
  items: FocusHeldItemWire[],
  label: string,
): string {
  const pending = countUnresolvedHeldItems(items);
  if (items.length === 0) {
    return `**집중 ${label}** 끝!\n\n집중 시간 동안 모아둔 알림은 없었어요.`;
  }
  if (pending === 0) {
    return `**집중 ${label}** 끝!\n\n모아둔 알림 ${items.length}건 — 모두 확인했어요.`;
  }
  return `**집중 ${label}** 끝!\n\n모아둔 알림 **${items.length}건** — 아래에서 바로 처리하세요.`;
}
