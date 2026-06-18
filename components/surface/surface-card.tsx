"use client";

import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import { cn } from "@/lib/utils";

export type SurfaceCardProps = {
  surface: RankedSurface;
  onPrimary?: () => void;
  onSecondary?: (actionId: string) => void;
  className?: string;
};

/** Render-only — no ranking, no primary selection. */
export function SurfaceCard({
  surface,
  onPrimary,
  onSecondary,
  className,
}: SurfaceCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-black/[0.06] bg-white/95 p-4 shadow-sm",
        className,
      )}
      data-surface-id={surface.id}
      data-surface-type={surface.type}
    >
      <header className="space-y-1">
        <h3 className="text-[15px] font-semibold text-rimvio-ink">{surface.title}</h3>
        {surface.description ? (
          <p className="text-[13px] leading-snug text-rimvio-ink/65">{surface.description}</p>
        ) : null}
      </header>

      {surface.narration?.summary ? (
        <p className="mt-2 text-[12px] text-rimvio-ink/50">{surface.narration.summary}</p>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          className="w-full rounded-xl bg-rimvio-ink px-4 py-3 text-[15px] font-medium text-white"
          onClick={onPrimary}
        >
          {surface.primaryAction.label}
        </button>
      </div>

      {surface.secondaryActions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {surface.secondaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="rounded-full border border-black/[0.08] px-3 py-1.5 text-[12px] text-rimvio-ink/80"
              onClick={() => onSecondary?.(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
