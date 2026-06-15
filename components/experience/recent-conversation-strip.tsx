"use client";

import type { ExperienceConversationProjection } from "@/lib/globe/experience-conversation-types";
import { cn } from "@/lib/utils";

export type RecentConversationStripProps = {
  conversation: ExperienceConversationProjection;
  onOpenRoom: () => void;
  className?: string;
};

/** "최근 이 경험에서 있었던 이야기" — no bubbles, no read receipts. */
export function RecentConversationStrip({
  conversation,
  onOpenRoom,
  className,
}: RecentConversationStripProps) {
  if (conversation.previews.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-2", className)} data-recent-conversation-strip>
      <div>
        <p className="text-[12px] font-semibold text-muted-foreground">최근 대화</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          최근 이 경험에서 있었던 이야기
        </p>
      </div>
      <div className="rounded-xl border border-border bg-background">
        {conversation.previews.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={onOpenRoom}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left active:bg-foreground/[0.03]",
              index > 0 && "border-t border-border",
            )}
            data-conversation-preview={row.id}
          >
            <span className="text-[13px] font-semibold text-foreground">
              {row.speakerName}
            </span>
            <span className="text-[13px] leading-snug text-muted-foreground">
              &ldquo;{row.excerpt}&rdquo;
            </span>
          </button>
        ))}
        {conversation.overflowCount > 0 ? (
          <button
            type="button"
            onClick={onOpenRoom}
            className="w-full border-t border-border px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground active:bg-foreground/[0.03]"
            data-conversation-overflow
          >
            +{conversation.overflowCount}개 대화
          </button>
        ) : null}
      </div>
    </section>
  );
}
