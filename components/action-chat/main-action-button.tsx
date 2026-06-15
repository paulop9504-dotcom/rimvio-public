"use client";

import {
  resolveMainActionBrandStyle,
  type MainActionBrandStyle,
} from "@/lib/brand/action-brand-style";
import { cn } from "@/lib/utils";

type MainActionBrandInput = Parameters<typeof resolveMainActionBrandStyle>[0];

type MainActionButtonProps = {
  label?: React.ReactNode;
  children?: React.ReactNode;
  /** Pre-resolved brand style (optional if `brandFrom` is set). */
  brand?: MainActionBrandStyle;
  /** Auto-resolve label color from label / deeplink / plugin — no manual color needed. */
  brandFrom?: MainActionBrandInput;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit";
  compact?: boolean;
  /** Larger tap target — use on feed navigate chips. */
  tapTarget?: boolean;
  rounded?: "xl" | "2xl" | "lg" | "pill";
  className?: string;
  icon?: React.ReactNode;
};

/** MAIN tier — white border shell; label uses brand text color. */
export function MainActionButton({
  label,
  children,
  brand,
  brandFrom,
  onClick,
  disabled = false,
  type = "button",
  compact = false,
  tapTarget = false,
  rounded = "xl",
  className,
  icon,
}: MainActionButtonProps) {
  const content = children ?? label;
  const resolvedBrand =
    brand ??
    resolveMainActionBrandStyle({
      ...brandFrom,
      label:
        brandFrom?.label ??
        (typeof content === "string" ? content : typeof label === "string" ? label : undefined),
    });

  const roundedClass =
    rounded === "pill"
      ? "rounded-full"
      : rounded === "2xl"
        ? "rounded-2xl"
        : rounded === "lg"
          ? "rounded-lg"
          : "rounded-xl";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        disabled && "pointer-events-none opacity-50",
        "rimvio-action-shell-btn flex w-full items-center justify-center gap-2 border bg-transparent font-semibold leading-none transition-colors hover:bg-[var(--main-action-hover-bg)] active:scale-[0.99]",
        roundedClass,
        compact
          ? tapTarget
            ? "min-h-10 px-4 py-2.5 text-[15px] tracking-[-0.01em]"
            : "min-h-7 px-2.5 py-1 text-[13px]"
          : "min-h-11 px-3 py-3 text-[14px]",
        className,
      )}
      style={{
        color: resolvedBrand.textColor,
        borderColor: resolvedBrand.borderColor,
        backgroundColor: resolvedBrand.fillColor,
        ["--main-action-hover-bg" as string]: resolvedBrand.hoverBg,
      }}
    >
      {icon}
      {typeof content === "string" ? (
        <span className="truncate">{content}</span>
      ) : (
        content
      )}
    </button>
  );
}
