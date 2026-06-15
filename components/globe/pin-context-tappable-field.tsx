"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type PinContextTappableFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
  editable?: boolean;
  variant?: "light" | "dark";
  className?: string;
};

/** Tap the wrong line to fix it — 1 field → 1 edit sheet. */
export function PinContextTappableField({
  label,
  value,
  onPress,
  editable = true,
  variant = "light",
  className,
}: PinContextTappableFieldProps) {
  const dark = variant === "dark";

  if (!editable) {
    return (
      <div className={className}>
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-wide",
            dark ? "text-white/40" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-[15px] font-medium",
            dark ? "text-white" : "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "group min-w-0 rounded-xl px-2 py-1.5 text-left transition active:scale-[0.99]",
        dark ? "hover:bg-white/8" : "hover:bg-muted/80",
        className,
      )}
      data-pin-context-tappable
    >
      <p
        className={cn(
          "flex items-center gap-1 text-[11px] font-medium",
          dark ? "text-white/45" : "text-muted-foreground",
        )}
      >
        {label}
        <Pencil
          className={cn(
            "size-3 opacity-0 transition group-hover:opacity-100",
            dark ? "text-sky-300/80" : "text-primary/70",
          )}
          aria-hidden
        />
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-[15px] font-semibold",
          dark ? "text-white" : "text-foreground",
        )}
      >
        {value}
      </p>
    </button>
  );
}
