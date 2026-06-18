"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Pin, PinOff, X } from "lucide-react";
import { toast } from "sonner";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { pinFeedSlotRemote } from "@/lib/peer-chat/peer-chat-client";
import { formatRelativeKo } from "@/lib/time/format-relative-ko";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";

type RelationshipFeedSlotSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: RelationshipFeedSlot[];
  onRefresh: () => void;
};

export function RelationshipFeedSlotSheet({
  open,
  onOpenChange,
  slots,
  onRefresh,
}: RelationshipFeedSlotSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const togglePin = useCallback(
    (slot: RelationshipFeedSlot) => {
      void pinFeedSlotRemote({
        roomId: slot.roomId,
        pinned: !slot.isPinned,
      })
        .then(() => {
          onRefresh();
          toast.success(slot.isPinned ? "고정 해제" : "상단에 고정했어요");
        })
        .catch(() => toast.error("고정에 실패했어요"));
    },
    [onRefresh],
  );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[80] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="대화"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(82vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-rimvio-base shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25" aria-hidden />

            <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
              <MessageCircle className="size-5 text-rimvio-neon-cyan" aria-hidden />
              <h2 className="min-w-0 flex-1 text-base font-semibold text-white">대화</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full active:bg-white/10"
                aria-label="닫기"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            {slots.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <p className="text-sm text-white/55">아직 대화가 없어요</p>
                <p className="text-[11px] leading-relaxed text-white/40">
                  친구에게 첫 메시지를 내면 여기에 쌓여요
                </p>
                <Link
                  href="/peers"
                  className="mt-4 text-sm font-semibold text-rimvio-neon-cyan"
                  onClick={() => onOpenChange(false)}
                >
                  친구 찾기 →
                </Link>
              </div>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-white/10 overflow-y-auto overscroll-y-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {slots.map((slot) => {
                  const href = `/peers/${encodeURIComponent(slot.roomId)}`;
                  return (
                    <li key={slot.slotId}>
                      <div className="flex items-stretch">
                        <Link
                          href={href}
                          onClick={() => onOpenChange(false)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]"
                        >
                          <PeerProfileAvatar
                            displayName={slot.displayName}
                            avatarUrl={slot.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">
                                  {slot.displayName}
                                </p>
                                {slot.rimvioId ? (
                                  <p className="truncate text-[11px] text-[#FEE500]/85">
                                    @{slot.rimvioId}
                                  </p>
                                ) : null}
                              </div>
                              {slot.isPinned ? (
                                <Pin
                                  className="size-3 shrink-0 text-amber-400/90"
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <p className="truncate text-[13px] text-white/55">
                              {slot.lastMessage?.trim() || "대화 시작"}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5 pl-1">
                            <span className="text-[11px] tabular-nums text-white/45">
                              {formatRelativeKo(slot.lastActivityAt)}
                            </span>
                            {slot.unreadCount > 0 ? (
                              <span
                                className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                                aria-label={`읽지 않음 ${slot.unreadCount}`}
                              />
                            ) : (
                              <span className="size-2.5" aria-hidden />
                            )}
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => togglePin(slot)}
                          className="flex w-11 shrink-0 items-center justify-center text-white/40 active:bg-white/[0.06]"
                          aria-label={slot.isPinned ? "고정 해제" : "상단 고정"}
                        >
                          {slot.isPinned ? (
                            <PinOff className="size-4" />
                          ) : (
                            <Pin className="size-4" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
