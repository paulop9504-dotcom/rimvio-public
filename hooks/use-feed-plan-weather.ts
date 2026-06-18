"use client";

import { useEffect, useMemo, useState } from "react";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  anyWakeupFetchAllowed,
  minPollIntervalMs,
  resolveApiWakeupDecision,
} from "@/lib/globe/resource/api-wakeup-controller";
import {
  buildApiWakeupContextFromWeatherTarget,
  readAppForeground,
} from "@/lib/globe/resource/build-api-wakeup-context";
import { collectFeedSlotWeatherTargets } from "@/lib/feed/resolve-feed-slot-weather-target";
import {
  planWeatherTargetKey,
  type PlanWeatherTarget,
} from "@/lib/plan-context/resolve-plan-weather-target";

export type PlanWeatherFeedSnapshot = {
  prepLine: string | null;
  weather: WeatherContext | null;
  target: PlanWeatherTarget;
};

type GatedWeatherTarget = {
  target: PlanWeatherTarget;
  decision: ReturnType<typeof resolveApiWakeupDecision>;
};

/** Schedule-matched weather prep — gated by ApiWakeupController (no fetch when Cold). */
export function useFeedPlanWeather(
  slots: readonly FeedTodaySlot[],
  eventsById?: ReadonlyMap<string, EventCandidate>,
): ReadonlyMap<string, PlanWeatherFeedSnapshot> {
  const targets = useMemo(
    () => collectFeedSlotWeatherTargets(slots, eventsById),
    [slots, eventsById],
  );

  const [appForeground, setAppForeground] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const onVisibility = () => setAppForeground(readAppForeground());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const gatedTargets = useMemo((): GatedWeatherTarget[] => {
    const now = new Date();
    return targets.map((target) => {
      const context = buildApiWakeupContextFromWeatherTarget({
        target,
        eventsById,
        now,
        appForeground,
      });
      return {
        target,
        decision: resolveApiWakeupDecision("weather_forecast", context),
      };
    });
  }, [appForeground, eventsById, targets]);

  const fetchableTargets = useMemo(
    () => gatedTargets.filter((row) => row.decision.allowFetch),
    [gatedTargets],
  );

  const requestKey = useMemo(
    () =>
      gatedTargets
        .map(
          (row) =>
            `${planWeatherTargetKey(row.target)}:${row.decision.phase}:${row.decision.allowFetch}`,
        )
        .join("|"),
    [gatedTargets],
  );

  const pollIntervalMs = useMemo(
    () => minPollIntervalMs(gatedTargets.map((row) => row.decision)),
    [gatedTargets],
  );

  const [weatherByKey, setWeatherByKey] = useState<
    ReadonlyMap<string, PlanWeatherFeedSnapshot>
  >(() => new Map());

  useEffect(() => {
    if (fetchableTargets.length === 0 || !anyWakeupFetchAllowed(gatedTargets.map((r) => r.decision))) {
      setWeatherByKey(new Map());
      return;
    }

    let cancelled = false;

    const pull = async () => {
      if (!readAppForeground()) {
        return;
      }

      const entries = await Promise.all(
        fetchableTargets.map(async ({ target }) => {
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

    if (pollIntervalMs === null) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => {
      void pull();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchableTargets, gatedTargets, pollIntervalMs, requestKey]);

  return weatherByKey;
}
