"use client";

import { motion } from "framer-motion";
import { Ticket, CheckCircle2, MessageSquare, Tag, ThumbsDown, ThumbsUp, Wallet } from "lucide-react";
import type { LinkCommentRow } from "@/types/database";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  LinkCommentRow["kind"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  done: {
    label: copy.comments.done,
    icon: CheckCircle2,
    className: "text-emerald-600",
  },
  coupon: {
    label: copy.comments.coupon,
    icon: Tag,
    className: "text-orange-600",
  },
  note: {
    label: copy.comments.note,
    icon: MessageSquare,
    className: "text-sky-600",
  },
  text: {
    label: copy.comments.chat,
    icon: MessageSquare,
    className: "text-muted-foreground",
  },
  price_snap: {
    label: copy.comments.priceSnap,
    icon: Wallet,
    className: "text-orange-600",
  },
  price_ok: {
    label: copy.comments.priceOk,
    icon: ThumbsUp,
    className: "text-emerald-600",
  },
  price_high: {
    label: copy.comments.priceHigh,
    icon: ThumbsDown,
    className: "text-rose-600",
  },
};

export function ActionCommentLog({
  comments,
  className,
  highlightIds,
}: {
  comments: LinkCommentRow[];
  className?: string;
  highlightIds?: Set<string>;
}) {
  if (comments.length === 0) {
    return null;
  }

  const visible = comments.slice(-4);

  return (
    <div className={cn("space-y-2", className)}>
      {visible.map((comment) => {
        const meta = KIND_META[comment.kind];
        const Icon = meta.icon;

        return (
          <motion.div
            key={comment.id}
            layout
            initial={highlightIds?.has(comment.id) ? { opacity: 0, y: 8, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex items-start gap-2 rounded-2xl px-3 py-2 ring-1",
              highlightIds?.has(comment.id)
                ? "bg-primary/8 ring-primary/25"
                : "bg-muted/35 ring-border/30"
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {comment.author_label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · {meta.label}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-foreground/90">{comment.message}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ActionCommentComposer({
  onSubmit,
  disabled,
}: {
  onSubmit: (input: { kind: LinkCommentRow["kind"]; message: string }) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSubmit({ kind: "coupon", message: copy.comments.couponPreset })}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium"
      >
        <Ticket className="size-3.5" />
        쿠폰
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSubmit({ kind: "note", message: copy.comments.notePreset })}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium"
      >
        <MessageSquare className="size-3.5" />
        메모
      </button>
    </div>
  );
}
