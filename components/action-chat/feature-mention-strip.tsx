"use client";

import type { FeatureMentionShortcut } from "@/lib/event-kernel/action-contracts/mention-feature-shortcuts";
import { cn } from "@/lib/utils";

type FeatureMentionStripProps = {
  shortcuts: readonly FeatureMentionShortcut[];
  onPick: (shortcut: FeatureMentionShortcut) => void;
  className?: string;
};

export function FeatureMentionStrip({
  shortcuts,
  onPick,
  className,
}: FeatureMentionStripProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5 px-1 pb-1", className)}>
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.id}
          type="button"
          onClick={() => onPick(shortcut)}
          className="inline-flex items-center gap-1 rounded-full border border-[#334155] bg-[#1E293B] px-2.5 py-1 text-[11px] font-medium text-[#E2E8F0] transition-colors hover:bg-[#334155]"
        >
          <span aria-hidden>{shortcut.icon}</span>
          <span>{shortcut.label}</span>
        </button>
      ))}
    </div>
  );
}
