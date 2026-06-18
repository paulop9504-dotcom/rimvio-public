"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Users, X } from "lucide-react";
import type { copy as copyKo } from "@/lib/copy/human-ko";
import type { RelatedContextAxisSearch } from "@/lib/search/search-related-context-by-axis";
import type { RelatedContextSearchResult } from "@/lib/search/search-related-context-by-axis";
import { formatPeerWithLabel } from "@/lib/copy/korean-peer-with";
import { cn } from "@/lib/utils";

type SearchCopy = (typeof copyKo)["search"];

type SearchRelatedContextPanelProps = {
  copy: SearchCopy;
  result: RelatedContextSearchResult;
  onClear: () => void;
};

type AxisKind = "people" | "experience";

function AxisHitList({
  axis,
  copy,
}: {
  axis: RelatedContextAxisSearch;
  copy: SearchCopy;
}) {
  if (axis.hits.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 space-y-2">
      {axis.hits.map((hit) => (
        <li key={hit.eventId}>
          <Link
            href={`/feed?recallEvent=${encodeURIComponent(hit.eventId)}`}
            className="block rounded-2xl bg-white/[0.05] px-4 py-3 shadow-sm transition hover:bg-white/[0.08]"
          >
            {hit.eyebrow ? (
              <p className="text-[11px] font-medium text-white/38">{hit.eyebrow}</p>
            ) : null}
            <p className="text-[15px] font-semibold leading-snug text-white/92">
              {hit.headline}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
              {hit.peerDisplayName ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5 shrink-0" aria-hidden />
                  {formatPeerWithLabel(hit.peerDisplayName)}
                </span>
              ) : null}
              {hit.place ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {hit.place}
                </span>
              ) : null}
              {hit.timeLabel ? <span>{hit.timeLabel}</span> : null}
            </div>
            <p className="mt-2 text-[11px] text-rimvio-neon-cyan/80">
              {copy.contextSearch.openOnFeed}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchRelatedContextPanel({
  copy,
  result,
  onClear,
}: SearchRelatedContextPanelProps) {
  const axisCopy = copy.contextSearch;
  const [expandedAxis, setExpandedAxis] = useState<AxisKind | "all">(
    result.people.hits.length > 0 && result.experience.hits.length === 0
      ? "people"
      : result.experience.hits.length > 0 && result.people.hits.length === 0
        ? "experience"
        : "all",
  );

  const hasPeople = result.people.hits.length > 0;
  const hasExperience = result.experience.hits.length > 0;
  const isEmpty = !hasPeople && !hasExperience;

  const toggleAxis = (kind: AxisKind | "all") => {
    setExpandedAxis((current) => (current === kind ? "all" : kind));
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
            {axisCopy.eyebrow}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-white/90">
            {axisCopy.titleForQuery(result.query)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {result.people.summaryLine ? (
              <p className="inline-flex items-center gap-1 text-[11px] text-white/48">
                <Users className="size-3 shrink-0 text-white/35" aria-hidden />
                <span className="font-medium text-white/35">{axisCopy.peoplePrefix}</span>
                {result.people.summaryLine}
              </p>
            ) : null}
            {result.experience.summaryLine ? (
              <p className="inline-flex items-center gap-1 text-[11px] text-white/48">
                <MapPin className="size-3 shrink-0 text-white/35" aria-hidden />
                <span className="font-medium text-white/35">{axisCopy.experiencePrefix}</span>
                {result.experience.summaryLine}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
          aria-label={axisCopy.clear}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {!isEmpty ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hasPeople ? (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                expandedAxis === "people"
                  ? "border-violet-300/45 bg-violet-500/20 text-violet-100"
                  : "border-white/12 bg-white/[0.06] text-white/72",
              )}
              onClick={() => toggleAxis("people")}
            >
              <Users className="size-3" aria-hidden />
              {axisCopy.peopleButton(result.people.hits.length)}
            </button>
          ) : null}
          {hasExperience ? (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                expandedAxis === "experience"
                  ? "border-sky-300/45 bg-sky-500/20 text-sky-100"
                  : "border-white/12 bg-white/[0.06] text-white/72",
              )}
              onClick={() => toggleAxis("experience")}
            >
              <MapPin className="size-3" aria-hidden />
              {axisCopy.experienceButton(result.experience.hits.length)}
            </button>
          ) : null}
        </div>
      ) : null}

      {isEmpty ? (
        <p className="mt-4 text-[13px] leading-relaxed text-white/42">{axisCopy.empty}</p>
      ) : expandedAxis === "people" || expandedAxis === "all" ? (
        <AxisHitList axis={result.people} copy={copy} />
      ) : null}

      {expandedAxis === "experience" || (expandedAxis === "all" && hasExperience) ? (
        <AxisHitList axis={result.experience} copy={copy} />
      ) : null}
    </div>
  );
}
