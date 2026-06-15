"use client";

import { ThumbsDown, ThumbsUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  buildPriceSnapshotMessage,
  extractPriceHint,
} from "@/lib/links/extract-price-hint";
import { copy } from "@/lib/copy/human-ko";
import type { LinkCommentRow, LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

function countVotes(comments: LinkCommentRow[], kind: LinkCommentRow["kind"]) {
  return comments.filter((comment) => comment.kind === kind).length;
}

export function PriceVotePanel({
  link,
  comments,
  disabled,
  onVote,
  variant = "default",
}: {
  link: LinkRow;
  comments: LinkCommentRow[];
  disabled?: boolean;
  onVote: (input: { kind: LinkCommentRow["kind"]; message: string }) => void;
  variant?: "default" | "inline";
}) {
  const snapshot = buildPriceSnapshotMessage(link.title);
  const priceHint = extractPriceHint(link.title);
  const okCount = countVotes(comments, "price_ok");
  const highCount = countVotes(comments, "price_high");

  const handleSnapshot = () => {
    if (!snapshot) {
      toast.message(copy.priceVote.noPriceHint);
      return;
    }

    onVote({ kind: "price_snap", message: snapshot });
    toast.success(copy.priceVote.snapSaved);
  };

  if (variant === "inline") {
    return (
      <div className="border-t border-border bg-orange-500/[0.07] px-2.5 py-2.5">
        <p className="mb-2 truncate text-center text-[11px] font-medium text-orange-950/85">
          {priceHint
            ? copy.priceVote.inlineTitle(priceHint)
            : copy.priceVote.inlineTitleFallback}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={handleSnapshot}
            className="flex flex-col items-center gap-1 rounded-xl bg-rimvio-surface/80 py-2 ring-1 ring-orange-500/15 active:scale-[0.98]"
          >
            <span className="text-base leading-none">📸</span>
            <span className="text-[10px] font-medium text-foreground/85">
              {copy.priceVote.snapButton}
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onVote({ kind: "price_ok", message: copy.priceVote.okMessage })
            }
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-2 ring-1 active:scale-[0.98]",
              okCount > 0
                ? "bg-emerald-500/12 ring-emerald-500/25"
                : "bg-rimvio-surface/80 ring-orange-500/15"
            )}
          >
            <ThumbsUp className="size-3.5" />
            <span className="text-[10px] font-medium">
              {copy.priceVote.okButton}
              {okCount > 0 ? ` ${okCount}` : ""}
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onVote({ kind: "price_high", message: copy.priceVote.highMessage })
            }
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-2 ring-1 active:scale-[0.98]",
              highCount > 0
                ? "bg-rose-500/12 ring-rose-500/25"
                : "bg-rimvio-surface/80 ring-orange-500/15"
            )}
          >
            <ThumbsDown className="size-3.5" />
            <span className="text-[10px] font-medium">
              {copy.priceVote.highButton}
              {highCount > 0 ? ` ${highCount}` : ""}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-orange-500/8 px-3.5 py-3 ring-1 ring-orange-500/15">
      <div className="flex items-start gap-2">
        <Wallet className="mt-0.5 size-4 shrink-0 text-orange-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {copy.priceVote.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {priceHint
              ? copy.priceVote.hintWithPrice(priceHint)
              : copy.priceVote.hintNoPrice}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleSnapshot}
          className="inline-flex items-center gap-1 rounded-full border border-orange-500/25 bg-background/80 px-3 py-1.5 text-xs font-medium"
        >
          📸 {copy.priceVote.snapButton}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onVote({ kind: "price_ok", message: copy.priceVote.okMessage })
          }
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium",
            okCount > 0
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-border/60 bg-background/80"
          )}
        >
          <ThumbsUp className="size-3.5" />
          {copy.priceVote.okButton}
          {okCount > 0 ? ` ${okCount}` : ""}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onVote({ kind: "price_high", message: copy.priceVote.highMessage })
          }
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium",
            highCount > 0
              ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
              : "border-border/60 bg-background/80"
          )}
        >
          <ThumbsDown className="size-3.5" />
          {copy.priceVote.highButton}
          {highCount > 0 ? ` ${highCount}` : ""}
        </button>
      </div>
    </div>
  );
}

export function isCommerceLink(link: LinkRow) {
  return (
    link.source_type === "commerce" ||
    link.category === "shopping" ||
    /coupang|musinsa|gmarket|11st|smartstore|shopping\.naver|ably|zigzag|kurly|oliveyoung|ssg|lotte|auction|tmon|joongna|junggo|bunjang|daangn|karrot/i.test(
      link.domain
    )
  );
}
