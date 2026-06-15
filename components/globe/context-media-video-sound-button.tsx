"use client";

import { Volume2, VolumeX } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ContextMediaVideoSoundButtonProps = {
  soundOn: boolean;
  onToggleSound: () => void;
  /** Compact icon-only vs labeled pill (map bubble). */
  variant?: "icon" | "pill";
  className?: string;
};

/** Speaker control — labeled pill so it reads beside 재생/일시정지. */
export function ContextMediaVideoSoundButton({
  soundOn,
  onToggleSound,
  variant = "pill",
  className,
}: ContextMediaVideoSoundButtonProps) {
  const Icon = soundOn ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto inline-flex items-center justify-center rounded-full backdrop-blur-md",
        variant === "pill"
          ? "gap-1 px-2.5 py-1.5 text-[10px] font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
          : "size-11",
        soundOn
          ? "bg-black/70 text-white ring-2 ring-white/30"
          : "bg-white text-[#191f28] ring-2 ring-white",
        className,
      )}
      data-globe-context-video-sound={soundOn ? "on" : "off"}
      aria-label={
        soundOn ? copy.globe.contextVideoSoundOn : copy.globe.contextVideoSoundOff
      }
      aria-pressed={soundOn}
      onClick={(event) => {
        event.stopPropagation();
        onToggleSound();
      }}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      {variant === "pill" ? <span>소리</span> : null}
    </button>
  );
}
