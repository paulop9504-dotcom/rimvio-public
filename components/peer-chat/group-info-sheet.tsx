"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Link2, LogOut, Users, X } from "lucide-react";
import { toast } from "sonner";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useAuth } from "@/hooks/use-auth";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { filterContactsForGroupAdd } from "@/lib/peer-chat/group-member-eligibility";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { unpinPeerFromHub } from "@/lib/context/pinned-peer-roster";
import {
  readPinnedRoster,
  writePinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import {
  removeGroupThreadCache,
  upsertGroupThreadCache,
} from "@/lib/peer-chat/group-threads-cache";
import {
  addGroupMembersRemote,
  buildPeerInviteUrl,
  fetchPeerThreadMembers,
  leaveGroupThreadRemote,
  renameGroupThreadRemote,
  type PeerThreadMemberPublic,
} from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

export type GroupInfoSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  displayName: string;
  inviteCode: string | null;
  onRenamed?: (displayName: string) => void;
};

function memberLabel(member: PeerThreadMemberPublic): string {
  if (member.isSelf) {
    return "나";
  }
  return (
    member.displayName?.trim() ||
    (member.rimvioId ? `@${member.rimvioId}` : "친구")
  );
}

export function GroupInfoSheet({
  open,
  onOpenChange,
  threadId,
  displayName,
  inviteCode,
  onRenamed,
}: GroupInfoSheetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<PeerThreadMemberPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = inviteCode ? buildPeerInviteUrl(inviteCode) : null;

  const memberUserIds = useMemo(
    () => new Set(members.map((row) => row.userId)),
    [members],
  );

  const addableContacts = useMemo(() => {
    if (!user?.id) {
      return [];
    }
    return filterContactsForGroupAdd({
      contacts: readPeerContacts(),
      memberUserIds,
      callerUserId: user.id,
    });
  }, [memberUserIds, user?.id, open]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPeerThreadMembers(threadId);
      setMembers(rows);
    } catch (err) {
      setError(
        friendContactErrorMessage(err instanceof Error ? err.message : undefined),
      );
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName, open]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setError(null);
      setAdding(false);
      setRenaming(false);
      setLeaving(false);
      setCopied(false);
      return;
    }
    void loadMembers();
  }, [open, loadMembers]);

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

  const toggleContact = (peerThreadId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(peerThreadId)) {
        next.delete(peerThreadId);
      } else {
        next.add(peerThreadId);
      }
      return next;
    });
  };

  const copyInvite = async () => {
    if (!inviteUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("초대 링크를 복사했어요");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했어요");
    }
  };

  const handleRename = async () => {
    const nextName = nameDraft.trim();
    if (!nextName || nextName === displayName.trim()) {
      return;
    }
    setRenaming(true);
    setError(null);
    try {
      const result = await renameGroupThreadRemote({
        threadId,
        displayName: nextName,
      });
      upsertGroupThreadCache({
        peerThreadId: threadId,
        displayName: result.displayName,
      });
      onRenamed?.(result.displayName);
      toast.success("방 이름을 바꿨어요");
    } catch (err) {
      setError(
        friendContactErrorMessage(err instanceof Error ? err.message : undefined),
      );
    } finally {
      setRenaming(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    setError(null);
    try {
      await leaveGroupThreadRemote(threadId);
      removeGroupThreadCache(threadId);
      const roster = unpinPeerFromHub(readPinnedRoster(), threadId);
      writePinnedRoster(roster);
      onOpenChange(false);
      toast.success("단톡에서 나왔어요");
      router.replace("/peers");
    } catch (err) {
      setError(
        friendContactErrorMessage(err instanceof Error ? err.message : undefined),
      );
      setLeaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (selected.size < 1) {
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const result = await addGroupMembersRemote({
        threadId,
        memberThreadIds: [...selected],
      });
      setMembers(result.members);
      setSelected(new Set());
      if (result.addedUserIds.length > 0) {
        toast.success(`멤버 ${result.addedUserIds.length}명을 초대했어요`);
      } else {
        toast.message("이미 참여 중인 친구예요");
      }
    } catch (err) {
      setError(
        friendContactErrorMessage(err instanceof Error ? err.message : undefined),
      );
    } finally {
      setAdding(false);
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
            aria-label="단톡 정보"
            className="fixed inset-x-0 bottom-0 z-[83] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-[#0220470f] bg-rimvio-base shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-[#0220470f] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
                  <h2 className="truncate text-[16px] font-semibold text-[#191f28]">
                    {displayName}
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] text-[#6b7684]">
                  {loading ? "불러오는 중…" : `멤버 ${members.length}명`}
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

            <div className="max-h-[min(72dvh,32rem)] space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
                  방 이름
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    placeholder="예: 주말 스터디"
                    className="h-11 min-w-0 flex-1 rounded-2xl border border-[#02204714] bg-white px-4 text-sm text-[#191f28] outline-none placeholder:text-[#8b95a1] focus:ring-2 focus:ring-[#3182f6]/35"
                  />
                  <button
                    type="button"
                    disabled={
                      renaming ||
                      !nameDraft.trim() ||
                      nameDraft.trim() === displayName.trim()
                    }
                    onClick={() => void handleRename()}
                    className="shrink-0 rounded-2xl bg-[#e8f3ff] px-3 text-[12px] font-semibold text-[#1b64da] disabled:opacity-40"
                  >
                    {renaming ? "저장 중…" : "저장"}
                  </button>
                </div>
              </div>

              {inviteUrl && inviteCode ? (
                <div className="rounded-2xl bg-rimvio-neon-cyan/8 px-3 py-3 ring-1 ring-rimvio-neon-cyan/20">
                  <div className="flex items-start gap-2">
                    <Link2
                      className="mt-0.5 size-4 shrink-0 text-rimvio-neon-cyan"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-[#191f28]">
                        초대 링크
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#6b7684]">
                        링크로 들어오면 같은 단톡에서 대화해요
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-[#8b95a1]">
                        코드: {inviteCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyInvite()}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-[#02204714] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#191f28] active:scale-[0.98]"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-400" aria-hidden />
                      ) : (
                        <Copy className="size-3.5" aria-hidden />
                      )}
                      {copied ? "복사됨" : "링크 복사"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
                  멤버
                </p>
                {loading ? (
                  <ul className="mt-2 space-y-1.5">
                    {[0, 1, 2].map((key) => (
                      <li
                        key={key}
                        className="h-11 animate-pulse rounded-2xl bg-[#f2f4f6]"
                      />
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {members.map((member) => (
                      <li
                        key={member.userId}
                        className="flex items-center gap-3 rounded-2xl bg-[#f8f9fb] px-3 py-2.5"
                      >
                        <PeerProfileAvatar
                          displayName={memberLabel(member)}
                          avatarUrl={member.avatarUrl}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#191f28]">
                          {memberLabel(member)}
                        </span>
                        {member.rimvioId && !member.isSelf ? (
                          <span className="shrink-0 font-mono text-[11px] text-[#1b64da]">
                            @{member.rimvioId}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
                  친구 초대
                </p>
                {addableContacts.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[#6b7684]">
                    추가할 1:1 친구가 없어요. 초대 링크를 공유해 보세요.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {addableContacts.map((contact) => {
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

              <button
                type="button"
                disabled={leaving}
                onClick={() => void handleLeave()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600 ring-1 ring-red-200 disabled:opacity-50"
              >
                <LogOut className="size-4" aria-hidden />
                {leaving ? "나가는 중…" : "단톡 나가기"}
              </button>
            </div>

            {addableContacts.length > 0 ? (
              <div className="border-t border-[#0220470f] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <MainActionButton
                  label={adding ? "초대 중…" : "선택한 친구 초대"}
                  disabled={adding || selected.size < 1}
                  onClick={() => void handleAddMembers()}
                />
              </div>
            ) : (
              <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
