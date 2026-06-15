import type { DepartureHubAirport } from "@/lib/globe/departure-hub-airports";

/** Google Flights deep link — origin airport → destination place. */
export function buildDepartureHubFlightSearchUrl(input: {
  airport: Pick<DepartureHubAirport, "iata" | "labelKo">;
  destinationPlace: string;
  departDateIso?: string | null;
}): string {
  const destination = input.destinationPlace.trim() || "destination";
  const origin = input.airport.iata.trim().toUpperCase();
  const query = `Flights from ${origin} to ${destination}`;
  const params = new URLSearchParams({ q: query });
  const depart = input.departDateIso?.trim().slice(0, 10);
  if (depart) {
    params.set("departure", depart);
  }
  return `https://www.google.com/travel/flights?${params.toString()}`;
}
