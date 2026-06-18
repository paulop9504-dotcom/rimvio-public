"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  ACTION_CHAT_MESSAGES_UPDATED,
  readFeedSlotChatMessages,
} from "@/lib/action-chat/chat-store";

/** /feed peer lookup — reads session chat without mounting useActionChat. */
export function useFeedSlotChatMessages() {
  const [messages, setMessages] = useState<ActionChatMessage[]>([]);

  const refresh = useCallback(() => {
    setMessages(readFeedSlotChatMessages());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdated = () => refresh();
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    window.addEventListener(ACTION_CHAT_MESSAGES_UPDATED, onUpdated);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(ACTION_CHAT_MESSAGES_UPDATED, onUpdated);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return messages;
}
