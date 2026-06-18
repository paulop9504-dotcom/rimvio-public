"use client";

import { LensActionBubbleChip } from "@/components/peer-chat/lens-action-bubble-chip";
import { LensActionMediaCard } from "@/components/peer-chat/lens-action-media-card";
import { partitionLensBubbleCandidates } from "@/lib/peer-chat/ai-lens/is-simple-lens-bubble";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { cn } from "@/lib/utils";

type DeepLinkBubbleRowProps = {
  candidates: readonly DeepLinkBubbleCandidate[];
  onSelect: (candidate: DeepLinkBubbleCandidate) => void;
  disabled?: boolean;
  className?: string;
  owner?: {
    displayName: string;
    avatarUrl?: string | null;
    rimvioId?: string | null;
  };
};

/** Suggest-only — all lens actions render as compact chips (no reel card). */
export function DeepLinkBubbleRow({
  candidates,
  onSelect,
  disabled = false,
  className,
  owner,
}: DeepLinkBubbleRowProps) {
  if (candidates.length === 0) {
    return null;
  }

  const { simple, rich } = partitionLensBubbleCandidates(candidates);

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      role="group"
      aria-label="AI Lens 제안"
    >
      {simple.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {simple.map((candidate) => (
            <LensActionBubbleChip
              key={candidate.id}
              candidate={candidate}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>
      ) : null}
      {rich.map((candidate) => (
        <LensActionMediaCard
          key={candidate.id}
          candidate={candidate}
          onSelect={onSelect}
          disabled={disabled}
          owner={owner}
        />
      ))}
    </div>
  );
}
