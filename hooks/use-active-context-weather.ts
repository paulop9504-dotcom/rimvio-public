"use client";

import { useEffect, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function useActiveContextWeather(input: {
  event: EventCandidate | null | undefined;
  enabled?: boolean;
}): { tempC: number | null; prepLine: string | null } {
  const [tempC, setTempC] = useState<number | null>(null);
  const [prepLine, setPrepLine] = useState<string | null>(null);

  useEffect(() => {
    if (input.enabled === false || !input.event) {
      setTempC(null);
      setPrepLine(null);
      return;
    }

    const plan = readPlanContextFromEvent(input.event);
    const location = plan?.place?.trim() || input.event.place?.trim();
    const targetIso = plan?.windowStartIso?.trim() || input.event.datetime?.trim();
    if (!location || !targetIso) {
      setTempC(null);
      setPrepLine(null);
      return;
    }

    let cancelled = false;
    void fetchWeatherForecastClient({ location, targetIso }).then((payload) => {
      if (cancelled) {
        return;
      }
      setTempC(payload?.weather?.temp_c ?? null);
      setPrepLine(payload?.prep_line ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [input.enabled, input.event]);

  return { tempC, prepLine };
}
