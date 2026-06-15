"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import {
  isGlobeContextExternal,
  setGlobeContextVisibility,
} from "@/lib/globe/set-globe-context-visibility";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { tryPublishGlobePinVisibilityRemote } from "@/lib/globe/publish-globe-pin-remote-sync";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

export type GlobeContextVisibilityToggleProps = {
  eventId: string | null | undefined;
  className?: string;
};

/** P2 — share personal trace for discovery (experience + external). */
export function GlobeContextVisibilityToggle({
  eventId,
  className,
}: GlobeContextVisibilityToggleProps) {
  const [busy, setBusy] = useState(false);
  const key = eventId?.trim() ?? "";
  const event = key ? findLifeEventCandidate(key) : null;
  const external = isGlobeContextExternal(event);

  const toggle = useCallback(async () => {
    if (!key || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = setGlobeContextVisibility({
        eventId: key,
        external: !external,
      });
      const pin = findPersonalGlobePinByEventId(key);
      if (pin) {
        await tryPublishGlobePinVisibilityRemote({
          pin,
          visibility: result.visibility,
        });
      }
      window.dispatchEvent(new CustomEvent(EVENT_CANDIDATES_UPDATED));
      toast.success(
        result.visibility === "external"
          ? copy.globe.shareTraceOn
          : copy.globe.shareTraceOff,
      );
      if (result.pioneerCell && result.visibility === "external") {
        toast.message(copy.globe.pioneerHint);
      }
    } catch {
      toast.error(copy.globe.shareTraceFail);
    } finally {
      setBusy(false);
    }
  }, [busy, external, key]);

  if (!key || !event) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={cn(
        "w-full rounded-xl px-3 py-2.5 text-[13px] font-semibold active:scale-[0.99]",
        external
          ? "bg-primary/12 text-primary"
          : "bg-muted/80 text-foreground",
        className,
      )}
      data-globe-visibility-toggle
    >
      {external ? copy.globe.shareTraceLabelOn : copy.globe.shareTraceLabelOff}
    </button>
  );
}
