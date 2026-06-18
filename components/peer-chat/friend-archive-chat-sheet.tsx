"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { FriendArchiveChatList } from "@/components/peer-chat/friend-archive-chat-list";
import type { ArchiveChatRow } from "@/lib/social/archive-chat-rows";

export type FriendArchiveChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly ArchiveChatRow[];
};

export function FriendArchiveChatSheet({
  open,
  onOpenChange,
  rows,
}: FriendArchiveChatSheetProps) {
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
            aria-label="구슬 주머니"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(82vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-[#0220470f] bg-rimvio-base shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#d1d6db]" aria-hidden />

            <header className="flex shrink-0 items-center gap-2 border-b border-[#0220470f] px-4 py-3">
              <Users className="size-5 text-[#3182f6]" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-[#191f28]">구슬 주머니</h2>
                <p className="text-[11px] text-[#6b7684]">톡 오면 맨 위로 올라와요</p>
              </div>
              <Link
                href="/peers/archive"
                onClick={() => onOpenChange(false)}
                className="shrink-0 text-[12px] font-semibold text-[#3182f6]"
              >
                전체
              </Link>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full text-[#6b7684] active:bg-[#f2f4f6]"
                aria-label="닫기"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <FriendArchiveChatList
              rows={rows}
              onSelect={() => onOpenChange(false)}
              className="min-h-0 flex-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
