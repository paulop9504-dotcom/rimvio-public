"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { upsertGroupThreadCache } from "@/lib/peer-chat/group-threads-cache";
import { createGroupThreadRemote } from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

export type GroupCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (input: { threadId: string; displayName: string }) => void;
};

function eligibleContacts(contacts: PeerContact[]): PeerContact[] {
  return contacts.filter((row) => isRegisteredPeerDmThread(row.peerThreadId));
}

export function GroupCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: GroupCreateSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contacts = useMemo(() => eligibleContacts(readPeerContacts()), [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setName("");
      setSelected(new Set());
      setError(null);
      setSubmitting(false);
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

  const toggleContact = (threadId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.size < 1) {
      setError("친구 1명 이상을 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroupThreadRemote({
        displayName: name.trim() || "단톡",
        memberThreadIds: [...selected],
      });
      onOpenChange(false);
      upsertGroupThreadCache({
        peerThreadId: result.threadId,
        displayName: result.displayName,
      });
      onCreated({
        threadId: result.threadId,
        displayName: result.displayName,
      });
    } catch (err) {
      setError(
        friendContactErrorMessage(err instanceof Error ? err.message : undefined),
      );
    } finally {
      setSubmitting(false);
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
            className="fixed inset-0 z-[82] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="단톡 만들기"
            className="fixed inset-x-0 bottom-0 z-[83] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-[#0220470f] bg-rimvio-base shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-[#0220470f] px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-[#3182f6]" aria-hidden />
                <h2 className="text-[16px] font-semibold text-[#191f28]">단톡 만들기</h2>
              </div>
              <button
                type="button"
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-full text-[#6b7684] hover:bg-[#f2f4f6]"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[min(70dvh,28rem)] space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
                  방 이름
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="예: 주말 약속"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#02204714] bg-white px-4 text-sm text-[#191f28] outline-none placeholder:text-[#8b95a1] focus:ring-2 focus:ring-[#3182f6]/35"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
                  친구 선택
                </p>
                {contacts.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[#6b7684]">
                    먼저 1:1 친구를 추가해 주세요.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {contacts.map((contact) => {
                      const checked = selected.has(contact.peerThreadId);
                      return (
                        <li key={contact.peerThreadId}>
                          <button
                            type="button"
                            onClick={() => toggleContact(contact.peerThreadId)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                              checked
                                ? "bg-[#e8f3ff] ring-1 ring-[#3182f6]/35"
                                : "bg-[#f8f9fb] hover:bg-[#f2f4f6]",
                            )}
                          >
                            <PeerProfileAvatar
                              displayName={contact.displayName}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#191f28]">
                              {contact.displayName}
                            </span>
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                                checked
                                  ? "border-[#3182f6] bg-[#3182f6] text-white"
                                  : "border-[#02204720] text-transparent",
                              )}
                              aria-hidden
                            >
                              ✓
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {error ? (
                <p className="text-[12px] text-red-600">{error}</p>
              ) : null}
            </div>

            <div className="border-t border-[#0220470f] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <MainActionButton
                label={submitting ? "만드는 중…" : "단톡 시작"}
                disabled={submitting || contacts.length === 0 || selected.size < 1}
                onClick={() => void handleCreate()}
              />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
