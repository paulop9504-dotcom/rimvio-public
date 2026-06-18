"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Calm settings block — no neon edge cards. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-rimvio-surface/90 px-4 py-4",
        className,
      )}
    >
      <header className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-white/[0.05] py-3 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

export function SettingsListItem({
  title,
  subtitle,
  trailing,
  onClick,
  className,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
        onClick && "transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {trailing}
    </Comp>
  );
}
