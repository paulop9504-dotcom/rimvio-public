"use client";

import { memo, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  collectFeedSlotTaxonomyOptions,
  type FeedSlotTaxonomyFilters,
} from "@/lib/feed/feed-slot-taxonomy";
import type { FeedSlotTaxonomy } from "@/lib/feed/feed-slot-taxonomy";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type FeedSlotTaxonomyFiltersProps = {
  slots: readonly FeedTodaySlot[];
  taxonomies: Map<string, FeedSlotTaxonomy>;
  filters: FeedSlotTaxonomyFilters;
  onChange: (next: FeedSlotTaxonomyFilters) => void;
  className?: string;
};

function TaxonomyRow({
  label,
  allLabel,
  activeId,
  options,
  onSelect,
}: {
  label: string;
  allLabel: string;
  activeId: string | null;
  options: Array<{ id: string; label: string; count: number }>;
  onSelect: (id: string | null) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
            activeId === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-accent",
          )}
        >
          {allLabel}
        </button>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(activeId === option.id ? null : option.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              activeId === option.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-accent",
            )}
          >
            {option.label}
            <span className="ml-1 tabular-nums text-muted-foreground">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 대 · 중 · 소 분류 + 검색 — 쌓인 경험 슬롯 탐색. */
export const FeedSlotTaxonomyFilters = memo(function FeedSlotTaxonomyFilters({
  slots,
  taxonomies,
  filters,
  onChange,
  className,
}: FeedSlotTaxonomyFiltersProps) {
  const copy = useCopy();
  const taxonomyCopy = copy.feed.today.taxonomy;

  const options = useMemo(
    () =>
      collectFeedSlotTaxonomyOptions({
        slots,
        taxonomies,
        filters,
      }),
    [slots, taxonomies, filters],
  );

  const hasActiveFilter = Boolean(
    filters.query.trim() || filters.l1Id || filters.l2Id || filters.l3Id,
  );

  return (
    <div
      className={cn("shrink-0 space-y-3 px-4 pb-2.5", className)}
      data-feed-slot-taxonomy-filters
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={filters.query}
          onChange={(event) =>
            onChange({
              ...filters,
              query: event.target.value,
            })
          }
          placeholder={taxonomyCopy.searchPlaceholder}
          className="h-10 w-full rounded-2xl bg-secondary pl-9 pr-9 text-[13px] text-foreground outline-none ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          aria-label={taxonomyCopy.searchAria}
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => onChange({ ...filters, query: "" })}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label={taxonomyCopy.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <TaxonomyRow
        label={taxonomyCopy.l1}
        allLabel={copy.feed.today.filterAll}
        activeId={filters.l1Id}
        options={options.l1}
        onSelect={(l1Id) =>
          onChange({
            ...filters,
            l1Id,
            l2Id: null,
            l3Id: null,
          })
        }
      />

      {options.l2.length > 0 ? (
        <TaxonomyRow
          label={taxonomyCopy.l2}
          allLabel={copy.feed.today.filterAll}
          activeId={filters.l2Id}
          options={options.l2}
          onSelect={(l2Id) =>
            onChange({
              ...filters,
              l2Id,
              l3Id: null,
            })
          }
        />
      ) : null}

      {options.l3.length > 1 ? (
        <TaxonomyRow
          label={taxonomyCopy.l3}
          allLabel={copy.feed.today.filterAll}
          activeId={filters.l3Id}
          options={options.l3}
          onSelect={(l3Id) =>
            onChange({
              ...filters,
              l3Id,
            })
          }
        />
      ) : null}

      {hasActiveFilter ? (
        <button
          type="button"
          onClick={() =>
            onChange({
              query: "",
              l1Id: null,
              l2Id: null,
              l3Id: null,
            })
          }
          className="text-[11px] font-semibold text-rimvio-neon-cyan"
        >
          {taxonomyCopy.reset}
        </button>
      ) : null}
    </div>
  );
});
