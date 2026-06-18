"use client";

import { CalendarDays, UtensilsCrossed, Sparkles } from "lucide-react";
import {
  COLD_START_DINING_SEED,
  COLD_START_SCHEDULE_SEED,
  markColdStartComplete,
  markColdStartSeedSent,
} from "@/lib/onboarding/cold-start-magic";
import { cn } from "@/lib/utils";

const SCHEDULE_HINT = "내일 12:30 · 강남역";
const DINING_HINT = "강남역 떡반집";

type OnboardingMagicPanelProps = {
  onSendSeed: (message: string) => void;
  onDismiss?: () => void;
  className?: string;
};

export function OnboardingMagicPanel({
  onSendSeed,
  onDismiss,
  className,
}: OnboardingMagicPanelProps) {
  return (
    <section
      className={cn(
        "mx-auto mb-2 w-[min(100%,17.5rem)] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.97] shadow-[0_8px_24px_-16px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#7B61FF]" aria-hidden />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-tight text-[#1F2937]">
            30초 온보딩
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-[#6B7280]">
            일정·맛집 하나만 던져보세요
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
        <button
          type="button"
          className="flex min-w-0 flex-col gap-1 rounded-lg bg-[#F7F6FF] px-2 py-2 text-left transition active:scale-[0.98]"
          onClick={() => {
            markColdStartSeedSent("schedule");
            onSendSeed(COLD_START_SCHEDULE_SEED);
          }}
        >
          <span className="flex items-center gap-1 text-[#7B61FF]">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold text-[#1F2937]">일정</span>
          </span>
          <span className="truncate text-[10px] text-[#6B7280]">{SCHEDULE_HINT}</span>
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-col gap-1 rounded-lg bg-[#F7F6FF] px-2 py-2 text-left transition active:scale-[0.98]"
          onClick={() => {
            markColdStartSeedSent("dining");
            onSendSeed(COLD_START_DINING_SEED);
          }}
        >
          <span className="flex items-center gap-1 text-[#7B61FF]">
            <UtensilsCrossed className="size-3.5 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold text-[#1F2937]">맛집</span>
          </span>
          <span className="truncate text-[10px] text-[#6B7280]">{DINING_HINT}</span>
        </button>
      </div>

      <div className="border-t border-[#F3F4F6] px-2 py-1">
        <button
          type="button"
          className="w-full py-0.5 text-[10px] font-medium text-[#9CA3AF]"
          onClick={() => {
            markColdStartComplete();
            onDismiss?.();
          }}
        >
          나중에 할게요
        </button>
      </div>
    </section>
  );
}
