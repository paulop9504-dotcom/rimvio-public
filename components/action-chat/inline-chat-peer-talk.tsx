"use client";

import { useMemo, useState } from "react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { PeerTalkContactBubbles } from "@/components/action-chat/peer-talk-contact-bubbles";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { filterPeerContactsForTalk } from "@/lib/peer-chat/filter-talk-contacts";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type InlineChatPeerTalkProps = {
  query: string;
  className?: string;
  onStartConversation?: (contact: PeerContact) => void;
};

function TalkProfileConfirm({
  contact,
  onStart,
  starting,
}: {
  contact: PeerContact;
  onStart: () => void;
  starting?: boolean;
}) {
  const copy = useCopy();
  const phoneDm = isRegisteredPeerDmThread(contact.peerThreadId);
  const { profile, loading } = useDmPeerProfile(contact.peerThreadId, phoneDm);
  const displayName = profile?.displayName?.trim() || contact.displayName;
  const brand = resolveMainActionBrandStyle({
    label: "대화 시작하기",
    deeplink: "",
  });

  if (loading) {
    return <p className="text-[12px] text-white/55">프로필 불러오는 중…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
        <PeerProfileAvatar
          displayName={displayName}
          avatarUrl={profile?.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          {profile?.rimvioId ? (
            <p className="truncate text-[12px] text-[#FEE500]/90">
              @{profile.rimvioId}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-[11px] text-white/45">
        {copy.product.feedPeerTalkRoomHint} · {copy.product.feedPeerTalkRoomLink}로 AI
        렌즈를 켜 보세요.
      </p>
      <MainActionButton
        label={starting ? "불러오는 중…" : "대화 시작하기"}
        brand={brand}
        compact
        onClick={onStart}
      />
    </div>
  );
}

export function InlineChatPeerTalk({
  query,
  className,
  onStartConversation,
}: InlineChatPeerTalkProps) {
  const { user, configured } = useAuth();
  const canUse = Boolean(configured && user && isSupabaseConfigured());
  const candidates = useMemo(() => filterPeerContactsForTalk(query), [query]);
  const [picked, setPicked] = useState<PeerContact | null>(() =>
    candidates.length === 1 ? candidates[0]! : null,
  );
  const [starting, setStarting] = useState(false);

  const active = picked ?? (candidates.length === 1 ? candidates[0]! : null);

  const startChat = () => {
    if (!active || starting) {
      return;
    }
    prefetchPeerMessages(active.peerThreadId);
    setStarting(true);
    onStartConversation?.(active);
  };

  if (!canUse) {
    return (
      <p className={cn("text-[12px] text-amber-200/90", className)}>
        @톡은 로그인 후에 쓸 수 있어요.
      </p>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[12px] text-white/55">
          {query.trim()
            ? `"${query.trim()}" 친구를 찾지 못했어요.`
            : "아직 친구가 없어요."}
        </p>
        <p className="text-[11px] text-white/40">
          먼저 <span className="text-rimvio-neon-cyan">@친추</span>로 친구를 추가해
          주세요.
        </p>
      </div>
    );
  }

  if (active && (query.trim() || candidates.length === 1)) {
    return (
      <div className={className}>
        <TalkProfileConfirm
          contact={active}
          onStart={startChat}
          starting={starting}
        />
        {candidates.length > 1 ? (
          <button
            type="button"
            className="mt-2 text-[11px] text-white/45 underline-offset-2 hover:underline"
            onClick={() => {
              setPicked(null);
              setStarting(false);
            }}
          >
            다른 친구 고르기
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <PeerTalkContactBubbles
        contacts={candidates}
        onPick={(contact) => setPicked(contact)}
      />
      {picked ? (
        <TalkProfileConfirm
          contact={picked}
          onStart={startChat}
          starting={starting}
        />
      ) : (
        <p className="text-center text-[11px] text-white/40">
          버블을 눌러 주세요
        </p>
      )}
    </div>
  );
}
