/** Inline @캘린더 — compact calendar widget payload in chat. */

export type InlineChatCalendarWire = {
  openedAt: string;
  /** Optional text after @캘린더 (display only in v1). */
  query?: string;
};

export function buildInlineChatCalendarWire(query?: string): InlineChatCalendarWire {
  return {
    openedAt: new Date().toISOString(),
    ...(query?.trim() ? { query: query.trim() } : {}),
  };
}
