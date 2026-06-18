"use client";

import { cn } from "@/lib/utils";

type AuxSeedButtonProps = {
  label: string;
  onClick?: () => void;
  className?: string;
};

/** Quiet aux seed ???�맹??버튼 only, no hero chrome. */
export function AuxSeedButton({ label, onClick, className }: AuxSeedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "max-w-full truncate rounded-full border border-border bg-black/[0.03] px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-black/[0.06] hover:text-[#374151]",
        className,
      )}
      title={label}
    >
      {label}
    </button>
  );
}
