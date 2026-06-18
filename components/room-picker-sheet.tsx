"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MAX_ROOMS,
  addLinkToRoom,
  addLinksToRoom,
  canCreateRoom,
  createRoom,
  ensureRoomsBootstrapped,
  fetchRoomState,
  readRooms,
} from "@/lib/rooms/client";
import {
  addFriendRoom,
  parseRoomSlug,
  readFriendRooms,
} from "@/lib/rooms/friend-rooms";
import { roomAccentForIndex } from "@/lib/rooms/types";
import type { LinkRow } from "@/types/database";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RoomPickerSheetProps = {
  link?: LinkRow | null;
  links?: LinkRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBulkAdded?: (roomName: string, count: number) => void;
};

export function RoomPickerSheet({
  link = null,
  links = [],
  open,
  onOpenChange,
  onBulkAdded,
}: RoomPickerSheetProps) {
  const copy = useCopy();
  const targetLinks = links.length ? links : link ? [link] : [];
  const [rooms, setRooms] = useState(readRooms());
  const [friendRooms, setFriendRooms] = useState(readFriendRooms());
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    ensureRoomsBootstrapped();
    setRooms(readRooms());
    setFriendRooms(readFriendRooms());
    setCreating(false);
    setNewRoomName("");
    setUrlInput("");
  }, [open]);

  const friendTargets = friendRooms.filter(
    (room) => !rooms.some((item) => item.slug === room.slug)
  );

  const handlePickFriendByUrl = async () => {
    const slug = parseRoomSlug(urlInput);
    if (!slug) {
      toast.error(copy.room.friendRoomInvalidUrl);
      return;
    }

    const state = await fetchRoomState(slug);
    addFriendRoom(state.room);
    setFriendRooms(readFriendRooms());
    await handlePickRoom(slug);
  };

  const handlePickRoom = async (slug: string) => {
    if (!targetLinks.length) {
      return;
    }

    if (targetLinks.length === 1) {
      const { room } = await addLinkToRoom(targetLinks[0], slug);
      onOpenChange(false);
      toast.success(copy.room.addedToRoom, {
        description: copy.room.addedToRoomHint(room.name),
        action: {
          label: copy.room.openRoom,
          onClick: () => {
            window.location.assign(`/r/${room.slug}`);
          },
        },
      });
      return;
    }

    const { room } = await addLinksToRoom(targetLinks, slug);
    onOpenChange(false);
    onBulkAdded?.(room.name, targetLinks.length);
    toast.success(copy.inbox.bulkRoomAdded(targetLinks.length, room.name), {
      action: {
        label: copy.room.openRoom,
        onClick: () => {
          window.location.assign(`/r/${room.slug}`);
        },
      },
    });
  };

  const handleCreateRoom = async () => {
    const { room, error } = createRoom(newRoomName);

    if (error || !room) {
      toast.error(error ?? copy.room.createFail);
      return;
    }

    setRooms(readRooms());
    setCreating(false);
    setNewRoomName("");

    if (targetLinks.length) {
      await handlePickRoom(room.slug);
    }
  };

  return (
    <AnimatePresence>
      {open && targetLinks.length > 0 ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.common.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md"
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
              "fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-md",
              "rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              "bg-gradient-to-b from-background via-background to-muted/30",
              "shadow-[0_-28px_80px_-24px_rgba(0,0,0,0.45)] ring-1 ring-border/30"
            )}
          >
            <div className="relative mx-auto mt-2.5 h-1 w-11 rounded-full bg-muted-foreground/20" />

            <div className="relative px-5 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Users className="size-3.5" />
                    {copy.room.hubTitle}
                  </p>
                  <h2 className="mt-1.5 text-[1.35rem] font-semibold tracking-tight">
                    {copy.room.pickerTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.room.hubSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={copy.common.close}
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                {rooms.map((room, index) => {
                  const accent = roomAccentForIndex(index);

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => void handlePickRoom(room.slug)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-left",
                        "bg-muted/30 ring-1 ring-border/35 transition-colors hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg ring-2",
                          accent.gradient,
                          accent.ring
                        )}
                      >
                        {accent.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{room.name}</span>
                        <span className="text-xs text-muted-foreground">{copy.room.pickerHint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {friendTargets.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {copy.room.friendRoomsTitle}
                  </p>
                  <div className="grid gap-2">
                    {friendTargets.map((room) => (
                      <button
                        key={room.slug}
                        type="button"
                        onClick={() => void handlePickRoom(room.slug)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-left",
                          "bg-rimvio-neon-purple/8 ring-1 ring-[#007AFF]/18 transition-colors hover:bg-rimvio-neon-purple/12"
                        )}
                      >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-rimvio-neon-purple/12 text-rimvio-neon-cyan">
                          <Users className="size-5" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{room.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {copy.room.friendRoomLabel}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                <input
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder={copy.room.friendRoomUrlPlaceholder}
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none ring-primary/20 focus:ring-2"
                />
                <button
                  type="button"
                  disabled={!urlInput.trim()}
                  onClick={() => void handlePickFriendByUrl()}
                  className={cn(
                    "flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold",
                    "bg-muted/45 ring-1 ring-border/40 transition-colors hover:bg-muted/60"
                  )}
                >
                  {copy.room.friendRoomUrlSend}
                </button>
              </div>

              {creating ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={newRoomName}
                    onChange={(event) => setNewRoomName(event.target.value)}
                    placeholder={copy.room.roomNamePlaceholderShort}
                    className="h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none ring-primary/20 focus:ring-2"
                    maxLength={24}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-full"
                      onClick={() => void handleCreateRoom()}
                      disabled={!newRoomName.trim()}
                    >
                      {copy.room.createAndAdd}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setCreating(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : canCreateRoom() ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/70 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground"
                >
                  <Plus className="size-4" />
                  새 방 만들기 ({rooms.length}/{MAX_ROOMS})
                </button>
              ) : (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {copy.room.roomLimitHint}
                </p>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
