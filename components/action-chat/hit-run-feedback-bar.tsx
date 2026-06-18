"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { HitRunFeedbackVerdict } from "@/lib/action-chat/hit-run-feedback/types";
import { cn } from "@/lib/utils";

type HitRunFeedbackBarProps = {
  value?: HitRunFeedbackVerdict | null;
  disabled?: boolean;
  onVote: (verdict: HitRunFeedbackVerdict) => void;
  className?: string;
};

export function HitRunFeedbackBar({
  value = null,
  disabled = false,
  onVote,
  className,
}: HitRunFeedbackBarProps) {
  return (
    <div
      className={cn(
        "mt-2 flex items-center justify-end gap-1 border-t border-white/[0.06] pt-2",
        className,
      )}
      aria-label="응답 피드백"
    >
      <button
        type="button"
        aria-label="도움 됨"
        aria-pressed={value === "up"}
        disabled={disabled || value !== null}
        onClick={() => onVote("up")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
          value === "up"
            ? "bg-rimvio-neon-green/15 text-rimvio-neon-green"
            : "text-white/45 hover:bg-white/[0.04] hover:text-white/72",
        )}
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="도움 안 됨"
        aria-pressed={value === "down"}
        disabled={disabled || value !== null}
        onClick={() => onVote("down")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
          value === "down"
            ? "bg-rimvio-neon-magenta/15 text-rimvio-neon-magenta"
            : "text-white/45 hover:bg-white/[0.04] hover:text-white/72",
        )}
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
  );
}
