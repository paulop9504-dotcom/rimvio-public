"use client";

import type { CommandShortcut } from "@/lib/command-os/command-shortcuts";
import { cn } from "@/lib/utils";

type CommandShortcutStripProps = {
  shortcuts: CommandShortcut[];
  onSelect: (shortcut: CommandShortcut) => void;
  className?: string;
};

/** v1.1 — tap fills `@command ` in the same Add bar (kernel: no palette). */
export function CommandShortcutStrip({
  shortcuts,
  onSelect,
  className,
}: CommandShortcutStripProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label="명령 바로가기"
    >
      {shortcuts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-100/90 bg-rimvio-surface px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition-transform active:scale-95"
        >
          <span aria-hidden className="text-[14px] leading-none">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
