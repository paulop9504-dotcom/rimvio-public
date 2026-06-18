"use client";

import { resolveNavAuxBrandStyle } from "@/lib/brand/action-brand-style";
import { cn } from "@/lib/utils";

type AuxActionButtonProps = {
  id: string;
  label: string;
  icon?: string;
  onClick?: () => void;
  tapTarget?: boolean;
  className?: string;
};

/** AUX seed — white border shell, brand letter color only in monogram. */
export function AuxActionButton({
  id,
  label,
  icon,
  onClick,
  tapTarget = false,
  className,
}: AuxActionButtonProps) {
  const brand = resolveNavAuxBrandStyle(id, icon ?? "", label);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rimvio-action-shell-chip inline-flex items-center gap-2 rounded-full border border-white/85 bg-transparent font-semibold text-white transition-colors hover:bg-white/[0.06]",
        tapTarget
          ? "min-h-10 px-3.5 py-2 text-[13px] tracking-[-0.01em]"
          : "min-h-7 gap-1.5 px-2.5 py-1 text-[11px]",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-transparent font-extrabold leading-none",
            tapTarget ? "size-5 text-[10px]" : "size-[1.125rem] text-[8px]",
          )}
          style={{ color: brand.iconColor }}
        >
          {icon}
        </span>
      ) : null}
      {label}
    </button>
  );
}
