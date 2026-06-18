"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ActionCardPresentation } from "@/lib/action-chat/derive-action-card-presentation";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<
  ActionCardPresentation["statusTone"],
  string
> = {
  ready: "bg-[#EEF2FF] text-[#4338CA]",
  waiting: "bg-[#D1FAE5] text-[#047857]",
  confirm: "bg-[#FEF3C7] text-[#B45309]",
  reminder: "bg-[#E0E7FF] text-[#4338CA]",
};

export type TimelineActionCardProps = {
  entry: ActiveActionEntry;
  presentation: ActionCardPresentation;
  contextNote?: string | null;
  children?: React.ReactNode;
  className?: string;
};

/** Single timeline row ??time axis dot + action card. */
export function TimelineActionCard({
  presentation,
  contextNote,
  children,
  className,
}: TimelineActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const showContext = Boolean(contextNote && contextNote.length > 8);

  return (
    <div className={cn("relative flex gap-3 pl-1", className)}>
      <div className="flex w-12 shrink-0 flex-col items-end pt-5">
        <span className="text-[11px] font-semibold tabular-nums text-[#4A90E2]">
          {presentation.clockLabel ?? "—"}
        </span>
      </div>

      <div className="relative min-w-0 flex-1 pb-4">
        <span
          aria-hidden
          className="absolute -left-[17px] top-6 size-3 rounded-full border-2 border-white bg-[#4A90E2] shadow-sm"
        />

        <div className="rounded-2xl border border-border bg-rimvio-surface p-4 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)]">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-bold leading-snug text-foreground">
              {presentation.title}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                STATUS_TONE[presentation.statusTone]
              )}
            >
              {presentation.statusLabel}
            </span>
          </div>

          <p className="mb-3 text-[13px] text-muted-foreground">{presentation.timeLine}</p>

          {children}

          {showContext ? (
            <div className="mt-3 border-t border-black/[0.04] pt-2">
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF] hover:text-muted-foreground"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    ?�???�기
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    ?�??보기
                  </>
                )}
              </button>
              {expanded ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#9CA3AF]">
                  {contextNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
