"use client";

import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { GroupTalkBubbles } from "@/components/action-chat/group-talk-bubbles";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { filterGroupsForTalk } from "@/lib/peer-chat/filter-groups-for-talk";
import { groupTargetAsPeerContact } from "@/lib/peer-chat/group-target-as-contact";
import type { GroupTalkTarget } from "@/lib/peer-chat/group-talk-target-types";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type InlineChatGroupTalkProps = {
  query: string;
  className?: string;
  onStartConversation?: (contact: PeerContact) => void;
};

function GroupTalkConfirm({
  group,
  onStart,
  starting,
}: {
  group: GroupTalkTarget;
  onStart: () => void;
  starting?: boolean;
}) {
  const brand = resolveMainActionBrandStyle({
    label: "단톡 시작하기",
    deeplink: "",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-rimvio-neon-cyan/12 text-rimvio-neon-cyan">
          <Users className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{group.displayName}</p>
          <p className="text-[12px] text-white/45">단톡 · 피드에서 바로 대화</p>
        </div>
      </div>
      <MainActionButton
        label={starting ? "불러오는 중…" : "단톡 시작하기"}
        brand={brand}
        compact
        onClick={onStart}
      />
    </div>
  );
}

export function InlineChatGroupTalk({
  query,
  className,
  onStartConversation,
}: InlineChatGroupTalkProps) {
  const { user, configured } = useAuth();
  const canUse = Boolean(configured && user && isSupabaseConfigured());
  const candidates = useMemo(() => filterGroupsForTalk(query), [query]);
  const [picked, setPicked] = useState<GroupTalkTarget | null>(() =>
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
    onStartConversation?.(groupTargetAsPeerContact(active));
  };

  if (!canUse) {
    return (
      <p className={cn("text-[12px] text-amber-200/90", className)}>
        @단톡은 로그인 후에 쓸 수 있어요.
      </p>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[12px] text-white/55">
          {query.trim()
            ? `"${query.trim()}" 단톡을 찾지 못했어요.`
            : "아직 단톡이 없어요."}
        </p>
        <p className="text-[11px] text-white/40">
          <span className="text-rimvio-neon-cyan">/peers</span>에서 단톡을 만든 뒤 다시
          시도해 주세요.
        </p>
      </div>
    );
  }

  if (active && (query.trim() || candidates.length === 1)) {
    return (
      <div className={className}>
        <GroupTalkConfirm group={active} onStart={startChat} starting={starting} />
        {candidates.length > 1 ? (
          <button
            type="button"
            className="mt-2 text-[11px] text-white/45 underline-offset-2 hover:underline"
            onClick={() => {
              setPicked(null);
              setStarting(false);
            }}
          >
            다른 단톡 고르기
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <GroupTalkBubbles
        groups={candidates}
        onPick={(group) => setPicked(group)}
      />
      {picked ? (
        <GroupTalkConfirm group={picked} onStart={startChat} starting={starting} />
      ) : (
        <p className="text-center text-[11px] text-white/40">단톡을 눌러 주세요</p>
      )}
    </div>
  );
}
