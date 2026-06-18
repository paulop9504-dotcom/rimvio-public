"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, X } from "lucide-react";
import { toast } from "sonner";
import { GlobeCreateContextShareStep } from "@/components/globe/globe-create-context-share-step";
import { useAuth } from "@/hooks/use-auth";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  shareGlobeContextWithFriends,
  type GlobeContextShareFriend,
} from "@/lib/experience-bridge/share-context-with-friends";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { copy } from "@/lib/copy/human-ko";

export type GlobeContextShareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  event?: EventCandidate | null;
  onShared?: () => void;
};

/** Map pin share chip — pick friends and send bridge invites. */
export function GlobeContextShareSheet({
  open,
  onOpenChange,
  eventId,
  event: eventProp,
  onShared,
}: GlobeContextShareSheetProps) {
  const titleId = useId();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Map<string, GlobeContextShareFriend>>(
    () => new Map(),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelected(new Map());
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const resolvedEvent =
    eventProp ??
    (eventId ? recoverGlobeContextEventFromPin(eventId) : null);

  const toggleFriend = useCallback((friend: GlobeContextShareFriend) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(friend.userId)) {
        next.delete(friend.userId);
      } else {
        next.set(friend.userId, friend);
      }
      return next;
    });
  }, []);

  const sendInvites = useCallback(async () => {
    if (!resolvedEvent || selected.size === 0 || busy) {
      return;
    }
    setBusy(true);
    try {
      const profile = await fetchMyAccountProfile().catch(() => null);
      const hostDisplayName =
        profile?.displayName?.trim() ||
        profile?.rimvioId?.trim() ||
        user?.email?.split("@")[0] ||
        "나";
      const { invited } = await shareGlobeContextWithFriends({
        event: resolvedEvent,
        hostDisplayName,
        friends: [...selected.values()],
      });
      if (invited > 0) {
        toast.success(`${invited}명에게 초대를 보냈어요`);
        toast.message(copy.globe.bridgeShareNeedsFriendLogin, { duration: 5000 });
        onShared?.();
        onOpenChange(false);
      }
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeShareFail,
      );
    } finally {
      setBusy(false);
    }
  }, [resolvedEvent, selected, busy, user?.email, onShared, onOpenChange]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10080] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[10081] mx-auto flex w-full max-w-lg max-h-[min(82dvh,560px)] flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl"
            data-globe-context-share-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    id={titleId}
                    className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground"
                  >
                    <Share2 className="size-4 text-primary" aria-hidden />
                    {copy.globe.bridgeShareSectionTitle}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {copy.globe.bridgeShareSectionHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full active:bg-muted"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <GlobeCreateContextShareStep
                selectedIds={new Set(selected.keys())}
                onToggle={toggleFriend}
                loading={busy}
              />
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={busy || selected.size === 0 || !resolvedEvent}
                onClick={() => void sendInvites()}
                className="w-full rounded-2xl bg-foreground py-4 text-[16px] font-semibold text-background shadow-sm disabled:opacity-40"
              >
                {selected.size > 0
                  ? `${selected.size}명에게 공유하기`
                  : "친구를 선택하세요"}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
