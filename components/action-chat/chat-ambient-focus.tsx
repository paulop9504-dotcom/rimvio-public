"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ChatAmbientFocusContextValue = {
  composerFocused: boolean;
  composerDraft: boolean;
  composerLive: boolean;
  setComposerFocused: (focused: boolean) => void;
  setComposerDraft: (hasDraft: boolean) => void;
};

const ChatAmbientFocusContext = createContext<ChatAmbientFocusContextValue | null>(
  null,
);

export function ChatAmbientFocusProvider({ children }: { children: ReactNode }) {
  const [composerFocused, setComposerFocused] = useState(false);
  const [composerDraft, setComposerDraft] = useState(false);

  const composerLive = composerFocused || composerDraft;

  const value = useMemo(
    () => ({
      composerFocused,
      composerDraft,
      composerLive,
      setComposerFocused,
      setComposerDraft,
    }),
    [composerDraft, composerFocused, composerLive],
  );

  return (
    <ChatAmbientFocusContext.Provider value={value}>
      {children}
    </ChatAmbientFocusContext.Provider>
  );
}

export function useChatAmbientFocus() {
  const ctx = useContext(ChatAmbientFocusContext);
  if (!ctx) {
    throw new Error("useChatAmbientFocus must be used within ChatAmbientFocusProvider");
  }
  return ctx;
}

/** Optional hook for input bar when provider may be absent in dev previews. */
export function useChatAmbientFocusOptional() {
  return useContext(ChatAmbientFocusContext);
}

type ChatAmbientShellProps = {
  children: ReactNode;
  className?: string;
  /** Hide bottom neon layers (feed @톡 / DM — reduces jitter on mobile). */
  suppressDecor?: boolean;
  "aria-label"?: string;
};

/** Wraps chat column — renders bottom prismatic wave when composer is live. */
export function ChatAmbientShell({
  children,
  className,
  suppressDecor = false,
  "aria-label": ariaLabel,
}: ChatAmbientShellProps) {
  const ctx = useChatAmbientFocusOptional();
  const live = !suppressDecor && (ctx?.composerLive ?? false);

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "chat-ambient-shell relative flex min-h-0 flex-1 flex-col overflow-hidden",
        live && "chat-ambient-shell--composer-live",
        suppressDecor && "chat-ambient-shell--plain",
        className,
      )}
      data-composer-live={live ? "true" : "false"}
      data-feed-peer-talk={suppressDecor ? "true" : undefined}
    >
      {suppressDecor ? null : (
        <>
          <div className="chat-ambient-composer-glow" aria-hidden />
          <div className="chat-ambient-wave" aria-hidden />
          <div className="chat-ambient-vignette" aria-hidden />
        </>
      )}
      {children}
    </section>
  );
}

export type ChatBubbleFocusTone = "live" | "rest" | "default";

export function resolveChatBubbleFocusTone(
  messageId: string,
  focusedTurnIds: Set<string>,
  composerLive: boolean,
): ChatBubbleFocusTone {
  if (!composerLive || focusedTurnIds.size === 0) {
    return "default";
  }
  return focusedTurnIds.has(messageId) ? "live" : "rest";
}

export function resolveFocusedTurnMessageIds(
  messages: Array<{ id: string; role: string }>,
): Set<string> {
  const ids = new Set<string>();
  if (messages.length === 0) {
    return ids;
  }

  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  if (lastUserIdx === -1) {
    ids.add(messages[messages.length - 1]!.id);
    return ids;
  }

  ids.add(messages[lastUserIdx]!.id);
  for (let i = lastUserIdx + 1; i < messages.length; i += 1) {
    ids.add(messages[i]!.id);
  }
  return ids;
}
