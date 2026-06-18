"use client";

import { useEffect, useRef } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { stampExecutionProfileOnEvent } from "@/lib/globe/prep/prep-checklist-commit";

/** Infer execution profile + seed prep checklist from active context labels. */
export function useExecutionProfileStamp(input: {
  activeEventId: string | null | undefined;
  contextPlace?: string | null;
  enabled?: boolean;
}) {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }
    const eventId = input.activeEventId?.trim();
    if (!eventId) {
      return;
    }
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }
    const label = `${event.title} ${input.contextPlace ?? event.place ?? ""}`.trim();
    const key = `${eventId}|${label}`;
    if (lastKeyRef.current === key) {
      return;
    }
    lastKeyRef.current = key;
    stampExecutionProfileOnEvent({ event, label });
  }, [input.activeEventId, input.contextPlace, input.enabled]);
}
