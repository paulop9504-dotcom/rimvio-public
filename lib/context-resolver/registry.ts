import { calendarProvider } from "@/lib/context-resolver/providers/calendar-provider";
import { locationProvider } from "@/lib/context-resolver/providers/location-provider";
import { placeProvider } from "@/lib/context-resolver/providers/place-provider";
import { trafficProvider } from "@/lib/context-resolver/providers/traffic-provider";
import { weatherProvider } from "@/lib/context-resolver/providers/weather-provider";
import type { ContextProvider } from "@/lib/context-resolver/types";

export const contextRegistry = {
  weather: weatherProvider,
  traffic: trafficProvider,
  calendar: calendarProvider,
  location: locationProvider,
  place: placeProvider,
} satisfies Record<string, ContextProvider<unknown>>;

export type ContextRegistryKey = keyof typeof contextRegistry;

export function listContextProviders(): ContextProvider<unknown>[] {
  return Object.values(contextRegistry);
}

export function getContextProvider(id: ContextRegistryKey) {
  return contextRegistry[id];
}
