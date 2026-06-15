"use client";

import { FeedHeroArt } from "@/components/feed-hero-art";
import { PriceVotePanel } from "@/components/price-vote-panel";
import { GOLDEN } from "@/lib/ui/golden-layout";
import type { LinkCommentRow, LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type RoomVisualStackProps = {
  link: LinkRow;
  isDone: boolean;
  showPriceVote: boolean;
  linkComments: LinkCommentRow[];
  onVote: (input: {
    kind: LinkCommentRow["kind"];
    message: string;
  }) => void;
};

export function RoomVisualStack({
  link,
  isDone,
  showPriceVote,
  linkComments,
  onVote,
}: RoomVisualStackProps) {
  return (
    <div className={GOLDEN.visualStack}>
      <div
        className={cn(
          showPriceVote ? GOLDEN.heroFrameCompact : GOLDEN.heroFrame,
          "mx-0 w-full max-w-none",
          isDone && "opacity-80 saturate-75"
        )}
      >
        <FeedHeroArt link={link} className="size-full" />
      </div>

      {showPriceVote ? (
        <PriceVotePanel
          variant="inline"
          link={link}
          comments={linkComments}
          disabled={isDone}
          onVote={onVote}
        />
      ) : null}
    </div>
  );
}
