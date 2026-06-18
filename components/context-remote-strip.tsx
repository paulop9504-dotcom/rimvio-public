"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FeedActionPanel } from "@/components/feed-action-panel";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { useAppLocale } from "@/hooks/use-copy";
import { runRemoteAction } from "@/lib/remote/run-remote-action";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type ContextRemoteStripProps = {
  remote: ContextRemoteState;
  link: LinkRow | null;
  /** Slide 0 shows category pills above — offset remote strip lower. */
  withCategoryRail?: boolean;
  /** When true, remote is handled elsewhere (e.g. category rail button). */
  suppressed?: boolean;
  className?: string;
};

export function ContextRemoteStrip({
  remote,
  link,
  withCategoryRail = false,
  suppressed = false,
  className,
}: ContextRemoteStripProps) {
  const locale = useAppLocale();
  const show = remote.visible && !suppressed;

  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key={`remote-${remote.packId}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-none absolute inset-x-0 z-[28] px-[var(--space-phi)]",
            withCategoryRail
              ? "top-[calc(max(2.85rem,calc(env(safe-area-inset-top)+2.35rem))+4.35rem)]"
              : "top-[max(2.85rem,calc(env(safe-area-inset-top)+2.35rem))]",
            className
          )}
        >
          <FeedActionPanel
            className="pointer-events-auto border-white/60 bg-rimvio-surface/95 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl"
            signalLine={remote.signalLine}
            showPrimary={Boolean(remote.primary)}
            primaryLabel={
              remote.primary
                ? cleanFeedActionLabel(remote.primary.label, locale)
                : ""
            }
            onPrimary={() => {
              if (remote.primary) {
                void runRemoteAction(remote.primary, link);
              }
            }}
            secondary={remote.secondary}
            onSecondary={(action) => void runRemoteAction(action, link)}
            locale={locale}
          />        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Extra top padding when remote strip is expanded on slide 0. */
export const FEED_REMOTE_STRIP_OFFSET = "pt-[9.5rem]";

export function remoteStripPadding(expanded: boolean, withCategoryRail: boolean) {
  if (!expanded) {
    return withCategoryRail ? undefined : undefined;
  }

  return withCategoryRail ? FEED_REMOTE_STRIP_OFFSET : "pt-[6.5rem]";
}
