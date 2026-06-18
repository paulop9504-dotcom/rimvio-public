"use client";

import type { TikiChoiceOption } from "@/lib/action-chat/parse-tiki-choice-options";
import { formatTikiChoiceReply } from "@/lib/action-chat/parse-tiki-choice-options";
import { cn } from "@/lib/utils";

type TikiChoiceChipsProps = {
  choices: TikiChoiceOption[];
  disabled?: boolean;
  onSelect: (reply: string) => void;
  className?: string;
};

export function TikiChoiceChips({
  choices,
  disabled = false,
  onSelect,
  className,
}: TikiChoiceChipsProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-2 flex flex-col gap-1.5", className)}>
      {choices.map((choice) => (
        <button
          key={choice.letter}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(formatTikiChoiceReply(choice))}
          className={cn(
            "flex w-full items-start gap-2 rounded-xl border border-indigo-100 bg-rimvio-surface/90 px-3 py-2 text-left text-[13px] leading-snug text-slate-700 transition-colors",
            "hover:border-indigo-200 hover:bg-rimvio-surface",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <span className="shrink-0 font-semibold text-indigo-600">
            {choice.letter})
          </span>
          <span className="min-w-0 flex-1">{choice.text}</span>
        </button>
      ))}
    </div>
  );
}
