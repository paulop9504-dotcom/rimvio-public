"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  FriendAddContactFlow,
  type FriendAddResult,
} from "@/components/peer-chat/friend-add-contact-flow";
import { PeerContactSyncButton } from "@/components/peer-chat/peer-contact-sync-button";
import { useCopy } from "@/hooks/use-copy";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import { cn } from "@/lib/utils";

export type FriendLookupMode = "email" | "rimvio_id" | "phone";

export type FriendAddSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinSlot?: PinnedSlotIndex | null;
  onAdded: (result: FriendAddResult) => void | Promise<void>;
  onContactSynced?: () => void;
};

function normalizeContactInput(mode: FriendLookupMode, raw: string): string {
  const trimmed = raw.trim();
  if (mode === "rimvio_id") {
    return trimmed.replace(/^@+/u, "");
  }
  return trimmed;
}

function placeholderForMode(
  mode: FriendLookupMode,
  labels: {
    placeholderEmail: string;
    placeholderId: string;
    placeholderPhone: string;
  },
): string {
  if (mode === "email") {
    return labels.placeholderEmail;
  }
  if (mode === "rimvio_id") {
    return labels.placeholderId;
  }
  return labels.placeholderPhone;
}

function inputModeForLookup(
  mode: FriendLookupMode,
): React.HTMLAttributes<HTMLInputElement>["inputMode"] {
  if (mode === "email") {
    return "email";
  }
  if (mode === "phone") {
    return "tel";
  }
  return "text";
}

export function FriendAddSheet({
  open,
  onOpenChange,
  pinSlot = null,
  onAdded,
  onContactSynced,
}: FriendAddSheetProps) {
  const copy = useCopy();
  const fa = copy.peers.friendAdd;
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<FriendLookupMode>("email");
  const [rawInput, setRawInput] = useState("");
  const [myRimvioId, setMyRimvioId] = useState<string | null>(null);

  const contact = useMemo(
    () => normalizeContactInput(mode, rawInput),
    [mode, rawInput],
  );

  const isPinMode = pinSlot !== null;
  const title = isPinMode ? fa.pinTitle((pinSlot ?? 0) + 1) : fa.sheetTitle;
  const subtitle = isPinMode ? fa.pinSubtitle : fa.sheetSubtitle;
  const confirmHint = isPinMode ? fa.previewPin : fa.previewTap;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setRawInput("");
      setMode("email");
      return;
    }
    void fetchMyAccountProfile()
      .then((profile) => setMyRimvioId(profile.rimvioId ?? null))
      .catch(() => setMyRimvioId(null));
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

  const copyInvite = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://rimvio.app";
    const welcomeUrl = `${origin}/welcome`;
    const text = myRimvioId?.trim()
      ? fa.inviteWithId(myRimvioId.trim(), welcomeUrl)
      : fa.inviteNoId(welcomeUrl);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(fa.copyInviteDone);
    } catch {
      toast.error("복사하지 못했어요");
    }
  };

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
            className="fixed inset-0 z-[82] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-[83] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-[#0220470f] bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.14)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#d1d6db]" />

            <div className="flex items-start justify-between px-4 pb-2 pt-3">
              <div className="min-w-0 pr-3">
                <h2 className="text-[17px] font-semibold text-[#191f28]">{title}</h2>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#6b7684]">
                  {subtitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#6b7684] hover:bg-[#f2f4f6]"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[min(72dvh,32rem)] space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
              <PeerContactSyncButton
                variant="light"
                onSynced={() => {
                  onContactSynced?.();
                  onOpenChange(false);
                }}
              />

              <div className="flex gap-2">
                {(
                  [
                    ["email", fa.modeEmail],
                    ["rimvio_id", fa.modeId],
                    ["phone", fa.modePhone],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={cn(
                      "flex-1 rounded-full py-2 text-[12px] font-semibold transition",
                      mode === key
                        ? "bg-[#3182f6] text-white shadow-sm"
                        : "bg-[#f2f4f6] text-[#4e5968]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <input
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  placeholder={placeholderForMode(mode, fa)}
                  inputMode={inputModeForLookup(mode)}
                  autoComplete={mode === "email" ? "email" : "off"}
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-[#02204714] bg-[#f9fafb] px-4 text-[15px] text-[#191f28] outline-none placeholder:text-[#8b95a1] focus:border-[#3182f6]/40 focus:bg-white focus:ring-2 focus:ring-[#3182f6]/25"
                />
              </div>

              <FriendAddContactFlow
                contact={contact}
                previewHint={confirmHint}
                loginRequiredMessage={fa.loginRequired}
                loginCtaLabel={fa.loginCta}
                onAdded={async (result) => {
                  await onAdded(result);
                  onOpenChange(false);
                }}
              />

              <div className="rounded-2xl bg-[#f9fafb] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a1]">
                      {fa.myIdLabel}
                    </p>
                    <p className="truncate text-sm font-semibold text-[#191f28]">
                      {myRimvioId ? `@${myRimvioId}` : "설정에서 @아이디를 정해 주세요"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyInvite()}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-[#3182f6] shadow-sm active:scale-[0.98]"
                  >
                    <Copy className="size-3.5" aria-hidden />
                    {fa.copyInvite}
                  </button>
                </div>
              </div>

              {!contact ? (
                <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[11px] text-[#8b95a1]">
                  <UserPlus className="size-3.5" aria-hidden />
                  {fa.listEmptyHint}
                </p>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
