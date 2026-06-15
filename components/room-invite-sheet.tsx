"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Share2, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  ShareHeroButton,
  ShareOrbitCluster,
} from "@/components/share-honeycomb";
import { buildRoomUrl } from "@/lib/share/beam-url";
import { roomAccentForRoom } from "@/lib/rooms/types";
import { readRooms } from "@/lib/rooms/client";
import {
  getRoomInviteToastMessage,
  rankRoomInviteDestinations,
  runRoomInviteDestination,
  runRoomSystemShare,
  type RankedRoomInviteDestination,
} from "@/lib/share/room-invite-destinations";
import type { RoomRow } from "@/lib/rooms/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

type RoomInviteSheetProps = {
  room: RoomRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function RoomPreviewChip({ room }: { room: RoomRow }) {
  const rooms = readRooms();
  const accent = roomAccentForRoom(room, rooms);
  const roomUrl = buildRoomUrl(room.slug);

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
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-sm ring-2",
            accent.gradient,
            accent.ring
          )}
        >
          {accent.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 text-sm font-medium tracking-tight text-foreground">
            {room.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="size-3" />
            <span>같이 해볼 목록</span>
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-violet-500/5 px-3 py-2 ring-1 ring-violet-500/15">
        <Sparkles className="size-4 shrink-0 text-rimvio-neon-purple" />
        <p className="truncate text-[11px] font-medium text-violet-700 dark:text-violet-300">
          {roomUrl}
        </p>
      </div>
    </motion.div>
  );
}

export function RoomInviteSheet({ room, open, onOpenChange }: RoomInviteSheetProps) {
  const destinations = rankRoomInviteDestinations();
  const primary = destinations.find((item) => item.rank === 1);
  const orbitItems = destinations.filter((item) => item.rank > 1);

  const handleSelect = async (destination: RankedRoomInviteDestination) => {
    if (!room) {
      return;
    }

    onOpenChange(false);

    const { copiedText, opened } = await runRoomInviteDestination(destination, room);
    const toastCopy = getRoomInviteToastMessage(
      destination.label,
      Boolean(copiedText),
      opened
    );

    toast.success(toastCopy.title, { description: toastCopy.description });
  };

  const handleSystemShare = async () => {
    if (!room) {
      return;
    }

    const shared = await runRoomSystemShare(room);
    if (shared) {
      onOpenChange(false);
      return;
    }

    const copyDest = destinations.find((item) => item.id === "copy");
    if (copyDest) {
      await runRoomInviteDestination(copyDest, room);
      toast.success("입장권 복사됐어요", { description: "원하는 앱에 붙여넣기 해 주세요" });
    }
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && room ? (
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
            aria-labelledby="room-invite-title"
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-md",
              "rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              "bg-gradient-to-b from-background via-background to-muted/30",
              "shadow-[0_-28px_80px_-24px_rgba(0,0,0,0.45)] ring-1 ring-border/30"
            )}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-violet-500/[0.06] blur-3xl" />

            <div className="relative mx-auto mt-2.5 h-1 w-11 rounded-full bg-muted-foreground/20" />

            <div className="relative px-5 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Users className="size-3.5" strokeWidth={2.25} />
                    {copy.room.inviteTitle}
                  </p>
                  <h2
                    id="room-invite-title"
                    className="mt-1.5 text-[1.35rem] font-semibold leading-snug tracking-tight text-foreground"
                  >
                    친구 불러 같이 해봐요
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    링크 말고, 들어오면 바로 보이는 초대예요
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="size-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="mt-4">
                <RoomPreviewChip room={room} />
              </div>

              {primary ? (
                <div className="mt-4">
                  <ShareHeroButton
                    destination={primary}
                    onSelect={() => void handleSelect(primary)}
                  />
                </div>
              ) : null}

              {orbitItems.length > 0 ? (
                <div className="mt-2">
                  <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
                    {copy.share.otherWays}
                  </p>
                  <ShareOrbitCluster
                    destinations={orbitItems}
                    onSelect={(destination) =>
                      void handleSelect(destination as RankedRoomInviteDestination)
                    }
                  />
                </div>
              ) : null}

              <div className="mt-3 flex justify-center pb-1">
                <button
                  type="button"
                  onClick={() => void handleSystemShare()}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2",
                    "text-xs font-medium text-muted-foreground",
                    "transition-colors hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Share2 className="size-3.5" strokeWidth={2} />
                  다른 앱으로 초대
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
