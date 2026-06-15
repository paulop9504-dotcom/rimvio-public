"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AiLensToggle } from "@/components/peer-chat/ai-lens-toggle";
import { useCopy } from "@/hooks/use-copy";
import {
  notifyPeerRoomFromFeed,
  peerRoomPath,
} from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { cn } from "@/lib/utils";

type FeedPeerTalkRoomBannerProps = {
  peerThreadId: string;
  displayName: string;
  aiLensEnabled: boolean;
  onAiLensChange: (enabled: boolean) => void;
  className?: string;
};

/** 검색 @톡 인라인 DM — AI 렌즈 토글 + ROOM 이동 */
export function FeedPeerTalkRoomBanner({
  peerThreadId,
  displayName,
  aiLensEnabled,
  onAiLensChange,
  className,
}: FeedPeerTalkRoomBannerProps) {
  const copy = useCopy();
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2",
        className,
      )}
    >
      <AiLensToggle
        enabled={aiLensEnabled}
        onChange={onAiLensChange}
        size="sm"
      />
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">
        {copy.product.feedPeerTalkRoomHint}
      </p>
      <button
        type="button"
        className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-sky-800"
        onClick={() => {
          notifyPeerRoomFromFeed(displayName);
          router.push(peerRoomPath(peerThreadId));
        }}
      >
        {copy.product.feedPeerTalkRoomLink}
        <ChevronRight className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
