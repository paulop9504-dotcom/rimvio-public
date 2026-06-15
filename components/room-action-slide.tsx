"use client";

import { useMemo, useState } from "react";
import { copy } from "@/lib/copy/human-ko";
import { toast } from "sonner";
import { RoomActionDock } from "@/components/room-action-dock";
import { RoomFriendSendSheet } from "@/components/room-friend-send-sheet";
import { ScheduleMediumSheet } from "@/components/schedule-medium-sheet";
import { RoomVisualStack } from "@/components/room-visual-stack";
import { isCommerceLink } from "@/components/price-vote-panel";
import { runLinkActionForLink } from "@/lib/actions/run-link-action-for-link";
import { isScheduleAction } from "@/lib/actions/is-schedule-action";
import { notifyLinkActionResult } from "@/lib/actions/notify-link-action-result";
import { trackActionClick, analyticsFromLink } from "@/lib/analytics/track-client";
import {
  markLinkDone,
  postActionComment,
  postRoomPhasePulse,
  readCommentsForLink,
} from "@/lib/rooms/client";
import { pickRoomPrimaryAction } from "@/lib/rooms/room-phase";
import { resolveRoomPhaseHint } from "@/lib/rooms/room-phase-hint";
import { toastNextLinkSuggestion } from "@/lib/links/next-link-toast";
import { IOS } from "@/lib/ui/ios-surface";
import { GOLDEN } from "@/lib/ui/golden-layout";
import type { RoomPhaseState } from "@/lib/rooms/room-phase";
import type { LinkCommentRow, LinkRow } from "@/types/database";
import type { ScheduleMedium } from "@/lib/preferences/schedule-medium";
import { cn } from "@/lib/utils";

type RoomActionSlideProps = {
  link: LinkRow;
  roomSlug: string;
  roomLinks: LinkRow[];
  comments: LinkCommentRow[];
  openLinks: LinkRow[];
  index: number;
  total: number;
  onRefresh: () => void;
  onScrollToIndex?: (index: number) => void;
  onOpenRoomLink?: (link: LinkRow) => void;
  recentCommentIds?: Set<string>;
  roomPhase?: RoomPhaseState | null;
};

export function RoomActionSlide({
  link,
  roomSlug,
  roomLinks,
  comments,
  openLinks,
  index,
  total,
  onRefresh,
  onScrollToIndex,
  onOpenRoomLink,
  recentCommentIds,
  roomPhase = null,
}: RoomActionSlideProps) {
  const [friendSendOpen, setFriendSendOpen] = useState(false);
  const [schedulePick, setSchedulePick] = useState<{
    action: NonNullable<ReturnType<typeof pickRoomPrimaryAction>>;
    label: string;
  } | null>(null);
  const primary = useMemo(
    () => pickRoomPrimaryAction(link.actions, roomPhase, link) ?? link.actions[0],
    [link, roomPhase]
  );
  const phaseHint = useMemo(
    () => resolveRoomPhaseHint(roomPhase, link.category, copy),
    [link.category, roomPhase]
  );
  const isDone = link.link_status === "done";
  const showPriceVote = isCommerceLink(link);
  const linkComments = useMemo(
    () => comments.filter((comment) => comment.link_id === link.id),
    [comments, link.id]
  );

  const runPrimaryAction = async (medium?: ScheduleMedium) => {
    if (!primary) {
      return;
    }

    const result = await runLinkActionForLink(primary, link, { scheduleMedium: medium });
    trackActionClick({
      ...analyticsFromLink(link, "room"),
      action: primary,
      copySucceeded: Boolean(result.copiedText || result.sharedText),
    });

    void postRoomPhasePulse(roomSlug, primary);
    onRefresh();
    notifyLinkActionResult(result, primary, copy);
  };

  const handlePrimary = async () => {
    if (!primary) {
      return;
    }

    if (isScheduleAction(primary)) {
      setSchedulePick({ action: primary, label: primary.label });
      return;
    }

    await runPrimaryAction();
  };

  const handleDone = async () => {
    const pool = openLinks.filter((item) => item.link_status !== "done");
    await markLinkDone(link, roomSlug);
    toast.success(copy.room.doneToast, {
      description: copy.room.doneToastHint,
    });
    onRefresh();

    if (index < pool.length - 1) {
      onScrollToIndex?.(index);
      toast.message(copy.nextLink.roomDone);
    }

    toastNextLinkSuggestion(link, pool, (next) => {
      const targetIndex = openLinks.findIndex((item) => item.id === next.id);
      if (targetIndex >= 0) {
        onScrollToIndex?.(targetIndex);
      }
    });
  };

  const handleComment = async (input: {
    kind: LinkCommentRow["kind"];
    message: string;
  }) => {
    await postActionComment(link.id, input, roomSlug);
    onRefresh();
  };

  return (
    <section
      className={cn(
        "relative flex h-full min-h-0 w-full shrink-0 snap-start snap-always flex-col",
        IOS.bg,
        "px-[var(--space-phi)] pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div
        className={cn(
          GOLDEN.card,
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-rimvio-surface",
          "p-[var(--space-phi)]",
          "shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-rimvio-neon-purple/12"
        )}
      >
        <div className={GOLDEN.meta}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              {index + 1} / {total}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                isDone
                  ? "bg-emerald-500/12 text-emerald-700"
                  : "bg-rimvio-surface-muted text-muted-foreground"
              )}
            >
              {isDone ? copy.room.statusDone : copy.room.statusOpen}
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5 py-1">
          <RoomVisualStack
            link={link}
            isDone={isDone}
            showPriceVote={showPriceVote}
            linkComments={linkComments}
            onVote={(input) => void handleComment(input)}
          />

          <RoomActionDock
            link={link}
            primary={primary}
            phaseHint={phaseHint}
            roomLinks={roomLinks}
            isDone={isDone}
            comments={
              linkComments.length ? linkComments : readCommentsForLink(link.id)
            }
            recentCommentIds={recentCommentIds}
            onPrimary={handlePrimary}
            onDone={handleDone}
            onComment={handleComment}
            onOpenPeer={onOpenRoomLink}
            onSendToFriend={() => setFriendSendOpen(true)}
          />
        </div>
      </div>

      <ScheduleMediumSheet
        open={Boolean(schedulePick)}
        onOpenChange={(open) => {
          if (!open) {
            setSchedulePick(null);
          }
        }}
        actionLabel={schedulePick?.label}
        onSelect={(medium) => {
          if (!schedulePick) {
            return;
          }
          void runPrimaryAction(medium);
          setSchedulePick(null);
        }}
      />

      <RoomFriendSendSheet
        link={link}
        currentRoomSlug={roomSlug}
        open={friendSendOpen}
        onOpenChange={setFriendSendOpen}
      />
    </section>
  );
}
