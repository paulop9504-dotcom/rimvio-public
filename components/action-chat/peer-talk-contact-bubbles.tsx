"use client";

import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { setTalkProfileCache } from "@/lib/peer-chat/peer-talk-profile-cache";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type PeerTalkContactBubblesProps = {
  contacts: PeerContact[];
  onPick: (contact: PeerContact) => void;
  className?: string;
};

function PeerTalkBubble({
  contact,
  onPick,
}: {
  contact: PeerContact;
  onPick: () => void;
}) {
  const phoneDm = isRegisteredPeerDmThread(contact.peerThreadId);
  const { profile } = useDmPeerProfile(contact.peerThreadId, phoneDm);
  const displayName =
    profile?.displayName?.trim() ||
    contact.profileDisplayName?.trim() ||
    contact.displayName;

  useEffect(() => {
    if (!profile) {
      return;
    }
    const profileName = profile.displayName?.trim() || null;
    setTalkProfileCache(contact.peerThreadId, {
      displayName: profileName,
      rimvioId: profile.rimvioId ?? null,
      emailLower: profile.emailLower ?? null,
    });
    addPeerContact({
      peerThreadId: contact.peerThreadId,
      displayName: profileName || contact.displayName,
      profileDisplayName: profileName,
      roomDisplayName: contact.roomDisplayName,
      rimvioId: profile.rimvioId ?? contact.rimvioId,
      emailLower: profile.emailLower ?? contact.emailLower,
    });
  }, [profile, contact]);

  return (
    <button
      type="button"
      onMouseEnter={() => prefetchPeerMessages(contact.peerThreadId)}
      onTouchStart={() => prefetchPeerMessages(contact.peerThreadId)}
      onClick={onPick}
      className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1 active:scale-95"
      aria-label={`${displayName}에게 톡`}
    >
      <PeerProfileAvatar
        displayName={displayName}
        avatarUrl={profile?.avatarUrl}
        size="md"
        className="ring-2 ring-[#FEE500]/35"
      />
      <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight text-white/85">
        {displayName}
      </span>
    </button>
  );
}

/** @톡 입력 중 — 친구 프로필 버블 가로 스크롤 */
export function PeerTalkContactBubbles({
  contacts,
  onPick,
  className,
}: PeerTalkContactBubblesProps) {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="톡할 친구"
    >
      {contacts.map((contact) => (
        <PeerTalkBubble
          key={contact.peerThreadId}
          contact={contact}
          onPick={() => onPick(contact)}
        />
      ))}
    </div>
  );
}
