import { listContextProviders } from "@/lib/context-resolver/registry";
import { placeProvider } from "@/lib/context-resolver/providers/place-provider";
import type {
  CalendarContext,
  ContextResolveInput,
  ContextSnapshot,
  LocationContext,
  TrafficContext,
  WeatherContext,
} from "@/lib/context-resolver/types";

const CORE_PROVIDER_IDS = new Set(["weather", "traffic", "calendar", "location"]);

/** Resolve all registered providers in parallel → Current State Snapshot. */
export async function resolveDynamicContext(
  input: ContextResolveInput
): Promise<ContextSnapshot> {
  const now = input.now ?? new Date();
  const resolvedInput = { ...input, now };
  const providers = listContextProviders().filter((provider) =>
    CORE_PROVIDER_IDS.has(provider.id)
  );

  const entries = await Promise.all(
    providers.map(async (provider) => [provider.id, await provider.resolve(resolvedInput)] as const)
  );

  const map = Object.fromEntries(entries) as Record<string, unknown>;

  let place = null;
  if (input.discovery) {
    place = await placeProvider.resolve(resolvedInput);
  }

  return {
    resolved_at: now.toISOString(),
    weather: map.weather as WeatherContext,
    traffic: map.traffic as TrafficContext,
    location: map.location as LocationContext,
    calendar: map.calendar as CalendarContext,
    place,
  };
}
