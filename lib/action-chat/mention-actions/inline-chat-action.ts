/** Generic inline @ action chip wire — deeplink, clipboard, or capture. */

export type InlineChatActionAuxWire = {
  id: string;
  label: string;
  icon: string;
  deeplink?: string;
  actionKind?: "deeplink" | "clipboard" | "capture" | "internal";
  payload?: string;
};

export type InlineChatManualCatalogRow = {
  token: string;
  displayName: string;
  icon: string;
  example: string;
};

export type InlineChatManualCatalogGroup = {
  categoryLabel: string;
  rows: InlineChatManualCatalogRow[];
};

export type InlineChatActionWire = {
  featureId: string;
  displayName: string;
  icon: string;
  query: string;
  summaryLines: string[];
  mainLabel: string;
  mainDeeplink?: string;
  mainActionKind?: "deeplink" | "clipboard" | "capture" | "internal";
  auxActions: InlineChatActionAuxWire[];
  manualCatalog?: InlineChatManualCatalogGroup[];
  /** Show URL field + keyboard-friendly prompt (linksheet). */
  linksheetUrlPrompt?: boolean;
  /** @친추 — lookup + confirm add friend */
  friendAddContact?: string;
  /** @톡 — 피드 인라인 DM (같은 room 스레드) */
  peerTalkQuery?: string;
  /** @단톡 — 피드 인라인 group ROOM */
  groupTalkQuery?: string;
};

export function buildInlineChatActionWire(
  input: Omit<InlineChatActionWire, "auxActions"> & {
    auxActions?: InlineChatActionAuxWire[];
    manualCatalog?: InlineChatManualCatalogGroup[];
    linksheetUrlPrompt?: boolean;
    friendAddContact?: string;
    peerTalkQuery?: string;
    groupTalkQuery?: string;
  },
): InlineChatActionWire {
  return {
    featureId: input.featureId,
    displayName: input.displayName.trim(),
    icon: input.icon,
    query: input.query.trim(),
    summaryLines: input.summaryLines.filter(Boolean),
    mainLabel: input.mainLabel.trim() || input.displayName.trim(),
    mainDeeplink: input.mainDeeplink?.trim(),
    mainActionKind: input.mainActionKind ?? "deeplink",
    auxActions: input.auxActions ?? [],
    manualCatalog: input.manualCatalog,
    linksheetUrlPrompt: input.linksheetUrlPrompt,
    friendAddContact: input.friendAddContact,
    peerTalkQuery: input.peerTalkQuery,
    groupTalkQuery: input.groupTalkQuery,
  };
}
