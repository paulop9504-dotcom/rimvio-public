"use client";

import type { EntityQuickPickWire } from "@/lib/context-resolver/discovery/entity-quick-pick-types";
import { cn } from "@/lib/utils";

type EntityQuickPickStripProps = {
  wire: EntityQuickPickWire;
  onSelectOption: (prompt: string) => void;
  className?: string;
};

/** IDEO-style choice chips — questions as selectable intents, not open prompts. */
export function EntityQuickPickStrip({
  wire,
  onSelectOption,
  className,
}: EntityQuickPickStripProps) {
  return (
    <div
      className={cn("mr-auto max-w-[min(100%,20.5rem)]", className)}
      style={{
        fontFamily:
          '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
      }}
    >
      <article
        className="overflow-hidden rounded-2xl rounded-tl-[8px] border-[1.5px] border-[#E3D9CC] bg-[#FFFCF7] px-5 pb-5 pt-4 shadow-[0_1px_0_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.1)]"
      >
        <div
          className="mb-4 h-[3px] w-8 rounded-full bg-[#E85D04]"
          aria-hidden
        />
        <p className="text-[15px] font-semibold leading-[1.45] text-[#1C1917]">
          {wire.lead}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {wire.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectOption(option.prompt)}
              className={cn(
                "rounded-full border border-[#E3D9CC] bg-rimvio-surface px-4 py-2.5",
                "text-[14px] font-semibold text-[#44403C]",
                "transition active:scale-[0.98] hover:border-[#E85D04]/50 hover:bg-[#FFF4ED] hover:text-[#1C1917]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
