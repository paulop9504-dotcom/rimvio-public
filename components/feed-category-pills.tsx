"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Loader2, Plus, Zap, type LucideIcon } from "lucide-react";
import {
  type FeedCategoryFilter,
  FEED_CATEGORY_PILLS,
} from "@/lib/categories/types";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { useAppLocale, useCopy } from "@/hooks/use-copy";
import { runRemoteAction } from "@/lib/remote/run-remote-action";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type FeedCategoryPillsProps = {
  value: FeedCategoryFilter;
  onChange: (value: FeedCategoryFilter) => void;
  visible: boolean;
  onAdd?: () => void;
  onQuickCapture?: () => void;
  remote?: ContextRemoteState | null;
  remoteLoading?: boolean;
  remoteLink?: LinkRow | null;
};

type CategoryVisual = {
  Icon: LucideIcon;
  ring: string;
  iconClass: string;
};

const CATEGORY_VISUAL: Record<FeedCategoryFilter, CategoryVisual> = {
  all: {
    Icon: LayoutGrid,
    ring: "from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]",
    iconClass: "text-foreground",
  },
};

export function FeedCategoryPills({
  value,
  onChange,
  visible,
  onAdd,
  onQuickCapture,
  remote,
  remoteLoading = false,
  remoteLink = null,
}: FeedCategoryPillsProps) {
  const copy = useCopy();
  const locale = useAppLocale();
  const longPressRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const remoteLongPressRef = useRef<number | null>(null);
  const remoteLongPressTriggeredRef = useRef(false);
  const [remoteMenuOpen, setRemoteMenuOpen] = useState(false);

  const clearLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const clearRemoteLongPress = () => {
    if (remoteLongPressRef.current !== null) {
      window.clearTimeout(remoteLongPressRef.current);
      remoteLongPressRef.current = null;
    }
  };

  const startLongPress = () => {
    if (!onQuickCapture) {
      return;
    }

    clearLongPress();
    longPressTriggeredRef.current = false;
    longPressRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onQuickCapture();
    }, 480);
  };

  const finishLongPress = () => {
    clearLongPress();
  };

  const handleAddClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    onAdd?.();
  };

  const remoteActions = [
    ...(remote?.primary ? [remote.primary] : []),
    ...(remote?.secondary ?? []),
  ];

  const openRemoteMenu = () => {
    if (remoteActions.length === 0) {
      return;
    }

    setRemoteMenuOpen(true);
  };

  const startRemoteLongPress = () => {
    clearRemoteLongPress();
    remoteLongPressTriggeredRef.current = false;
    remoteLongPressRef.current = window.setTimeout(() => {
      remoteLongPressTriggeredRef.current = true;
      openRemoteMenu();
    }, 480);
  };

  const finishRemoteLongPress = () => {
    clearRemoteLongPress();
  };

  const handleRemoteClick = () => {
    if (remoteLoading) {
      return;
    }

    if (remoteLongPressTriggeredRef.current) {
      remoteLongPressTriggeredRef.current = false;
      return;
    }

    if (remote?.primary) {
      void runRemoteAction(remote.primary, remoteLink);
      return;
    }

    openRemoteMenu();
  };

  const handleRemoteActionPick = (action: (typeof remoteActions)[number]) => {
    setRemoteMenuOpen(false);
    void runRemoteAction(action, remoteLink);
  };

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="feed-category-rail"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-none absolute inset-x-0 z-30",
            "top-[max(2.85rem,calc(env(safe-area-inset-top)+2.35rem))]",
            "border-b border-border/35 bg-background/92 backdrop-blur-xl",
            "shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]"
          )}
        >
          <div className="pointer-events-auto flex gap-[var(--space-phi)] overflow-x-auto px-[var(--space-phi)] pb-[var(--space-phi)] pt-[var(--space-u)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FEED_CATEGORY_PILLS.map((pill) => {
              const active = value === pill.value;
              const { Icon, ring, iconClass } = CATEGORY_VISUAL[pill.value];

              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => onChange(pill.value)}
                  className="group flex w-[4.35rem] shrink-0 flex-col items-center gap-1.5"
                >
                  <div
                    className={cn(
                      "rounded-full p-[2px] transition-all duration-200",
                      active
                        ? cn("bg-gradient-to-tr shadow-sm", ring)
                        : "bg-neutral-200/90 group-hover:bg-neutral-300/90"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full",
                        "bg-background ring-1 ring-rimvio-neon-purple/12",
                        active && "ring-0"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[1.15rem] transition-colors",
                          active ? iconClass : "text-muted-foreground"
                        )}
                        strokeWidth={active ? 2.1 : 1.65}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "max-w-full truncate text-[11px] leading-none tracking-tight",
                      active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    {pill.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAddClick}
              onPointerDown={startLongPress}
              onPointerUp={finishLongPress}
              onPointerLeave={finishLongPress}
              onPointerCancel={finishLongPress}
              className="group flex w-[4.35rem] shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "rounded-full p-[2px] transition-all duration-200",
                  "bg-gradient-to-tr from-[#FF6B00] via-[#FF9500] to-[#FFCC00] shadow-sm",
                  "group-hover:shadow-md group-active:scale-[0.97]"
                )}
              >
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full",
                    "bg-background ring-1 ring-rimvio-neon-purple/12"
                  )}
                >
                  <Plus
                    className="size-[1.25rem] text-[#FF6B00]"
                    strokeWidth={2.2}
                  />
                </div>
              </div>
              <span className="max-w-full truncate text-[11px] font-semibold leading-none tracking-tight text-foreground">
                {copy.feed.capturePill}
              </span>
            </button>

            {remote?.visible ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={handleRemoteClick}
                  onPointerDown={startRemoteLongPress}
                  onPointerUp={finishRemoteLongPress}
                  onPointerLeave={finishRemoteLongPress}
                  onPointerCancel={finishRemoteLongPress}
                  className="group flex w-[4.35rem] flex-col items-center gap-1.5"
                  aria-expanded={remoteMenuOpen}
                >
                  <div
                    className={cn(
                      "relative rounded-full p-[2px] transition-all duration-200",
                      "bg-gradient-to-tr from-[#007AFF] via-[#5856D6] to-[#AF52DE] shadow-sm",
                      "group-hover:shadow-md group-active:scale-[0.97]",
                      remote.expanded && remote.primary && !remoteLoading && "animate-pulse"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full",
                        "bg-background ring-1 ring-rimvio-neon-purple/12"
                      )}
                    >
                      {remoteLoading ? (
                        <Loader2
                          className="size-[1.2rem] animate-spin text-rimvio-neon-cyan"
                          strokeWidth={2.2}
                        />
                      ) : (
                        <Zap
                          className="size-[1.2rem] text-rimvio-neon-cyan"
                          strokeWidth={2.2}
                          fill="currentColor"
                        />
                      )}
                    </div>
                    {remote.expanded && remote.primary && !remoteLoading ? (
                      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-rimvio-neon-purple" />
                    ) : null}
                  </div>
                  <span className="max-w-full truncate text-[11px] font-semibold leading-none tracking-tight text-rimvio-neon-cyan">
                    {copy.feed.remotePill}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {remoteMenuOpen && remoteActions.length > 0 ? (
                    <>
                      <button
                        type="button"
                        aria-label="?�기"
                        className="fixed inset-0 z-40"
                        onClick={() => setRemoteMenuOpen(false)}
                      />
                      <motion.div
                        key="remote-action-menu"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          "absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[min(18rem,calc(100vw-2rem))]",
                          "overflow-hidden rounded-[18px] border border-white/70 bg-rimvio-surface/95 p-2",
                          "shadow-[0_16px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl ring-1 ring-rimvio-neon-purple/12"
                        )}
                      >
                        {remote.signalLine ? (
                          <p className="px-2.5 pb-2 pt-1 text-[11px] font-medium leading-snug text-[#636366]">
                            {remote.signalLine}
                          </p>
                        ) : null}
                        <div className="space-y-1">
                          {remoteActions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => handleRemoteActionPick(action)}
                              className={cn(
                                "flex w-full items-center rounded-[12px] px-3 py-2.5 text-left text-[13px] font-medium",
                                "text-foreground transition-colors hover:bg-rimvio-surface-muted active:scale-[0.99]"
                              )}
                            >
                              {cleanFeedActionLabel(action.label, locale)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Reserve space under header for story rail + labels (card 1 only). */
export const FEED_CATEGORY_RAIL_OFFSET = "pt-[7.75rem]";
