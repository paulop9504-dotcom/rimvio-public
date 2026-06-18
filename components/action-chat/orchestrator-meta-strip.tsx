"use client";

import { CalendarClock, FolderPlus, AlertTriangle } from "lucide-react";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { cn } from "@/lib/utils";

type OrchestratorMetaStripProps = {
  message: Pick<
    ActionChatMessage,
    "schedule" | "container" | "metadata"
  >;
  className?: string;
};

export function OrchestratorMetaStrip({ message, className }: OrchestratorMetaStripProps) {
  const schedule = message.schedule;
  const container = message.container;
  const intent = message.metadata?.intent;

  const showSchedule =
    schedule && (schedule.is_conflict || schedule.tasks.length > 0);
  const showContainer =
    container?.should_save && container.action !== "NONE" && container.title;

  if (!showSchedule && !showContainer && !intent) {
    return null;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {schedule?.is_conflict ? (
        <div className="flex items-start gap-2 rounded-xl bg-[#FFF7ED] px-3 py-2 ring-1 ring-[#FDBA74]/40">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#EA580C]" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#C2410C]">?�정 충돌</p>
            <p className="text-[11px] leading-snug text-[#9A3412]/90">
              {schedule.message || "기존 ?�정�?겹쳐??"}
            </p>
          </div>
        </div>
      ) : null}

      {schedule && schedule.tasks.length > 0 && !schedule.is_conflict ? (
        <div className="rounded-xl bg-[#F7F6FF] px-3 py-2 ring-1 ring-[#7B61FF]/12">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rimvio-neon-purple">
            <CalendarClock className="size-3.5" />
            ?�늘 ?�정
          </div>
          <ul className="mt-1 space-y-0.5">
            {schedule.tasks.slice(0, 3).map((task) => (
              <li
                key={`${task.time}-${task.task}`}
                className="flex justify-between gap-2 text-[11px] text-[#374151]"
              >
                <span className="tabular-nums text-muted-foreground">{task.time}</span>
                <span className="min-w-0 truncate text-right">{task.task}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showContainer ? (
        <div className="flex items-center gap-2 rounded-xl bg-rimvio-surface px-3 py-2 ring-1 ring-black/[0.05]">
          <FolderPlus className="size-4 shrink-0 text-rimvio-neon-purple" />
          <p className="text-[11px] leading-snug text-[#374151]">
            {container!.action === "UPDATE"
              ? `??{container!.title}??컨테?�너???�어???�?�할게요.`
              : `??{container!.title}??컨테?�너�??�로 만들까요?`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
