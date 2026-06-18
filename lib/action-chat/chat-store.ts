import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

const STORAGE_PREFIX = "rimvio.action-chat.v1";

export const ACTION_CHAT_MESSAGES_UPDATED = "rimvio-action-chat-messages-updated";

const FEED_SLOT_CHAT_SCOPES = ["rimvio:search", "free"] as const;

function storageKey(scopeId: string) {
  return `${STORAGE_PREFIX}.${scopeId}`;
}

function emitActionChatMessagesUpdated(scopeId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(ACTION_CHAT_MESSAGES_UPDATED, { detail: { scopeId } }),
  );
}

export function readActionChatMessages(scopeId: string): ActionChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(storageKey(scopeId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ActionChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeActionChatMessages(
  scopeId: string,
  messages: ActionChatMessage[]
) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(storageKey(scopeId), JSON.stringify(messages.slice(-40)));
  emitActionChatMessagesUpdated(scopeId);
}

/** UI reset — messages live only in sessionStorage; memory stays in localStorage. */
export function clearActionChatMessages(scopeId: string) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(storageKey(scopeId));
  emitActionChatMessagesUpdated(scopeId);
}

/** Wipe every in-session chat scope (e.g. 새 대화). Archive current scope first. */
export function clearAllActionChatMessageScopes() {
  if (typeof window === "undefined") {
    return;
  }

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(`${STORAGE_PREFIX}.`)) {
      sessionStorage.removeItem(key);
    }
  }
}

export type ActionChatScopeKind = "link" | "free" | "search";

/** Lightweight read for /feed peer-slot wiring (no useActionChat). */
export function readFeedSlotChatMessages(): ActionChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  const seen = new Set<string>();
  const merged: ActionChatMessage[] = [];

  const pushScope = (scopeId: string) => {
    for (const message of readActionChatMessages(scopeId)) {
      if (seen.has(message.id)) {
        continue;
      }
      seen.add(message.id);
      merged.push(message);
    }
  };

  for (const scopeId of FEED_SLOT_CHAT_SCOPES) {
    pushScope(scopeId);
  }

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (!key?.startsWith(`${STORAGE_PREFIX}.`)) {
      continue;
    }
    const scopeId = key.slice(`${STORAGE_PREFIX}.`.length);
    if ((FEED_SLOT_CHAT_SCOPES as readonly string[]).includes(scopeId)) {
      continue;
    }
    pushScope(scopeId);
  }

  return merged;
}

export function actionChatScopeId(
  linkId?: string | null,
  scopeKind: ActionChatScopeKind = "link",
): string {
  if (scopeKind === "search") {
    return "rimvio:search";
  }
  if (scopeKind === "free") {
    return "free";
  }
  return linkId?.trim() || "free";
}
