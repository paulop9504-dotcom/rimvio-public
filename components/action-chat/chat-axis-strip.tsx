"use client";

import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { CHAT_AXIS_CONFIG, CHAT_AXIS_ORDER } from "@/lib/action-chat/chat-three-axis";
import { cn } from "@/lib/utils";

type ChatAxisStripProps = {
  value: ChatAxis;
  onChange: (axis: ChatAxis) => void;
  disabled?: boolean;
  className?: string;
};

export function ChatAxisStrip({
  value,
  onChange,
  disabled = false,
  className,
}: ChatAxisStripProps) {
  return (
    <div
      className={cn("mb-2 flex gap-1.5", className)}
      role="tablist"
      aria-label="채팅 범위"
    >
      {CHAT_AXIS_ORDER.map((axis) => {
        const config = CHAT_AXIS_CONFIG[axis];
        const active = value === axis;
        return (
          <button
            key={axis}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(axis)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-start rounded-xl border px-2.5 py-1.5 text-left transition-colors",
              active
                ? "border-indigo-300 bg-rimvio-surface shadow-sm"
                : "border-transparent bg-rimvio-surface/60 text-slate-500 hover:bg-rimvio-surface/90",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <span
              className={cn(
                "text-[12px] font-semibold leading-tight",
                active ? "text-indigo-600" : "text-slate-600"
              )}
            >
              {config.label}
            </span>
            <span className="truncate text-[10px] leading-tight text-slate-400">
              {config.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
