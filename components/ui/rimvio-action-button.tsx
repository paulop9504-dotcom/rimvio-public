"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { NavAuxBrandStyle } from "@/lib/brand/action-brand-style";
import { cn } from "@/lib/utils";

export type RimvioActionButtonVariant = "primary" | "secondary" | "ghost";
export type RimvioActionButtonLayout = "default" | "tile" | "pill" | "compact";

type RimvioActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: RimvioActionButtonVariant;
  layout?: RimvioActionButtonLayout;
  icon?: LucideIcon;
  iconSlot?: ReactNode;
  /** Brand-colored icon shell (secondary / AUX). */
  iconBrand?: NavAuxBrandStyle;
  hint?: string | null;
  trailing?: ReactNode;
  fullWidth?: boolean;
};

export function RimvioActionButton({
  variant = "primary",
  layout = "default",
  icon: Icon,
  iconSlot,
  iconBrand,
  hint,
  trailing,
  fullWidth = false,
  className,
  children,
  type = "button",
  ...props
}: RimvioActionButtonProps) {
  const isTile = layout === "tile";
  const isPill = layout === "pill";
  const isCompact = layout === "compact";

  return (
    <button
      type={type}
      className={cn(
        "rimvio-action-button",
        variant === "secondary" && "rimvio-action-button--secondary",
        variant === "ghost" && "rimvio-action-button--ghost",
        isTile && "rimvio-action-button--tile",
        isPill && "rimvio-action-button--pill",
        isCompact && "rimvio-action-button--compact",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {iconSlot ? (
        <span className="rimvio-action-button__icon" aria-hidden>
          {iconSlot}
        </span>
      ) : Icon ? (
        <span
          className={cn(
            "rimvio-action-button__icon",
            iconBrand && "rimvio-action-button__icon--brand",
          )}
          style={
            iconBrand
              ? { color: iconBrand.iconColor, backgroundColor: iconBrand.iconBg }
              : undefined
          }
          aria-hidden
        >
          <Icon className="size-[18px]" strokeWidth={2.15} />
        </span>
      ) : null}

      <span className="rimvio-action-button__content">
        <span className="rimvio-action-button__label">{children}</span>
        {hint ? <span className="rimvio-action-button__hint">{hint}</span> : null}
      </span>

      {trailing ? (
        <span className="rimvio-action-button__trailing" aria-hidden>
          {trailing}
        </span>
      ) : null}
    </button>
  );
}
