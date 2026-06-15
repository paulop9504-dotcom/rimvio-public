"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AiLensToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** ROOM·@톡 공통 — AI 렌즈 ON/OFF 스위치 */
export function AiLensToggle({
  enabled,
  onChange,
  disabled = false,
  size = "md",
  className,
}: AiLensToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "AI 렌즈 끄기" : "AI 렌즈 켜기"}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-semibold transition-colors",
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]",
        enabled
          ? "bg-sky-100 text-sky-900 ring-1 ring-sky-300/60"
          : "bg-muted text-muted-foreground ring-1 ring-border",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <Sparkles
        className={cn(size === "sm" ? "size-3" : "size-3.5", enabled && "text-sky-700")}
        aria-hidden
      />
      {enabled ? "렌즈 ON" : "렌즈 OFF"}
    </button>
  );
}
