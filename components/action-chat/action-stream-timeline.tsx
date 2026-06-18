"use client";

import { Timer } from "lucide-react";
import { TimelineActionCard } from "@/components/action-chat/timeline-action-card";
import { deriveActionCardPresentation } from "@/lib/action-chat/derive-action-card-presentation";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type ActionStreamTimelineProps = {
  actions: ActiveActionEntry[];
  contextByMessageId?: Record<string, string>;
  renderActions: (entry: ActiveActionEntry) => React.ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
  compact?: boolean;
};

/** Vertical timeline — Action Stream as OS dashboard, not chat log. */
export function ActionStreamTimeline({
  actions,
  contextByMessageId,
  renderActions,
  emptyTitle = "액션 스트림이 비어 있어요",
  emptyBody = "링크에 시간을 정하거나 일정을 말하면 여기에 쌓여요.",
  className,
  compact = false,
}: ActionStreamTimelineProps) {
  const copy = useCopy();
  const resolvedEmptyBody = emptyBody ?? copy.action.streamEmpty;

  if (actions.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border bg-[#F9FAFB] px-4 py-8 text-center",
          className
        )}
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#4A90E2]/10 text-[#4A90E2]">
          <Timer className="size-5" />
        </div>
        <p className="text-[14px] font-medium text-[#374151]">{emptyTitle}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#9CA3AF]">{resolvedEmptyBody}</p>
      </div>
    );
  }

  const visible = compact ? actions.slice(0, 2) : actions;

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-[59px] top-8 bottom-4 w-0.5 bg-[#E5E7EB]"
      />
      <ul className="space-y-0">
        {visible.map((entry) => {
          const presentation = deriveActionCardPresentation(entry);
          const contextNote = entry.messageId
            ? contextByMessageId?.[entry.messageId]
            : null;

          return (
            <li key={entry.id}>
              <TimelineActionCard
                entry={entry}
                presentation={presentation}
                contextNote={contextNote}
              >
                {renderActions(entry)}
              </TimelineActionCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
