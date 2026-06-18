"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  addFriendRoom,
  parseRoomSlug,
  readFriendRooms,
} from "@/lib/rooms/friend-rooms";
import {
  fetchRoomState,
  getRoomBySlug,
  readRooms,
  sendLinkToRemoteRoom,
} from "@/lib/rooms/client";
import { roomAccentForIndex } from "@/lib/rooms/types";
import { useCopy } from "@/hooks/use-copy";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type RoomFriendSendSheetProps = {
  link: LinkRow | null;
  currentRoomSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SendTarget = {
  slug: string;
  name: string;
  kind: "own" | "friend";
};

export function RoomFriendSendSheet({
  link,
  currentRoomSlug,
  open,
  onOpenChange,
}: RoomFriendSendSheetProps) {
  const copy = useCopy();
  const [mounted, setMounted] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [sendingSlug, setSendingSlug] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setUrlInput("");
      setSendingSlug(null);
      return;
    }

    setRefreshKey((value) => value + 1);
  }, [open]);

  const targets = useMemo(() => {
    void refreshKey;

    const own = readRooms()
      .filter((room) => room.slug !== currentRoomSlug)
      .map(
        (room): SendTarget => ({
          slug: room.slug,
          name: room.name,
          kind: "own",
        })
      );

    const friends = readFriendRooms()
      .filter((room) => room.slug !== currentRoomSlug)
      .filter((room) => !own.some((item) => item.slug === room.slug))
      .map(
        (room): SendTarget => ({
          slug: room.slug,
          name: room.name,
          kind: "friend",
        })
      );

    return [...own, ...friends];
  }, [currentRoomSlug, refreshKey]);

  const handleSend = async (target: SendTarget) => {
    if (!link || sendingSlug) {
      return;
    }

    setSendingSlug(target.slug);

    try {
      const { room } = await sendLinkToRemoteRoom(link, target.slug);
      onOpenChange(false);
      toast.success(copy.room.friendRoomSent(room.name), {
        description: copy.room.friendRoomSentHint,
        action: {
          label: copy.room.openRoom,
          onClick: () => {
            window.location.assign(`/r/${room.slug}`);
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.room.friendRoomSendFail
      );
    } finally {
      setSendingSlug(null);
    }
  };

  const handleSendByUrl = async () => {
    if (!link) {
      return;
    }

    const slug = parseRoomSlug(urlInput);
    if (!slug) {
      toast.error(copy.room.friendRoomInvalidUrl);
      return;
    }

    if (slug === currentRoomSlug) {
      toast.error(copy.room.friendRoomSame);
      return;
    }

    setSendingSlug(slug);

    try {
      let name = getRoomBySlug(slug)?.name ?? readFriendRooms().find((r) => r.slug === slug)?.name;

      if (!name) {
        const state = await fetchRoomState(slug);
        addFriendRoom(state.room);
        name = state.room.name;
        setRefreshKey((value) => value + 1);
      }

      const { room } = await sendLinkToRemoteRoom(link, slug);
      onOpenChange(false);
      toast.success(copy.room.friendRoomSent(room.name), {
        description: copy.room.friendRoomSentHint,
        action: {
          label: copy.room.openRoom,
          onClick: () => {
            window.location.assign(`/r/${room.slug}`);
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.room.friendRoomSendFail
      );
    } finally {
      setSendingSlug(null);
    }
  };

  const sheet = (
    <AnimatePresence>
      {open && link ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.common.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[62] bg-black/50 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[63] mx-auto w-full max-w-md",
              "rounded-t-[2rem] pb-[max(1.75rem,env(safe-area-inset-bottom))]",
              "bg-gradient-to-b from-background via-background to-muted/30",
              "shadow-[0_-28px_80px_-24px_rgba(0,0,0,0.45)] ring-1 ring-border/30"
            )}
          >
            <div className="relative mx-auto mt-2.5 h-1 w-11 rounded-full bg-muted-foreground/20" />

            <div className="relative px-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <SendHorizonal className="size-3.5" strokeWidth={2.25} />
                    {copy.room.friendRoomsTitle}
                  </p>
                  <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight">
                    {copy.room.friendSendTitle}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {copy.room.friendSendHint}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={copy.common.close}
                  onClick={() => onOpenChange(false)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
                >
                  <X className="size-[1.1rem]" strokeWidth={2.25} />
                </button>
              </div>

              {targets.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {targets.map((target, index) => {
                    const accent = roomAccentForIndex(index);
                    const isFriend = target.kind === "friend";

                    return (
                      <button
                        key={target.slug}
                        type="button"
                        disabled={Boolean(sendingSlug)}
                        onClick={() => void handleSend(target)}
                        className={cn(
                          "flex min-h-[3.25rem] items-center gap-3 rounded-2xl px-4 py-3 text-left",
                          "bg-muted/30 ring-1 ring-border/35 transition-colors hover:bg-muted/50",
                          "disabled:opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg ring-2",
                            accent.gradient,
                            accent.ring
                          )}
                        >
                          {isFriend ? (
                            <UserRound className="size-5 text-white" strokeWidth={2.25} />
                          ) : (
                            accent.emoji
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{target.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {isFriend ? copy.room.friendRoomLabel : copy.room.pickerHint}
                          </span>
                        </span>
                        {sendingSlug === target.slug ? (
                          <span className="text-xs text-muted-foreground">…</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-muted/25 px-4 py-5 text-center">
                  <Users className="mx-auto size-7 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {copy.room.friendRoomsEmpty}
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <input
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder={copy.room.friendRoomUrlPlaceholder}
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none ring-primary/20 focus:ring-2"
                />
                <button
                  type="button"
                  disabled={!urlInput.trim() || Boolean(sendingSlug)}
                  onClick={() => void handleSendByUrl()}
                  className={cn(
                    "flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl",
                    "bg-rimvio-neon-purple/12 text-sm font-semibold text-rimvio-neon-cyan ring-1 ring-[#007AFF]/22",
                    "transition-transform active:scale-[0.98] disabled:opacity-45"
                  )}
                >
                  <SendHorizonal className="size-4" strokeWidth={2.25} />
                  {copy.room.friendRoomUrlSend}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(sheet, document.body);
}
