"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrafficContext } from "@/lib/context-resolver/types";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveBridgeContextWeatherTarget } from "@/lib/globe/resolve-bridge-context-weather-target";
import { fetchTrafficContextClient } from "@/lib/traffic/fetch-traffic-context-client";

function formatTrafficLine(traffic: TrafficContext | null): string | null {
  if (!traffic) {
    return null;
  }
  const base = `이동 약 ${traffic.travel_minutes}분`;
  if (traffic.delay_minutes > 0) {
    return `${base} · 지연 ${traffic.delay_minutes}분`;
  }
  return base;
}

export type BridgeContextEnvironment = {
  loading: boolean;
  weatherLine: string | null;
  weatherCondition: string;
  trafficLine: string | null;
  place: string | null;
};

const POLL_MS = 30 * 60 * 1000;

/** Live weather + traffic for bridge context revisit prep. */
export function useBridgeContextEnvironment(
  event: EventCandidate | null | undefined,
  enabled = true,
): BridgeContextEnvironment {
  const target = useMemo(
    () => (event && enabled ? resolveBridgeContextWeatherTarget(event) : null),
    [enabled, event],
  );

  const requestKey = target
    ? `${target.location}|${target.targetIso}`
    : "";

  const [state, setState] = useState<Omit<BridgeContextEnvironment, "place">>({
    loading: false,
    weatherLine: null,
    weatherCondition: "unknown",
    trafficLine: null,
  });

  useEffect(() => {
    if (!target || !enabled) {
      setState({
        loading: false,
        weatherLine: null,
        weatherCondition: "unknown",
        trafficLine: null,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    const pull = async () => {
      const [weatherPayload, traffic] = await Promise.all([
        fetchWeatherForecastClient({
          location: target.location,
          targetIso: target.targetIso,
        }),
        fetchTrafficContextClient({ destination: target.location }),
      ]);

      if (cancelled) {
        return;
      }

      setState({
        loading: false,
        weatherLine: weatherPayload?.prep_line?.trim() || null,
        weatherCondition: weatherPayload?.weather?.condition ?? "unknown",
        trafficLine: formatTrafficLine(traffic),
      });
    };

    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, requestKey, target]);

  return {
    ...state,
    place: target?.location ?? null,
  };
}
