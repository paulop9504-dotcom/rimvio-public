"use client";

import { Loader2, MapPin, Navigation } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AreaDisambiguationWire, LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import {
  listRecentAreaPicks,
  recentAreaPicksToSuggestions,
} from "@/lib/location-memory/recent-area-picks";
import { rimvioListPickBtnClass } from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

type AreaDisambiguationPickerProps = {
  wire: AreaDisambiguationWire;
  initialSuggestions?: LocationSuggestion[];
  scopeId: string;
  onSelect: (suggestion: LocationSuggestion) => void;
  className?: string;
};

function formatDistance(km: number | undefined): string | null {
  if (km == null || !Number.isFinite(km)) {
    return null;
  }
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

function mapPinHref(item: LocationSuggestion): string | null {
  if (item.maps_url?.trim()) {
    return item.maps_url.trim();
  }
  if (item.lat != null && item.lng != null) {
    return `https://map.naver.com/v5/search/${encodeURIComponent(item.place_name)}`;
  }
  return null;
}

async function fetchGeocodeSuggestions(
  query: string,
  origin?: { lat: number; lng: number } | null,
): Promise<LocationSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  if (origin) {
    params.set("lat", String(origin.lat));
    params.set("lng", String(origin.lng));
  }
  const path = origin ? "/api/location/nearby" : "/api/location/geocode";
  const res = await fetch(`${path}?${params.toString()}`);
  if (!res.ok) {
    return [];
  }
  const body = (await res.json()) as { suggestions?: LocationSuggestion[] };
  return body.suggestions ?? [];
}

export function AreaDisambiguationPicker({
  wire,
  initialSuggestions = [],
  scopeId,
  onSelect,
  className,
}: AreaDisambiguationPickerProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>(initialSuggestions);
  const [loading, setLoading] = useState(initialSuggestions.length === 0);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const recentSuggestions = useMemo(
    () => recentAreaPicksToSuggestions(listRecentAreaPicks(scopeId)),
    [scopeId],
  );

  const refreshCandidates = useCallback(
    async (origin?: { lat: number; lng: number } | null) => {
      setLoading(true);
      setGeoError(null);
      try {
        const rows = await fetchGeocodeSuggestions(wire.area_token, origin ?? null);
        setSuggestions(rows);
      } finally {
        setLoading(false);
      }
    },
    [wire.area_token],
  );

  useEffect(() => {
    if (initialSuggestions.length > 0) {
      return;
    }
    void refreshCandidates(null);
  }, [initialSuggestions.length, refreshCandidates]);

  const handleNearby = () => {
    if (!navigator.geolocation) {
      setGeoError("이 기기에서는 위치를 사용할 수 없어요.");
      return;
    }

    setNearbyLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          try {
            const rows = await fetchGeocodeSuggestions(wire.area_token, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setSuggestions(rows);
          } finally {
            setNearbyLoading(false);
          }
        })();
      },
      () => {
        setGeoError("위치 권한이 필요해요. 설정에서 허용해 주세요.");
        setNearbyLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const displayList =
    suggestions.length > 0
      ? suggestions
      : recentSuggestions.length > 0
        ? recentSuggestions
        : [];

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-[13px] font-medium text-foreground">{wire.prompt}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleNearby}
          disabled={nearbyLoading || loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-rimvio-surface px-3 py-1.5 text-[12px] font-semibold text-rimvio-neon-cyan shadow-[inset_0_0_0_1px_rgba(50,215,255,0.25)]"
        >
          {nearbyLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Navigation className="size-3.5" />
          )}
          내 주변
        </button>
      </div>

      {geoError ? (
        <p className="text-[11px] text-amber-400/90">{geoError}</p>
      ) : null}

      {recentSuggestions.length > 0 && suggestions.length === 0 && !loading ? (
        <p className="text-[11px] text-muted-foreground">최근에 고른 동네</p>
      ) : null}

      {loading && displayList.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-rimvio-neon-cyan" />
          후보를 불러오는 중…
        </div>
      ) : null}

      <ul className="space-y-1.5">
        {displayList.map((item, index) => {
          const pinHref = mapPinHref(item);
          const distance = formatDistance(item.distance_km);

          return (
            <li key={item.id} className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn("min-w-0 flex-1", rimvioListPickBtnClass(index === 0))}
              >
                <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
                {item.address ? (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {item.address}
                  </span>
                ) : null}
                {distance ? (
                  <span className="mt-0.5 block text-[10px] font-medium text-rimvio-neon-cyan/80">
                    약 {distance}
                  </span>
                ) : null}
              </button>
              {pinHref ? (
                <a
                  href={pinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rimvio-surface text-rimvio-neon-cyan shadow-[inset_0_0_0_1px_rgba(50,215,255,0.2)]"
                  aria-label={`${item.label} 지도에서 보기`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MapPin className="size-4" />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!loading && displayList.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          후보가 없어요. **구·시**를 함께 입력해 주세요. (예: 강남구 {wire.area_token})
        </p>
      ) : null}
    </div>
  );
}
