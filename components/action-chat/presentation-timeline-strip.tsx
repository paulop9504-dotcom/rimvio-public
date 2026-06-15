"use client";

import type { OrchestratorScheduleWire } from "@/lib/action-chat/orchestrator-types";

type PresentationTimelineStripProps = {
  schedule: OrchestratorScheduleWire;
};

/** TIMELINE mode ??time axis, no photos. */
export function PresentationTimelineStrip({ schedule }: PresentationTimelineStripProps) {
  if (!schedule.tasks.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {schedule.message ? (
        <p className="text-[12px] font-medium text-amber-700">{schedule.message}</p>
      ) : null}
      <ol className="relative space-y-0 border-l border-[#E5E7EB] pl-4">
        {schedule.tasks.map((task) => (
          <li key={`${task.time}-${task.task}`} className="relative pb-3 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-[#4A90E2]"
            />
            <p className="text-[11px] font-semibold text-[#4A90E2]">{task.time}</p>
            <p className="text-[13px] font-medium text-foreground">{task.task}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
