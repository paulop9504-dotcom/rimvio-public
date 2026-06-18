"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import {
  applyPlacePrefillPlan,
  buildPlacePrefillPlan,
  dismissPlacePrefill,
  shouldOfferPlacePrefill,
} from "@/lib/globe/place-history";
import { EVENT_CANDIDATES_UPDATED, findLifeEventCandidate } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

export type GlobePlacePrefillCardProps = {
  activeEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
  className?: string;
};

export function GlobePlacePrefillCard({
  activeEventId,
  lat = null,
  lng = null,
  className,
}: GlobePlacePrefillCardProps) {
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const plan = useMemo(() => {
    void revision;
    const id = activeEventId?.trim();
    if (!id) {
      return null;
    }
    const event = findLifeEventCandidate(id);
    if (!event || !shouldOfferPlacePrefill(event)) {
      return null;
    }
    return buildPlacePrefillPlan(event);
  }, [activeEventId, revision]);

  const onAccept = useCallback(async () => {
    const id = activeEventId?.trim();
    if (!id || !plan || busy) {
      return;
    }
    const event = findLifeEventCandidate(id);
    if (!event) {
      return;
    }
    setBusy(true);
    try {
      const result = await applyPlacePrefillPlan({
        event,
        plan,
        lat,
        lng,
      });
      toast.success(copy.globe.placePrefillApplied(result.appliedHubs.join(" · ")));
      setRevision((value) => value + 1);
    } catch {
      toast.error(copy.globe.placePrefillApplyFail);
    } finally {
      setBusy(false);
    }
  }, [activeEventId, busy, lat, lng, plan]);

  const onDismiss = useCallback(() => {
    const id = activeEventId?.trim();
    if (!id || !plan) {
      return;
    }
    const event = findLifeEventCandidate(id);
    if (!event) {
      return;
    }
    dismissPlacePrefill({ event, placeKey: plan.placeKey });
    setRevision((value) => value + 1);
  }, [activeEventId, plan]);

  if (!plan) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-[1.1rem] border border-primary/20 bg-primary/5 px-3 py-2.5 shadow-sm",
        className,
      )}
      data-globe-place-prefill
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
        {copy.globe.placePrefillEyebrow}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
        {plan.headlineKo}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{plan.lineKo}</p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onAccept()}
          className="flex-1 rounded-xl bg-foreground py-2 text-[12px] font-bold text-background disabled:opacity-60"
        >
          {copy.globe.placePrefillAccept}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="flex-1 rounded-xl border border-border bg-background py-2 text-[12px] font-semibold text-muted-foreground"
        >
          {copy.globe.placePrefillDismiss}
        </button>
      </div>
    </section>
  );
}
