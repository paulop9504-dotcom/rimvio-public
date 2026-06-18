"use client";

import { Calendar, Sparkles } from "lucide-react";
import {
  rimvioChipBtnClass,
  rimvioInlineChipClass,
  rimvioStripLinkBtnClass,
} from "@/lib/brand/rimvio-neon-theme";
import { SUGGESTION_CHIPS } from "@/lib/ui/action-chat-theme";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import { cn } from "@/lib/utils";

type ContextNowStripProps = {
  nextAction?: ActiveActionEntry | null;
  onOpenCalendar?: () => void;
  onSuggest?: (text: string) => void;
  className?: string;
};

export function ContextNowStrip({
  nextAction,
  onOpenCalendar,
  onSuggest,
  className,
}: ContextNowStripProps) {
  const nextLabel = nextAction?.title?.trim() || null;

  return (
    <div className={cn("px-4 pb-2.5 pt-2", className)}>
      <div
        className={cn(
          rimvioInlineChipClass("md"),
          "rimvio-point-surface max-w-none shadow-[0_8px_32px_rgba(0,0,0,0.38)]",
        )}
      >
        <div className="flex items-start gap-2.5 px-3.5 py-2.5">
          <div className="rimvio-strip-icon-btn" aria-hidden>
            {nextLabel ? (
              <Calendar className="size-4 text-rimvio-neon-amber" strokeWidth={2.1} />
            ) : (
              <Sparkles className="size-4 text-rimvio-neon-cyan" strokeWidth={2.1} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-rimvio-neon-cyan/75">
              {nextLabel ? "다음 일정" : "오늘"}
            </p>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-white">
              {nextLabel ?? "무엇을 도와드릴까요?"}
            </p>
            {!nextLabel ? (
              <p className="mt-0.5 text-[13px] leading-snug text-white/65">
                말만 해 주세요. 찾고, 정리하고, 실행까지 이어드릴게요.
              </p>
            ) : null}
          </div>

          {onOpenCalendar ? (
            <button
              type="button"
              onClick={onOpenCalendar}
              className={rimvioStripLinkBtnClass}
            >
              전체
            </button>
          ) : null}
        </div>

        {onSuggest ? (
          <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-2.5 pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSuggest(chip)}
                className={cn(
                  rimvioChipBtnClass(),
                  "rimvio-suggest-chip shrink-0 text-[13px]",
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
