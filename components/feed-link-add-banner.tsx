"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCopy } from "@/hooks/use-copy";
import {
  resolveLinkAddPrompt,
  type LinkAddPromptKind,
} from "@/lib/feed/link-add-prompts";
import type { FeedCategoryFilter } from "@/lib/categories/types";
import { cn } from "@/lib/utils";
import { IOS } from "@/lib/ui/ios-surface";

type FeedLinkAddBannerProps = {
  activeCount: number;
  filter: FeedCategoryFilter;
  visibleCount: number;
  activeIndex: number;
  className?: string;
  onAddLink?: () => void;
};

function promptMessage(
  kind: LinkAddPromptKind,
  copy: ReturnType<typeof useCopy>
) {
  switch (kind) {
    case "single_link":
      return copy.feed.linkAddSingle;
    case "low_inventory":
      return copy.feed.linkAddLow;
    case "reached_end":
      return copy.feed.linkAddEnd;
  }
}

export function FeedLinkAddBanner({
  activeCount,
  filter,
  visibleCount,
  activeIndex,
  className,
  onAddLink,
}: FeedLinkAddBannerProps) {
  const copy = useCopy();
  const kind = resolveLinkAddPrompt({
    activeCount,
    filter,
    visibleCount,
    activeIndex,
  });

  return (
    <AnimatePresence>
      {kind ? (
        <motion.div
          key={kind}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className={cn(
            "pointer-events-auto mx-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-sm",
            IOS.cardSm,
            className
          )}
        >
          <p className="min-w-0 flex-1 text-left text-[13px] leading-snug text-foreground/90">
            {promptMessage(kind, copy)}
          </p>
          <button
            type="button"
            onClick={onAddLink}
            className="shrink-0 rounded-full bg-rimvio-neon-purple px-3 py-1.5 text-xs font-semibold text-white active:scale-[0.98]"
          >
            {copy.feed.capturePill}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
