"use client";

import Link from "next/link";
import { useState } from "react";
import { Pin, PinOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { PeerPublicProfileSheet } from "@/components/peer-chat/peer-public-profile-sheet";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { findConnectedPeerSlot } from "@/lib/context/pinned-peer-roster";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import {
  readPinnedRoster,
  setPeerThreadPinned,
  syncPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { PeerContactSyncButton } from "@/components/peer-chat/peer-contact-sync-button";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type PeerContactsListProps = {
  contacts: PeerContact[];
  onRefresh: () => void;
  onAddClick: () => void;
  className?: string;
};

function PeerContactRow({
  contact,
  pinned,
  onPinToggle,
}: {
  contact: PeerContact;
  pinned: boolean;
  onPinToggle: (pinned: boolean) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const phoneDm = isRegisteredPeerDmThread(contact.peerThreadId);
  const { profile, loading } = useDmPeerProfile(contact.peerThreadId, phoneDm);
  const displayName =
    profile?.displayName?.trim() || contact.displayName;
  const href = `/peers/${encodeURIComponent(contact.peerThreadId)}`;

  return (
    <li className="flex items-center gap-2 bg-rimvio-surface">
      <div className="pl-4">
        {phoneDm ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="shrink-0 rounded-full active:opacity-80"
            aria-label={`${displayName} 프로필`}
          >
            <PeerProfileAvatar
              displayName={displayName}
              avatarUrl={profile?.avatarUrl}
              size="sm"
            />
          </button>
        ) : (
          <PeerProfileAvatar displayName={displayName} size="sm" />
        )}
      </div>
      <Link
        href={href}
        onMouseEnter={() => prefetchPeerMessages(contact.peerThreadId)}
        onTouchStart={() => prefetchPeerMessages(contact.peerThreadId)}
        className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-2 active:bg-rimvio-surface-muted"
      >
        <p className="truncate font-medium text-white">{displayName}</p>
        <p className="truncate text-[11px] text-white/60">
          {profile?.rimvioId
            ? `@${profile.rimvioId}`
            : pinned
              ? "AI 허브 · @import 가능"
              : "1:1 대화"}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => onPinToggle(!pinned)}
        className="mr-3 flex size-9 shrink-0 items-center justify-center rounded-full text-rimvio-neon-cyan active:bg-rimvio-neon-purple/10"
        aria-label={pinned ? "AI 허브 해제" : "AI 허브에 꽂기"}
      >
        {pinned ? (
          <PinOff className="size-4" aria-hidden />
        ) : (
          <Pin className="size-4" aria-hidden />
        )}
      </button>
      <PeerPublicProfileSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profile={profile}
        fallbackName={displayName}
        loading={loading}
        peerThreadId={contact.peerThreadId}
      />
    </li>
  );
}

export function PeerContactsList({
  contacts,
  onRefresh,
  onAddClick,
  className,
}: PeerContactsListProps) {
  const copy = useCopy();
  const roster = readPinnedRoster();

  const handlePinToggle = (contact: PeerContact, pinned: boolean) => {
    const result = setPeerThreadPinned({
      peerThreadId: contact.peerThreadId,
      displayName: contact.displayName,
      pinned,
    });
    syncPinnedRoster();
    onRefresh();
    if (!result.ok && result.reason === "roster_full") {
      toast.error("AI 허브 5칸이 가득 찼어요. 다른 친구 허브를 해제해 주세요");
      return;
    }
    toast.success(
      pinned
        ? `${contact.displayName}를 AI 허브에 꽂았어요`
        : `${contact.displayName}의 허브를 해제했어요`,
    );
  };

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white">전체 친구</h2>
        <span className="text-[11px] text-white/60">
          {contacts.length}명 · 추가 무제한
        </span>
      </div>

      <PeerContactSyncButton onSynced={onRefresh} />

      <button
        type="button"
        onClick={onAddClick}
        className={cn(
          "relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3182f6] py-3.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98]",
          IOS.cardSm,
        )}
      >
        <UserPlus className="size-4" aria-hidden />
        {copy.peers.friendAdd.listCta}
      </button>

      {contacts.length === 0 ? (
        <p className="rounded-2xl bg-rimvio-surface-muted px-4 py-6 text-center text-xs text-white/65">
          {copy.peers.friendAdd.listEmptyHint}
        </p>
      ) : (
        <ul className={cn("divide-y divide-border overflow-hidden", IOS.cardSm)}>
          {contacts.map((contact) => {
            const pinned = Boolean(
              findConnectedPeerSlot(roster, contact.peerThreadId),
            );

            return (
              <PeerContactRow
                key={contact.peerThreadId}
                contact={contact}
                pinned={pinned}
                onPinToggle={(next) => handlePinToggle(contact, next)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

