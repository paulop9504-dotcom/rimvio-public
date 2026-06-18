"use client";

import { cn } from "@/lib/utils";

type ThoughtBubbleProps = {
  text: string;
  className?: string;
};

export function ThoughtBubble({ text, className }: ThoughtBubbleProps) {
  return (
    <div
      className={cn(
        "thought-bubble rimvio-point-surface rounded-xl bg-rimvio-surface-muted px-3 py-2.5",
        className
      )}
    >
      <p className="text-[12px] leading-relaxed text-white/75">
        <span aria-hidden className="mr-1">
          💡
        </span>
        {text}
      </p>
    </div>
  );
}
