"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageCircle, User, X } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import type { FeedSlotPeerContext } from "@/lib/feed/feed-slot-peer-context-types";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";

export type FeedSlotPeerDetailCopy = {
  title: string;
  rimvioId: string;
  email: string;
  openChat: string;
  close: string;
};

export type FeedSlotPeerDetailSheetProps = {
  peer: FeedSlotPeerContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat: (peer: FeedSlotPeerContext) => void;
  copy: FeedSlotPeerDetailCopy;
};

export function FeedSlotPeerDetailSheet({
  peer,
  open,
  onOpenChange,
  onOpenChat,
  copy,
}: FeedSlotPeerDetailSheetProps) {
  const [mounted, setMounted] = useState(false);
  const phoneDm = peer ? isRegisteredPeerDmThread(peer.peerThreadId) : false;
  const { profile, loading } = useDmPeerProfile(peer?.peerThreadId ?? null, open && phoneDm);

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

  const displayName = profile?.displayName?.trim() || peer?.displayName || "";
  const rimvioId = profile?.rimvioId?.trim() || peer?.rimvioId?.trim() || null;
  const email =
    profile?.emailLower?.trim() || peer?.emailLower?.trim() || null;
  const avatarUrl = profile?.avatarUrl ?? peer?.avatarUrl ?? null;

  return createPortal(
    <AnimatePresence>
      {open && peer ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.close}
            className="fixed inset-0 z-[82] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={copy.title}
            className="fixed inset-x-0 bottom-0 z-[83] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-white/10 bg-rimvio-base shadow-[0_-12px_40px_rgba(0,0,0,0.4)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25" aria-hidden />

            <header className="flex items-center gap-2 px-4 pb-2 pt-3">
              <h2 className="min-w-0 flex-1 text-[15px] font-semibold text-white/70">
                {copy.title}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full active:bg-white/10"
                aria-label={copy.close}
              >
                <X className="size-5 text-white/70" aria-hidden />
              </button>
            </header>

            <div className="flex flex-col items-center px-6 pb-4 pt-2 text-center">
              <PeerProfileAvatar
                displayName={displayName}
                avatarUrl={avatarUrl}
                size="lg"
                className="size-20 text-2xl"
              />
              <p className="mt-4 text-[20px] font-bold tracking-tight text-white">
                {displayName}
              </p>
              {loading ? (
                <p className="mt-2 text-[12px] text-white/35">불러오는 중…</p>
              ) : null}
            </div>

            <dl className="mx-4 space-y-2 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06]">
              {rimvioId ? (
                <div className="flex items-center gap-3 py-1.5">
                  <User className="size-4 shrink-0 text-[#FEE500]/90" aria-hidden />
                  <div className="min-w-0 text-left">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                      {copy.rimvioId}
                    </dt>
                    <dd className="truncate text-[14px] font-semibold text-[#FEE500]">
                      @{rimvioId}
                    </dd>
                  </div>
                </div>
              ) : null}

              {email ? (
                <div className="flex items-center gap-3 py-1.5">
                  <Mail className="size-4 shrink-0 text-sky-400/90" aria-hidden />
                  <div className="min-w-0 text-left">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                      {copy.email}
                    </dt>
                    <dd className="truncate text-[14px] font-medium text-white/88">
                      {email}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>

            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-black transition-opacity hover:opacity-92 active:scale-[0.99]"
                onClick={() => {
                  onOpenChat(peer);
                  onOpenChange(false);
                }}
              >
                <MessageCircle className="size-5" aria-hidden />
                {copy.openChat}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
