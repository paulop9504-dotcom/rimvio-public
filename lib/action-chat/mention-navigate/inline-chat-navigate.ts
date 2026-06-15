/** Inline @네비 — compact nav deeplink widget in chat. */

export type InlineNavAuxWire = {
  id: string;
  label: string;
  icon: string;
  deeplink: string;
};

export type InlineChatNavigateWire = {
  destination: string;
  mainLabel: string;
  mainDeeplink: string;
  auxActions: InlineNavAuxWire[];
};

export function buildInlineChatNavigateWire(input: {
  destination: string;
  mainLabel?: string;
  mainDeeplink: string;
  auxActions?: InlineNavAuxWire[];
}): InlineChatNavigateWire {
  return {
    destination: input.destination.trim(),
    mainLabel: input.mainLabel?.trim() || "길찾기",
    mainDeeplink: input.mainDeeplink,
    auxActions: input.auxActions ?? [],
  };
}
