"use client";

import { useEffect, useMemo, useState } from "react";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { collectFeedSlotWeatherTargets } from "@/lib/feed/resolve-feed-slot-weather-target";
import {
  planWeatherTargetKey,
  type PlanWeatherTarget,
} from "@/lib/plan-context/resolve-plan-weather-target";

const WEATHER_POLL_MS = 30 * 60 * 1000;

export type PlanWeatherFeedSnapshot = {
  prepLine: string | null;
  weather: WeatherContext | null;
  target: PlanWeatherTarget;
};

/** Schedule-matched weather prep lines for feed slots (surface + calendar). */
export function useFeedPlanWeather(
  slots: readonly FeedTodaySlot[],
  eventsById?: ReadonlyMap<string, EventCandidate>,
): ReadonlyMap<string, PlanWeatherFeedSnapshot> {
  const targets = useMemo(
    () => collectFeedSlotWeatherTargets(slots, eventsById),
    [slots, eventsById],
  );

  const requestKey = useMemo(
    () => targets.map((target) => planWeatherTargetKey(target)).join("|"),
    [targets],
  );

  const [weatherByKey, setWeatherByKey] = useState<
    ReadonlyMap<string, PlanWeatherFeedSnapshot>
  >(() => new Map());

  useEffect(() => {
    if (targets.length === 0) {
      setWeatherByKey(new Map());
      return;
    }

    let cancelled = false;

    const pull = async () => {
      const entries = await Promise.all(
        targets.map(async (target) => {
          const payload = await fetchWeatherForecastClient({
            location: target.location,
            targetIso: target.targetIso,
          });
          if (!payload) {
            return null;
          }
          return [
            planWeatherTargetKey(target),
            {
              prepLine: payload.prep_line,
              weather: payload.weather,
              target,
            } satisfies PlanWeatherFeedSnapshot,
          ] as const;
        }),
      );

      if (cancelled) {
        return;
      }

      const next = new Map<string, PlanWeatherFeedSnapshot>();
      for (const entry of entries) {
        if (entry) {
          next.set(entry[0], entry[1]);
        }
      }
      setWeatherByKey(next);
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, WEATHER_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [requestKey]);

  return weatherByKey;
}
