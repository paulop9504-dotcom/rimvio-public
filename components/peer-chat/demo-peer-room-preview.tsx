"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { useCopy } from "@/hooks/use-copy";
import { analyzePeerThreadForLens } from "@/lib/peer-chat/ai-lens/rank-lens-bubbles";
import {
  DEMO_LENS_REFERENCE_DATE,
  DEMO_PEER_MESSAGES,
} from "@/lib/peer-chat/demo-peer-conversation";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { cn } from "@/lib/utils";

type DemoPeerRoomPreviewProps = {
  className?: string;
};

/** 친구 0명·비로그인 시 ROOM 체험용 읽기 전용 대화 */
export function DemoPeerRoomPreview({ className }: DemoPeerRoomPreviewProps) {
  const copy = useCopy();

  const { candidatesByMessageId } = useMemo(() => {
    const analysis = analyzePeerThreadForLens(
      [...DEMO_PEER_MESSAGES],
      DEMO_LENS_REFERENCE_DATE,
    );
    return {
      candidatesByMessageId: analysis.candidatesByMessageId,
    };
  }, []);

  const handleLensSelect = (_candidate: DeepLinkBubbleCandidate) => {
    toast.message(copy.peers.demoLensTap, { duration: 4000 });
  };

  return (
    <section
      className={cn(
        "mx-1 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]",
        className,
      )}
      aria-label={copy.peers.demoTitle}
    >
      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <p className="text-[13px] font-semibold text-white">{copy.peers.demoTitle}</p>
        <p className="mt-0.5 text-[11px] text-white/45">{copy.peers.demoHint}</p>
      </div>
      <ul className="flex max-h-[min(42dvh,20rem)] flex-col gap-2 overflow-y-auto px-2 py-3">
        {DEMO_PEER_MESSAGES.map((message, index) => (
          <PeerChatBubble
            key={message.id}
            message={message}
            simple
            showTime={index === DEMO_PEER_MESSAGES.length - 1}
            showPeerProfileHeader={index === 0}
            peerProfile={{
              displayName: "민수",
              avatarUrl: null,
              rimvioId: "demo_minsu",
            }}
            lensCandidates={candidatesByMessageId[message.id] ?? []}
            onLensSelect={handleLensSelect}
          />
        ))}
      </ul>
      <p className="border-t border-white/[0.06] px-3 py-2 text-center text-[10px] text-white/35">
        {copy.product.lensCoachSub}
      </p>
    </section>
  );
}
