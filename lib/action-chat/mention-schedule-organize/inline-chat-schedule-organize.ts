/** Inline @일정정리 — organize snapshot marker in chat. */

export type InlineChatScheduleOrganizeWire = {
  openedAt: string;
  query?: string;
};

export function buildInlineChatScheduleOrganizeWire(
  query?: string,
): InlineChatScheduleOrganizeWire {
  return {
    openedAt: new Date().toISOString(),
    ...(query?.trim() ? { query: query.trim() } : {}),
  };
}
