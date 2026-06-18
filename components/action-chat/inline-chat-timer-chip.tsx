"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatInlineTimerClock,
  type InlineChatTimerWire,
} from "@/lib/action-chat/mention-timer/inline-chat-timer";
import { rimvioEdgeCardClass } from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

type InlineChatTimerChipProps = {
  timer: InlineChatTimerWire;
  onComplete?: () => void;
  className?: string;
};

export function InlineChatTimerChip({
  timer,
  onComplete,
  className,
}: InlineChatTimerChipProps) {
  const [endsAtMs, setEndsAtMs] = useState(() => new Date(timer.endsAt).getTime());
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(timer.endsAt).getTime() - Date.now()),
  );
  const [paused, setPaused] = useState(false);
  const done = timer.status === "done" || remainingMs <= 0;

  useEffect(() => {
    setEndsAtMs(new Date(timer.endsAt).getTime());
  }, [timer.endsAt]);

  useEffect(() => {
    if (timer.status !== "running" || paused || done) {
      return;
    }

    const tick = () => {
      const next = Math.max(0, endsAtMs - Date.now());
      setRemainingMs(next);
      if (next <= 0) {
        onComplete?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [endsAtMs, timer.status, paused, done, onComplete]);

  const togglePause = useCallback(() => {
    if (done || timer.status !== "running") {
      return;
    }
    if (paused) {
      setEndsAtMs(Date.now() + remainingMs);
      setPaused(false);
      return;
    }
    const frozen = Math.max(0, endsAtMs - Date.now());
    setRemainingMs(frozen);
    setPaused(true);
  }, [done, timer.status, paused, endsAtMs, remainingMs]);

  const running = !done && !paused;

  return (
    <button
      type="button"
      onClick={togglePause}
      disabled={done}
      className={cn(
        rimvioEdgeCardClass("sm", done || running ? "green" : "magenta"),
        "inline-chat-timer-chip inline-flex min-w-[7.25rem] w-fit flex-col gap-1.5 bg-rimvio-surface-raised px-4 py-2.5 text-left text-white",
        running && "inline-chat-timer-chip--running",
        done && "inline-chat-timer-chip--done",
        paused && !done && "inline-chat-timer-chip--paused",
        !done && "transition-[transform,box-shadow] duration-300 active:scale-[0.98]",
        className,
      )}
      aria-live="polite"
      aria-pressed={paused}
      aria-label={
        done
          ? "타이머 종료"
          : paused
            ? `일시정지 ${formatInlineTimerClock(remainingMs)} — 탭하면 재개`
            : `${formatInlineTimerClock(remainingMs)} 남음 — 탭하면 일시정지`
      }
    >
      <div className="relative z-[1] flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]",
            done || running
              ? "bg-rimvio-neon-green text-rimvio-neon-green"
              : "bg-rimvio-neon-magenta text-rimvio-neon-magenta",
          )}
          aria-hidden
        />
        <span className="min-w-[3.25rem] font-mono text-[17px] font-semibold tabular-nums leading-none tracking-wide text-white">
          {done ? "00:00" : formatInlineTimerClock(remainingMs)}
        </span>
      </div>
      <p className="relative z-[1] text-[11px] leading-tight text-white/75">
        {done ? "끝" : paused ? "일시정지" : timer.label}
      </p>
    </button>
  );
}
