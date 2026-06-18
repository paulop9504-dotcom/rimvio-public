import type { DepartureHubAirport } from "@/lib/globe/departure-hub-airports";
import { buildContextHubFlightBooking } from "@/lib/globe/context-hub/build-context-hub-flight-booking-url";

/** Hub flight deep link — domestic KR → Naver Flight, international → Google Flights. */
export function buildDepartureHubFlightSearchUrl(input: {
  airport: Pick<DepartureHubAirport, "iata" | "labelKo">;
  destinationPlace: string;
  departDateIso?: string | null;
}): string {
  return buildContextHubFlightBooking(input).url;
}
