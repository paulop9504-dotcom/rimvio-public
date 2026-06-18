"use client";

import { OverlayEventChip } from "@/components/action-chat/overlay-event-chip";
import type { SchedulePrepSurface } from "@/lib/calendar/resolve-schedule-prep-surface";
import { cn } from "@/lib/utils";

type PrepSurfaceBoardProps = {
  prepSurface: Pick<SchedulePrepSurface, "rows" | "phase" | "title">;
  onSpawnPrompt?: (uri: string) => void;
  className?: string;
};

export function PrepSurfaceBoard({
  prepSurface,
  onSpawnPrompt,
  className,
}: PrepSurfaceBoardProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {prepSurface.title}
      </p>
      {prepSurface.rows.map((row) => (
        <OverlayEventChip
          key={row.id}
          event={row.event}
          overlayActions={row.overlayActions}
          context_lines={row.context_lines}
          prompt_hint={row.prompt_hint}
          compact
          telemetrySurface="prep"
          telemetryPhase={prepSurface.phase}
          onSpawnPrompt={onSpawnPrompt}
        />
      ))}
    </div>
  );
}
