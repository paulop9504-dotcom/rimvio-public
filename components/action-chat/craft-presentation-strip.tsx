"use client";

import type {
  CraftContextIcon,
  CraftMadLibsSlot,
  CraftPolarSlider,
  CraftVitalityReact,
} from "@/lib/action-chat/conversation-craft/types";
import { cn } from "@/lib/utils";

type CraftPresentationStripProps = {
  contextIcons?: CraftContextIcon[];
  madLibs?: CraftMadLibsSlot[];
  polarSlider?: CraftPolarSlider | null;
  vitalityReact?: CraftVitalityReact[];
  onPrompt?: (prompt: string) => void;
  className?: string;
};

export function CraftPresentationStrip({
  contextIcons,
  madLibs,
  polarSlider,
  vitalityReact,
  onPrompt,
  className,
}: CraftPresentationStripProps) {
  if (!onPrompt) return null;

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      {vitalityReact?.length ? (
        <div className="flex flex-wrap gap-2">
          {vitalityReact.map((item) => (
            <button
              key={item.vitality}
              type="button"
              className="rounded-full border border-slate-200 bg-rimvio-surface px-3 py-1.5 text-[13px] shadow-sm transition hover:border-[#4A90E2]"
              onClick={() => onPrompt(item.prompt)}
            >
              <span className="mr-1">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {contextIcons?.length ? (
        <div className="flex flex-wrap gap-2">
          {contextIcons.map((icon) => (
            <button
              key={`${icon.icon}-${icon.label}`}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] text-slate-700 hover:border-[#4A90E2]"
              onClick={() => onPrompt(icon.prompt)}
            >
              <span>{icon.icon}</span>
              <span>{icon.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {madLibs?.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-relaxed text-slate-700">
          {madLibs.map((slot, index) => (
            <span key={slot.id}>
              {index > 0 ? " · " : null}
              <button
                type="button"
                className="mx-0.5 rounded-md bg-rimvio-surface px-1.5 py-0.5 font-medium text-[#4A90E2] underline-offset-2 hover:underline"
                onClick={() => {
                  const alt = slot.alternatives[(index + 1) % slot.alternatives.length] ?? slot.value;
                  onPrompt(`${slot.label} ${alt}로 다시 추천해줘`);
                }}
              >
                {slot.value}
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {polarSlider ? (
        <div className="rounded-xl border border-slate-200 bg-rimvio-surface px-3 py-2">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>{polarSlider.left}</span>
            <span>{polarSlider.right}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={polarSlider.defaultPosition}
            className="w-full accent-[#4A90E2]"
            onChange={(event) => {
              const value = Number(event.target.value);
              const lean =
                value < 40
                  ? polarSlider.left
                  : value > 60
                    ? polarSlider.right
                    : "균형";
              onPrompt(`${polarSlider.left}와 ${polarSlider.right} 중 ${lean} 쪽으로 다시 추천해줘`);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
