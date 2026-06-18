"use client";

import { useEffect, useMemo, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Trash2, Users } from "lucide-react";
import {
  ActionShortsSlide,
  getLinkActions,
} from "@/components/action-shorts-slide";
import { buildFeedActionRotation } from "@/lib/feed/action-rotation";
import { FeedSlideActionRail } from "@/components/feed-slide-action-rail";
import { triggerActionHaptic } from "@/lib/action-shadowing";
import { ensureShareSlug } from "@/lib/rooms/client";
import { linkToShareInput } from "@/lib/share/link-to-share-input";
import { runSystemShare } from "@/lib/share/run-share-destination";
import { supportsNativeShare } from "@/lib/platform/device";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LocateActionResult } from "@/lib/locate/types";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

const ROOM_OFFSET = -96;
const ROOM_VELOCITY = -420;
const DISMISS_OFFSET = 96;
const DISMISS_VELOCITY = 420;

type FeedSwipeSlideProps = {
  link: LinkRow;
  index: number;
  total: number;
  peerLinks?: LinkRow[];
  showCategorySpace?: boolean;
  contextRemote?: ContextRemoteState | null;
  onOpenLink?: (link: LinkRow) => void;
  onDismiss: () => void;
  onSendToRoom: (link: LinkRow, index: number) => void | Promise<void>;
  isActive?: boolean;
  locateResult?: LocateActionResult | null;
  locateLoading?: boolean;
};

export function FeedSwipeSlide({
  link,
  index,
  total,
  peerLinks,
  showCategorySpace = false,
  contextRemote = null,
  onOpenLink,
  onDismiss,
  onSendToRoom,
  isActive = false,
  locateResult = null,
  locateLoading = false,
}: FeedSwipeSlideProps) {
  const [actionIndex, setActionIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [sendingToRoom, setSendingToRoom] = useState(false);
  const x = useMotionValue(0);
  const roomOpacity = useTransform(x, [ROOM_OFFSET, -24, 0], [1, 0.45, 0]);
  const roomScale = useTransform(x, [ROOM_OFFSET, 0], [1, 0.92]);
  const deleteOpacity = useTransform(x, [0, 24, DISMISS_OFFSET], [0, 0.45, 1]);
  const deleteScale = useTransform(x, [0, DISMISS_OFFSET], [0.92, 1]);
  const rotation = useMemo(
    () =>
      buildFeedActionRotation(getLinkActions(link), link.original_url, {
        domain: link.domain,
        category: link.category,
      }),
    [link]
  );

  useEffect(() => {
    setActionIndex(0);
    setShareOpen(false);
    setSendingToRoom(false);
  }, [link.id]);

  const finishDismiss = () => {
    triggerActionHaptic();
    onDismiss();
  };

  const finishSendToRoom = () => {
    if (sendingToRoom) {
      return;
    }

    setSendingToRoom(true);
    triggerActionHaptic();

    void animate(x, 0, {
      type: "spring",
      stiffness: 520,
      damping: 36,
      onComplete: () => {
        void Promise.resolve(onSendToRoom(link, index)).finally(() => {
          setSendingToRoom(false);
        });
      },
    });
  };

  const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (sendingToRoom) {
      return;
    }

    const horizontal =
      Math.abs(info.offset.x) > Math.abs(info.offset.y);
    const horizontalLeft = horizontal && info.offset.x < 0;
    const horizontalRight = horizontal && info.offset.x > 0;

    if (
      horizontalLeft &&
      (info.offset.x < ROOM_OFFSET || info.velocity.x < ROOM_VELOCITY)
    ) {
      finishSendToRoom();
      return;
    }

    if (
      horizontalRight &&
      (info.offset.x > DISMISS_OFFSET || info.velocity.x > DISMISS_VELOCITY)
    ) {
      void animate(x, 520, {
        duration: 0.22,
        ease: [0.32, 0, 0.67, 0],
        onComplete: finishDismiss,
      });
      return;
    }

    void animate(x, 0, {
      type: "spring",
      stiffness: 520,
      damping: 36,
    });
  };

  const handleShare = async () => {
    triggerActionHaptic();

    if (supportsNativeShare()) {
      const shared = await runSystemShare(linkToShareInput(ensureShareSlug(link)));
      if (shared) {
        return;
      }
    }

    setShareOpen(true);
  };

  const handleNextAction = () => {
    triggerActionHaptic();
    setActionIndex((current) => (current + 1) % rotation.length);
  };

  return (
    <div className="relative h-full overflow-hidden bg-rimvio-surface-muted">
      <FeedSlideActionRail
        hasMultipleActions={rotation.length > 1}
        hidden={shareOpen}
        onShare={handleShare}
        onNextAction={handleNextAction}
      />

      <motion.div
        aria-hidden
        style={{ opacity: roomOpacity, scale: roomScale }}
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex items-center justify-end gap-2",
          "bg-rimvio-neon-purple px-8 text-white"
        )}
      >
        <Users className="size-5" strokeWidth={2} />
        <span className="text-sm font-semibold">?�께?�기</span>
      </motion.div>

      <motion.div
        aria-hidden
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex items-center justify-start gap-2",
          "bg-destructive/95 px-8 text-destructive-foreground"
        )}
      >
        <Trash2 className="size-5" strokeWidth={2} />
        <span className="text-sm font-semibold">??��</span>
      </motion.div>

      <motion.div
        style={{ x, touchAction: "pan-y pinch-zoom" }}
        drag={sendingToRoom ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -160, right: 160 }}
        dragElastic={{ left: 0.28, right: 0.28 }}
        onDragEnd={handleDragEnd}
        className="relative z-10 h-full w-full bg-rimvio-surface-muted"
      >
        <ActionShortsSlide
          link={link}
          index={index}
          total={total}
          peerLinks={peerLinks}
          showCategorySpace={showCategorySpace}
          contextRemote={contextRemote}
          onOpenLink={onOpenLink}
          actionIndex={actionIndex}
          shareOpen={shareOpen}
          onShareOpenChange={setShareOpen}
          isActive={isActive}
          locateResult={locateResult}
          locateLoading={locateLoading}
        />
      </motion.div>
    </div>
  );
}
