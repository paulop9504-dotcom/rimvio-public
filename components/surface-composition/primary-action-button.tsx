"use client";

import type { SurfaceAction } from "@/lib/surface-engine/surface-contract";
import type { SurfaceActionFeedbackPhase } from "@/hooks/use-surface-action-feedback";
import { cn } from "@/lib/utils";

export type PrimaryActionButtonProps = {
  action: SurfaceAction;
  onPress: () => void;
  phase?: SurfaceActionFeedbackPhase;
  statusMessage?: string;
  className?: string;
};

/** Exactly one CTA per primary surface MF — no branching. */
export function PrimaryActionButton({
  action,
  onPress,
  phase = "idle",
  statusMessage,
  className,
}: PrimaryActionButtonProps) {
  const loading = phase === "loading";
  const success = phase === "success";
  const error = phase === "error";

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        data-surface-cta="primary"
        data-capability-id={action.capabilityId}
        data-surface-cta-phase={phase}
        disabled={loading}
        aria-busy={loading}
        className={cn(
          "w-full rounded-xl px-4 py-3 text-[15px] font-medium text-white transition-colors",
          success && "bg-emerald-600",
          error && "bg-red-600/90",
          !success && !error && "bg-rimvio-ink",
          loading && "opacity-80",
          className,
        )}
        onClick={onPress}
      >
        {loading ? "처리 중…" : success ? "완료" : action.label}
      </button>
      {!loading && statusMessage && (success || error) ? (
        <p
          className={cn(
            "text-center text-[12px]",
            success && "text-emerald-700/90",
            error && "text-red-700/90",
          )}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
