import type { InlineChatActionWire } from "@/lib/action-chat/mention-actions/inline-chat-action";

const STORAGE_KEY = "rimvio:last-mention-action";

export type StoredMentionAction = {
  featureId: string;
  query: string;
  mainDeeplink?: string;
  mainLabel: string;
  savedAt: string;
};

export function recordLastMentionAction(wire: InlineChatActionWire): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload: StoredMentionAction = {
    featureId: wire.featureId,
    query: wire.query,
    mainDeeplink: wire.mainDeeplink,
    mainLabel: wire.mainLabel,
    savedAt: new Date().toISOString(),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function readLastMentionAction(): StoredMentionAction | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredMentionAction;
  } catch {
    return null;
  }
}
