"use client";

import { useState } from "react";
import type { SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import type { SpacetimeTargetSheetState } from "@/hooks/use-search-capture-ingest";
import { cn } from "@/lib/utils";

const PLACE_CHIPS = ["제주", "강남역", "부산", "홍대", "성수"] as const;
const NIGHT_CHIPS = [1, 2, 3, 5] as const;

type SpacetimeTargetSheetProps = {
  state: SpacetimeTargetSheetState;
  onConfirmMatch: (match: SpacetimeFeedTargetMatch) => void;
  onCreatePlan: (input: { place: string; nights: number; title?: string }) => void;
  onDismiss: () => void;
};

export function SpacetimeTargetSheet({
  state,
  onConfirmMatch,
  onCreatePlan,
  onDismiss,
}: SpacetimeTargetSheetProps) {
  const [place, setPlace] = useState(
    state?.result.fragment.placeLabel?.trim() ||
      state?.result.match?.placeLabel?.trim() ||
      "",
  );
  const [nights, setNights] = useState(2);

  if (!state) {
    return null;
  }

  const { result, candidates } = state;
  const suggested = result.match ?? candidates[0] ?? null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="mx-auto max-w-lg rounded-2xl bg-[#12141c]/95 p-4 shadow-lg ring-1 ring-white/10 backdrop-blur-md">
        <p className="text-[13px] font-semibold text-white">어디·언제 일정에 붙일까요?</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/50">
          처음 타겟을 잡아두면 사진·링크가 Feed 슬롯에 자동으로 모여요.
        </p>

        {suggested ? (
          <button
            type="button"
            onClick={() => onConfirmMatch(suggested)}
            className="mt-3 w-full rounded-xl bg-white/[0.08] px-3 py-2.5 text-left ring-1 ring-white/10 transition hover:bg-white/[0.12]"
          >
            <p className="text-[14px] font-medium text-white">{suggested.reason}</p>
            <p className="mt-0.5 text-[11px] text-white/45">이 일정에 붙이기</p>
          </button>
        ) : null}

        {candidates.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {candidates.slice(suggested ? 1 : 0).map((candidate) => (
              <button
                key={candidate.eventId}
                type="button"
                onClick={() => onConfirmMatch(candidate)}
                className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/70 ring-1 ring-white/10"
              >
                {candidate.reason}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-medium text-white/45">새 일정 만들기</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLACE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setPlace(chip)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] ring-1 ring-white/10",
                  place === chip
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/70",
                )}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NIGHT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setNights(chip)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] ring-1 ring-white/10",
                  nights === chip
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/70",
                )}
              >
                {chip}박
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!place.trim()}
            onClick={() =>
              onCreatePlan({
                place: place.trim(),
                nights,
                title: `${place.trim()} 여행`,
              })
            }
            className="mt-3 w-full rounded-xl bg-white px-3 py-2.5 text-[14px] font-semibold text-black disabled:opacity-40"
          >
            {place.trim() ? `${place.trim()} ${nights}박 일정 만들기` : "장소를 골라 주세요"}
          </button>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full py-1 text-center text-[11px] text-white/35"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
