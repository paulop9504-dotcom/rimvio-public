"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContainerCardProps = {
  icon: LucideIcon;
  title: string;
  body?: string | null;
  chips?: string[];
  loading?: boolean;
  meta?: ReactNode;
  footer?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function ContainerCard({
  icon: Icon,
  title,
  body,
  chips = [],
  loading = false,
  meta,
  footer,
  className,
  compact = false,
}: ContainerCardProps) {
  const showBody = Boolean(body?.trim()) && body!.trim() !== title.trim();

  return (
    <article
      className={cn(
        "rimvio-container-card rimvio-point-surface",
        compact && "rimvio-container-card--compact",
        className,
      )}
    >
      <header className="rimvio-container-card__header">
        <span className="rimvio-container-card__icon" aria-hidden>
          <Icon className="size-[18px]" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="rimvio-container-card__title">{title}</h3>
          {loading ? (
            <p className="rimvio-container-card__subtitle text-white/55">생각중…</p>
          ) : chips.length > 0 ? (
            <div className="rimvio-container-card__chips">
              {chips.map((chip) => (
                <span key={chip} className="rimvio-container-card__chip">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {showBody ? (
        <div className="rimvio-container-card__body">
          <p className="rimvio-container-card__body-text">{body}</p>
        </div>
      ) : null}

      {meta ? <div className="rimvio-container-card__meta">{meta}</div> : null}

      {footer ? <footer className="rimvio-container-card__footer">{footer}</footer> : null}
    </article>
  );
}
