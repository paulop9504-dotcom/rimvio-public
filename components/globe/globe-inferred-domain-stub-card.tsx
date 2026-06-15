"use client";

import { X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { InferredPinDomainStub } from "@/lib/globe/resolve-inferred-pin-domain-stub";
import { cn } from "@/lib/utils";

export type GlobeInferredDomainStubCardProps = {
  stub: InferredPinDomainStub | null;
  onDismiss: () => void;
  className?: string;
};

function formatPriceHint(slots: Record<string, unknown>): string | null {
  const raw = slots.priceKrw;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }
  if (raw >= 10_000) {
    return `${Math.round(raw / 10_000)}만원`;
  }
  return `${raw.toLocaleString("ko-KR")}원`;
}

/** P2 prep — quiet hint when composer inferred a future pin domain (no marketplace UI). */
export function GlobeInferredDomainStubCard({
  stub,
  onDismiss,
  className,
}: GlobeInferredDomainStubCardProps) {
  if (!stub) {
    return null;
  }

  const priceHint = formatPriceHint(stub.slots);

  return (
    <div
      className={cn(
        "rounded-[1.15rem] border border-border bg-card/95 p-3.5 shadow-sm ring-1 ring-black/5 backdrop-blur-md",
        className,
      )}
      data-globe-inferred-domain-stub
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {copy.globe.inferredDomainEyebrow}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {copy.globe.inferredDomainTitle(stub.labelKo)}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.inferredDomainBody}
          </p>
          {priceHint ? (
            <p className="mt-1.5 text-[11px] font-medium text-foreground/80">
              {copy.globe.inferredDomainPriceHint(priceHint)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground active:scale-95"
          aria-label="닫기"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
