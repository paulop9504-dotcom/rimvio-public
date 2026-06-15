"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, Sparkles, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  ShareDestinationRow,
  ShareHeroButton,
} from "@/components/share-honeycomb";
import { readLocalLinks } from "@/lib/local-links/store";
import { aggregateCategoryWeights } from "@/lib/personalization/inbox-profile";
import { buildBeamUrl } from "@/lib/share/beam-url";
import { ensureShareSlug } from "@/lib/rooms/client";
import { copy as voice } from "@/lib/copy/human-ko";
import { RoomPickerSheet } from "@/components/room-picker-sheet";
import { linkToShareInput } from "@/lib/share/link-to-share-input";
import {
  getShareDestination,
  rankShareDestinationsWithRank,
  type RankedShareDestination,
} from "@/lib/share/share-destinations";
import {
  runShareDestination,
  runSystemShare,
} from "@/lib/share/run-share-destination";
import {
  getShareSheetCopy,
  getShareToastMessage,
} from "@/lib/share/share-sheet-copy";
import {
  getDomainGradient,
  getDomainInitial,
} from "@/lib/utils/domain-gradient";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type FeedShareSheetProps = {
  link: LinkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function LinkPreviewChip({
  link,
  beamUrl,
}: {
  link: LinkRow;
  beamUrl: string | null;
}) {
  const gradient = getDomainGradient(link.domain);
  const initial = getDomainInitial(link.domain);
  const displayTitle = getDisplayTitleForLink(link) ?? link.domain;
  const copy = getShareSheetCopy(linkToShareInput(link));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02, duration: 0.35 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-muted/35 px-3.5 py-3 ring-1 ring-border/35">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-semibold text-white shadow-sm",
            gradient
          )}
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 text-sm font-medium tracking-tight text-foreground">
            {displayTitle}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{copy.emoji}</span>
            <span className="truncate">{link.domain}</span>
          </span>
        </span>
      </div>

      {beamUrl ? (
        <div className="flex items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 ring-1 ring-primary/15">
          <Zap className="size-4 shrink-0 text-primary" />
          <p className="truncate text-[11px] font-medium text-primary">{beamUrl}</p>
        </div>
      ) : null}
    </motion.div>
  );
}

export function FeedShareSheet({ link, open, onOpenChange }: FeedShareSheetProps) {
  const [weights, setWeights] = useState<ReturnType<typeof aggregateCategoryWeights>>({});
  const [shareLink, setShareLink] = useState<LinkRow | null>(null);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !link) {
      return;
    }

    setShareLink(ensureShareSlug(link));
    setWeights(aggregateCategoryWeights(readLocalLinks()));
  }, [open, link]);

  const shareInput = useMemo(
    () => (shareLink ? linkToShareInput(shareLink) : null),
    [shareLink]
  );

  const destinations = useMemo(() => {
    if (!shareInput) {
      return [];
    }

    return rankShareDestinationsWithRank(shareInput, { limit: 5, weights });
  }, [shareInput, weights]);

  const copy = shareInput ? getShareSheetCopy(shareInput) : null;
  const primary = destinations.find((item) => item.rank === 1);
  const orbitItems = destinations.filter((item) => item.rank > 1);
  const beamUrl = shareLink?.share_slug ? buildBeamUrl(shareLink.share_slug) : null;

  const handleSelect = async (destination: RankedShareDestination) => {
    if (!shareInput) {
      return;
    }

    onOpenChange(false);

    const { copiedText, opened } = await runShareDestination(destination, shareInput);
    const toastCopy = getShareToastMessage(
      destination.label,
      Boolean(copiedText),
      opened
    );

    toast.success(toastCopy.title, { description: toastCopy.description });
  };

  const handleSystemShare = async () => {
    if (!shareInput) {
      return;
    }

    const shared = await runSystemShare(shareInput);
    if (shared) {
      onOpenChange(false);
      return;
    }

    const copyDest = getShareDestination("copy");
    if (copyDest) {
      await runShareDestination(copyDest, shareInput);
      toast.success(voice.share.beamCopied, {
        description: voice.share.pasteHint,
      });
    }
    onOpenChange(false);
  };

  const handleAddToRoom = () => {
    if (!shareLink) {
      return;
    }

    setRoomPickerOpen(true);
  };

  const sheetActionClass = cn(
    "flex min-h-[3.35rem] w-full items-center justify-center gap-2 rounded-2xl px-3",
    "text-sm font-semibold transition-transform active:scale-[0.98]"
  );

  const sheet = (
    <AnimatePresence>
      {open && shareLink && shareInput && copy ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feed-share-title"
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-md",
              "rounded-t-[2rem] pb-[max(1.75rem,env(safe-area-inset-bottom))]",
              "bg-gradient-to-b from-background via-background to-muted/30",
              "shadow-[0_-28px_80px_-24px_rgba(0,0,0,0.45)] ring-1 ring-border/30"
            )}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-foreground/[0.04] blur-3xl" />

            <div className="relative mx-auto mt-2.5 h-1 w-11 rounded-full bg-muted-foreground/20" />

            <div className="relative px-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Sparkles className="size-3.5" strokeWidth={2.25} />
                    {voice.beam.brand}
                  </p>
                  <h2
                    id="feed-share-title"
                    className="mt-1 text-[1.25rem] font-semibold leading-snug tracking-tight text-foreground"
                  >
                    {copy.headline}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{copy.subline}</p>
                </div>

                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => onOpenChange(false)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="size-[1.1rem]" strokeWidth={2.25} />
                </button>
              </div>

              <div className="mt-3">
                <LinkPreviewChip link={shareLink} beamUrl={beamUrl} />
              </div>

              {primary ? (
                <div className="mt-3">
                  <ShareHeroButton
                    destination={primary}
                    onSelect={() => void handleSelect(primary)}
                  />
                </div>
              ) : null}

              {orbitItems.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2.5 px-0.5 text-xs font-medium text-muted-foreground">
                    {voice.share.otherWays}
                  </p>
                  <ShareDestinationRow
                    destinations={orbitItems}
                    onSelect={(destination) => void handleSelect(destination)}
                  />
                </div>
              ) : null}

              <div
                className={cn(
                  "mt-4 grid gap-3",
                  primary?.id !== "native" ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                <button
                  type="button"
                  onClick={handleAddToRoom}
                  className={cn(
                    sheetActionClass,
                    "bg-rimvio-neon-purple/12 text-rimvio-neon-cyan ring-1 ring-[#007AFF]/22"
                  )}
                >
                  <Users className="size-[1.15rem]" strokeWidth={2.25} />
                  {voice.share.roomCollab}
                </button>

                {primary?.id !== "native" ? (
                  <button
                    type="button"
                    onClick={() => void handleSystemShare()}
                    className={cn(
                      sheetActionClass,
                      "bg-muted/55 text-foreground ring-1 ring-border/45"
                    )}
                  >
                    <Share2 className="size-[1.15rem]" strokeWidth={2.25} />
                    {voice.share.beamShare}
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
                {voice.share.footnote}
              </p>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      {mounted ? createPortal(sheet, document.body) : null}

    <RoomPickerSheet
      link={shareLink}
      open={roomPickerOpen}
      onOpenChange={(next) => {
        setRoomPickerOpen(next);
        if (!next) {
          onOpenChange(false);
        }
      }}
    />
    </>
  );
}
