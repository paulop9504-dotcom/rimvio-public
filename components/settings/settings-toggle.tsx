"use client";

import { cn } from "@/lib/utils";

export type SettingsToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

/** iOS-style switch for settings rows. */
export function SettingsToggle({
  checked,
  onCheckedChange,
  disabled = false,
  "aria-label": ariaLabel,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors disabled:opacity-45",
        checked ? "bg-[#007AFF]" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
