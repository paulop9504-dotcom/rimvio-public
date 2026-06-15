import type { TripStatus } from "@/lib/trip-controller/types";

const MIN_24H = 24 * 60;
const MIN_3H = 3 * 60;
const MIN_1H = 60;

export function minutesUntilIso(iso: string, nowMs: number): number | null {
  const target = Date.parse(iso);
  if (Number.isNaN(target)) {
    return null;
  }
  return Math.round((target - nowMs) / 60_000);
}

/** Map departure/arrival timing → TripStatus for dock + cards. */
export function evaluateTripStatus(input: {
  departureIso: string;
  arrivalIso?: string | null;
  now?: Date;
}): { status: TripStatus; minutesUntilDeparture: number } {
  const nowMs = input.now?.getTime() ?? Date.now();
  const minutes = minutesUntilIso(input.departureIso, nowMs) ?? 9999;

  if (input.arrivalIso) {
    const arrivalMinutes = minutesUntilIso(input.arrivalIso, nowMs);
    if (arrivalMinutes != null && arrivalMinutes < -30) {
      return { status: "ARRIVED", minutesUntilDeparture: minutes };
    }
  }

  if (minutes < -45) {
    return { status: "ARRIVED", minutesUntilDeparture: minutes };
  }

  if (minutes <= MIN_1H) {
    return { status: "BOARDING", minutesUntilDeparture: minutes };
  }

  if (minutes <= MIN_3H) {
    return { status: "AIRPORT_TRANSIT", minutesUntilDeparture: minutes };
  }

  if (minutes <= MIN_24H) {
    return { status: "DEPARTURE_24H", minutesUntilDeparture: minutes };
  }

  return { status: "PREPARING", minutesUntilDeparture: minutes };
}
