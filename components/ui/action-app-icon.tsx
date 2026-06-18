"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { ActionAppIconTheme } from "@/lib/feed/action-app-icon-theme";

type ActionAppIconProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: LucideIcon;
  theme: ActionAppIconTheme;
  size?: "md" | "lg";
  badge?: string | number | null;
};

export function ActionAppIcon({
  label,
  icon: Icon,
  theme,
  size = "md",
  badge,
  className,
  type = "button",
  ...props
}: ActionAppIconProps) {
  const iconBox = size === "lg" ? "size-[72px]" : "size-[60px]";
  const iconGlyph = size === "lg" ? "size-8" : "size-7";

  return (
    <button
      type={type}
      className={cn("rimvio-action-app-icon group", className)}
      {...props}
    >
      <span className="relative">
        <span
          className={cn(
            "rimvio-action-app-icon__squircle flex items-center justify-center",
            iconBox,
            theme.emphasis && "rimvio-action-app-icon__squircle--emphasis"
          )}
          style={{ background: theme.background }}
        >
          {theme.monogram ? (
            <span
              className={cn("font-bold leading-none", size === "lg" ? "text-2xl" : "text-xl")}
              style={{ color: theme.iconColor }}
            >
              {theme.monogram}
            </span>
          ) : (
            <Icon className={iconGlyph} strokeWidth={2.1} style={{ color: theme.iconColor }} />
          )}
        </span>
        {badge != null && badge !== "" ? (
          <span className="rimvio-action-app-icon__badge" aria-hidden>
            {badge}
          </span>
        ) : null}
      </span>
      <span className="rimvio-action-app-icon__label">{label}</span>
    </button>
  );
}
