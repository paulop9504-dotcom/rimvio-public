"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import {
  prepChecklistCompletionLine,
  prepChecklistHeadline,
  readPrepChecklistState,
  shouldOfferPrepChecklist,
  togglePrepChecklistItem,
  type PrepChecklistItemId,
} from "@/lib/globe/prep";
import { EVENT_CANDIDATES_UPDATED, findLifeEventCandidate } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

export type GlobePrepChecklistCardProps = {
  activeEventId?: string | null;
  className?: string;
};

export function GlobePrepChecklistCard({
  activeEventId,
  className,
}: GlobePrepChecklistCardProps) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const event = useMemo((): EventCandidate | null => {
    void revision;
    const id = activeEventId?.trim();
    return id ? findLifeEventCandidate(id) : null;
  }, [activeEventId, revision]);

  const checklist = useMemo(() => {
    if (!event || !shouldOfferPrepChecklist(event)) {
      return null;
    }
    return readPrepChecklistState(event);
  }, [event]);

  const onToggle = useCallback(
    (itemId: PrepChecklistItemId) => {
      if (!event) {
        return;
      }
      togglePrepChecklistItem({ event, itemId });
      setRevision((value) => value + 1);
    },
    [event],
  );

  if (!checklist) {
    return null;
  }

  const checkedCount = checklist.items.filter((row) => row.checked).length;
  const completion = prepChecklistCompletionLine(checkedCount, checklist.items.length);

  return (
    <section
      className={cn(
        "rounded-[1.1rem] border border-border/50 bg-card/95 px-3 py-2.5 shadow-sm",
        className,
      )}
      data-globe-prep-checklist
      aria-label={prepChecklistHeadline(checklist.profileId)}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
        {copy.globe.prepChecklistEyebrow}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
        {prepChecklistHeadline(checklist.profileId)}
      </p>
      <ul className="mt-2 space-y-1.5">
        {checklist.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left active:bg-muted/50"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                  item.checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-transparent",
                )}
                aria-hidden
              >
                ✓
              </span>
              <span
                className={cn(
                  "text-[12px] font-medium leading-snug",
                  item.checked ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {item.labelKo}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {completion ? (
        <p className="mt-2 text-[11px] font-semibold text-primary">{completion}</p>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">{copy.globe.prepChecklistHint}</p>
      )}
    </section>
  );
}
