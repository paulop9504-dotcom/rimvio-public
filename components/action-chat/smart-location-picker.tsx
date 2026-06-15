"use client";

import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildLocationSuggestions,
  filterLocationSuggestions,
} from "@/lib/corrections/location-suggestions";
import type { ConfirmationExtractedData, LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import { isSystemQuery } from "@/lib/action-chat/confirm-input-guard";
import {
  rimvioEdgeCardClass,
  rimvioIconBtnClass,
  rimvioListPickBtnClass,
} from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

type SmartLocationPickerProps = {
  open: boolean;
  extracted?: ConfirmationExtractedData | null;
  onSelect: (suggestion: LocationSuggestion) => void;
  className?: string;
};

export function SmartLocationPicker({
  open,
  extracted,
  onSelect,
  className,
}: SmartLocationPickerProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(
    () => {
      if (isSystemQuery(query)) {
        return [];
      }
      return filterLocationSuggestions(
        buildLocationSuggestions({
          place_name: extracted?.place_name,
          address: extracted?.address,
          query,
        }),
        query
      );
    },
    [extracted?.address, extracted?.place_name, query]
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "smart-location-picker p-3",
        rimvioEdgeCardClass("lg", "cyan"),
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={rimvioIconBtnClass("cyan", "sm")}>
          <MapPin className="size-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Smart Location Picker</p>
          <p className="text-[11px] text-muted-foreground">탭 한 번으로 위치를 보정하세요</p>
        </div>
      </div>

      <label className="relative mb-2 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            if (isSystemQuery(next)) {
              return;
            }
            setQuery(next);
          }}
          placeholder="장소 검색"
          className="w-full rounded-xl bg-rimvio-surface-raised py-2.5 pl-9 pr-3 text-[13px] text-foreground outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-muted-foreground focus:shadow-[inset_0_0_0_1px_rgba(50,215,255,0.35)]"
        />
      </label>

      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {suggestions.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={rimvioListPickBtnClass()}
            >
              <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
              <span className="text-[11px] text-muted-foreground">{item.address}</span>
            </button>
          </li>
        ))}
        {suggestions.length === 0 ? (
          <li className="px-2 py-3 text-center text-[12px] text-muted-foreground">
            주변 후보가 없습니다. 검색어를 바꿔 보세요.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
