"use client";

import type { EnricherContext } from "@/lib/enrichers/types";
import type { ActionBinEvent } from "@/lib/intent/types";

export function trackActionBinEvent(input: {
  context: EnricherContext;
  actionKey: string;
  event: ActionBinEvent;
}) {
  void fetch("/api/intent/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => {
    // Non-blocking analytics.
  });
}
