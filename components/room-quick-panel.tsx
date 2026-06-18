"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  ActionCommentComposer,
  ActionCommentLog,
} from "@/components/action-comment-log";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { getFeedSiteLabel } from "@/lib/feed/feed-display";
import type { RoomSparkLink } from "@/lib/links/room-spark-links";
import type { LinkCommentRow, LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type RoomQuickPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  kind: "comments" | "peers" | "sparks";
  comments?: LinkCommentRow[];
  recentCommentIds?: Set<string>;
  peers?: LinkRow[];
  sparks?: RoomSparkLink[];
  isDone?: boolean;
  onComment?: (input: {
    kind: LinkCommentRow["kind"];
    message: string;
  }) => void | Promise<void>;
  onOpenPeer?: (link: LinkRow) => void;
};

export function RoomQuickPanel({
  open,
  onOpenChange,
  title,
  kind,
  comments = [],
  recentCommentIds,
  peers = [],
  sparks = [],
  isDone = false,
  onComment,
  onOpenPeer,
}: RoomQuickPanelProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-md",
              "rounded-t-[1.75rem] bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4",
              "shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.06]"
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={handleClose}
                className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {kind === "comments" ? (
              <div className="max-h-[min(42dvh,18rem)] space-y-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ActionCommentLog
                  comments={comments}
                  highlightIds={recentCommentIds}
                />
                <ActionCommentComposer
                  onSubmit={(input) => void onComment?.(input)}
                  disabled={isDone}
                />
              </div>
            ) : null}

            {kind === "peers" ? (
              <div className="grid gap-2">
                {peers.map((peer) => {
                  const label = getDisplayTitleForLink(peer) ?? getFeedSiteLabel(peer);
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => {
                        onOpenPeer?.(peer);
                        handleClose();
                      }}
                      className="rounded-2xl bg-[#f2f2f7] px-4 py-3 text-left ring-1 ring-black/[0.04] active:scale-[0.99]"
                    >
                      <p className="line-clamp-2 text-sm font-medium">{label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getFeedSiteLabel(peer)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {kind === "sparks" ? (
              <div className="grid gap-2">
                {sparks.map((spark) => (
                  <a
                    key={spark.id}
                    href={spark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 px-4 py-3 ring-1 ring-violet-200/60 active:scale-[0.99]"
                  >
                    <p className="text-sm font-medium">{spark.title}</p>
                    <p className="mt-0.5 text-xs text-violet-700/80">{spark.subtitle}</p>
                  </a>
                ))}
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
