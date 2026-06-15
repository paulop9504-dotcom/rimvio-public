"use client";

import { memo, useState } from "react";
import { MapPin, Users } from "lucide-react";
import type {
  RelatedContextAxis,
  SlotRelatedContextBundle,
} from "@/lib/feed/resolve-slot-related-context";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RelatedAxisKind = "people" | "experience";

export type FeedRelatedContextStripProps = {
  bundle: SlotRelatedContextBundle;
  onSelectExperience: (eventId: string) => void;
  className?: string;
};

function AxisList({
  axis,
  onSelectExperience,
  onClose,
}: {
  axis: RelatedContextAxis;
  onSelectExperience: (eventId: string) => void;
  onClose: () => void;
}) {
  if (axis.related.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 space-y-1 rounded-xl bg-secondary p-2">
      {axis.related.map((hit) => (
        <li key={hit.eventId}>
          <button
            type="button"
            className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent active:scale-[0.99]"
            onClick={() => {
              onSelectExperience(hit.eventId);
              onClose();
            }}
          >
            <span className="line-clamp-1 text-[13px] font-semibold text-foreground">
              {hit.headline}
            </span>
            <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {[hit.peerDisplayName, hit.place, hit.timeLabel]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Feed — people · experience axes with tiny per-axis expand buttons. */
export const FeedRelatedContextStrip = memo(function FeedRelatedContextStrip({
  bundle,
  onSelectExperience,
  className,
}: FeedRelatedContextStripProps) {
  const copy = useCopy();
  const relatedCopy = copy.feed.experience.relatedContext;
  const [expandedAxis, setExpandedAxis] = useState<RelatedAxisKind | null>(null);

  const axes = [bundle.people, bundle.experience].filter(
    (axis) => axis.labels.length > 0,
  );

  if (axes.length === 0) {
    return null;
  }

  const toggleAxis = (kind: RelatedAxisKind) => {
    setExpandedAxis((current) => (current === kind ? null : kind));
  };

  return (
    <div
      className={cn("min-w-0", className)}
      data-feed-related-context
      data-feed-related-axes={axes.map((axis) => axis.kind).join(",")}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {bundle.people.labels.length > 0 ? (
          <p className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
            <Users className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
            <span className="font-medium text-muted-foreground/80">{relatedCopy.peoplePrefix}</span>
            <span className="truncate">{bundle.people.summaryLine}</span>
          </p>
        ) : null}
        {bundle.experience.labels.length > 0 ? (
          <p className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
            <span className="font-medium text-muted-foreground/80">{relatedCopy.experiencePrefix}</span>
            <span className="truncate">{bundle.experience.summaryLine}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {bundle.people.related.length > 0 ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
              expandedAxis === "people"
                ? "border-violet-300/45 bg-violet-500/20 text-violet-100"
                : "border-border bg-secondary text-foreground hover:bg-accent",
            )}
            onClick={() => toggleAxis("people")}
            aria-expanded={expandedAxis === "people"}
          >
            <Users className="size-3" aria-hidden />
            {relatedCopy.peopleButton(bundle.people.related.length)}
          </button>
        ) : null}
        {bundle.experience.related.length > 0 ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
              expandedAxis === "experience"
                ? "border-sky-300/45 bg-sky-500/20 text-sky-100"
                : "border-border bg-secondary text-foreground hover:bg-accent",
            )}
            onClick={() => toggleAxis("experience")}
            aria-expanded={expandedAxis === "experience"}
          >
            <MapPin className="size-3" aria-hidden />
            {relatedCopy.experienceButton(bundle.experience.related.length)}
          </button>
        ) : null}
      </div>

      {expandedAxis === "people" ? (
        <AxisList
          axis={bundle.people}
          onSelectExperience={onSelectExperience}
          onClose={() => setExpandedAxis(null)}
        />
      ) : null}
      {expandedAxis === "experience" ? (
        <AxisList
          axis={bundle.experience}
          onSelectExperience={onSelectExperience}
          onClose={() => setExpandedAxis(null)}
        />
      ) : null}
    </div>
  );
});
