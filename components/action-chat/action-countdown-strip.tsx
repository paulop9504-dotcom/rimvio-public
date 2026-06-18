"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import {
  computeActionCountdown,
  formatActionTargetClock,
  type ActionCountdownSnapshot,
} from "@/lib/action-chat/action-countdown";
import { rimvioEdgeCardClass } from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

type ActionCountdownStripProps = {
  targetIso: string;
  /** pending confirm vs confirmed action vs scheduled nav delivery */
  phase?: "confirm" | "action" | "scheduled";
  className?: string;
};

function phaseCopy(phase: ActionCountdownStripProps["phase"], snapshot: ActionCountdownSnapshot) {
  if (snapshot.isPast) {
    return phase === "scheduled" ? "길찾기 공개" : phase === "confirm" ? "확인 마감" : "지금 실행";
  }
  return phase === "scheduled"
    ? "길찾기 공개까지"
    : phase === "confirm"
      ? "액션 예정까지"
      : "일정까지";
}

export function ActionCountdownStrip({
  targetIso,
  phase = "confirm",
  className,
}: ActionCountdownStripProps) {
  const [snapshot, setSnapshot] = useState<ActionCountdownSnapshot | null>(() =>
    computeActionCountdown(targetIso)
  );

  useEffect(() => {
    const tick = () => {
      setSnapshot(computeActionCountdown(targetIso));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [targetIso]);

  if (!snapshot) {
    return null;
  }

  const targetClock = formatActionTargetClock(targetIso);
  const urgent = snapshot.isImminent || snapshot.isPast;

  return (
    <div
      className={cn(
        rimvioEdgeCardClass("sm", urgent ? "amber" : "cyan"),
        "flex items-center justify-between gap-3 px-3 py-2.5",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            urgent
              ? "bg-rimvio-neon-amber/15 text-rimvio-neon-amber"
              : "bg-rimvio-neon-cyan/12 text-rimvio-neon-cyan"
          )}
        >
          <Timer className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">
            {phaseCopy(phase, snapshot)}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">{targetClock} 목표</p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "font-mono text-[18px] font-bold tabular-nums leading-none",
            urgent ? "text-rimvio-neon-amber" : "text-foreground"
          )}
        >
          {snapshot.isPast ? "00:00" : snapshot.clock}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{snapshot.headline}</p>
      </div>
    </div>
  );
}
