import type { DepartureHubAirport } from "@/lib/globe/departure-hub-airports";
import {
  resolveFlightRoute,
  type FlightRouteKind,
} from "@/lib/globe/context-hub/resolve-flight-route-kind";

export type ContextHubFlightBookingProvider =
  | "naver_flight"
  | "trip_com"
  | "google_flights";

export type ContextHubFlightBooking = {
  url: string;
  provider: ContextHubFlightBookingProvider;
  routeKind: FlightRouteKind;
  originIata: string;
  destinationIata: string | null;
  actionLabelKo: string;
};

function buildNaverDomesticFlightUrl(input: {
  originIata: string;
  destinationIata: string;
  departDateYmd: string | null;
}): string {
  const origin = input.originIata.trim().toUpperCase();
  const dest = input.destinationIata.trim().toUpperCase();
  const dateCompact = input.departDateYmd?.replace(/-/g, "") ?? "";
  const path = dateCompact
    ? `domestic/${origin}-${dest}-${dateCompact}`
    : `domestic/${origin}-${dest}`;
  const params = new URLSearchParams({
    adult: "1",
    child: "0",
    infant: "0",
  });
  return `https://flight.naver.com/flights/${path}?${params.toString()}`;
}

function buildGoogleFlightsUrl(input: {
  originIata: string;
  destinationPlace: string;
  departDateYmd: string | null;
}): string {
  const origin = input.originIata.trim().toUpperCase();
  const destination = input.destinationPlace.trim() || "destination";
  const query = `Flights from ${origin} to ${destination}`;
  const params = new URLSearchParams({ q: query });
  if (input.departDateYmd) {
    params.set("departure", input.departDateYmd);
  }
  return `https://www.google.com/travel/flights?${params.toString()}`;
}

function buildTripComFlightUrl(input: {
  originIata: string;
  destinationIata: string;
  departDateYmd: string | null;
}): string {
  const params = new URLSearchParams({
    class: "y",
    quantity: "1",
    childqty: "0",
    babyqty: "0",
    dcity: input.originIata.trim().toUpperCase(),
    dairport: input.originIata.trim().toUpperCase(),
    acity: input.destinationIata.trim().toUpperCase(),
    aairport: input.destinationIata.trim().toUpperCase(),
    locale: "ko-KR",
    curr: "KRW",
    flighttype: "d",
  });
  if (input.departDateYmd) {
    params.set("ddate", input.departDateYmd);
  }
  return `https://kr.trip.com/flights/showfarefirst?${params.toString()}`;
}

/** Hub flight booking URL — domestic KR → Naver Flight; international → Google Flights. */
export function buildContextHubFlightBooking(input: {
  airport: Pick<DepartureHubAirport, "iata" | "labelKo">;
  destinationPlace: string;
  departDateIso?: string | null;
}): ContextHubFlightBooking {
  const route = resolveFlightRoute({
    originIata: input.airport.iata,
    destinationPlace: input.destinationPlace,
    departDateIso: input.departDateIso,
  });

  if (route.kind === "domestic_kr" && route.destinationIata) {
    return {
      url: buildNaverDomesticFlightUrl({
        originIata: route.originIata,
        destinationIata: route.destinationIata,
        departDateYmd: route.departDateYmd,
      }),
      provider: "naver_flight",
      routeKind: "domestic_kr",
      originIata: route.originIata,
      destinationIata: route.destinationIata,
      actionLabelKo: "네이버 항공 예매",
    };
  }

  return {
    url: buildGoogleFlightsUrl({
      originIata: route.originIata,
      destinationPlace: route.destinationPlace,
      departDateYmd: route.departDateYmd,
    }),
    provider: "google_flights",
    routeKind: "international",
    originIata: route.originIata,
    destinationIata: route.destinationIata,
    actionLabelKo: "항공권 보기",
  };
}

/** Alternate providers for the same route (e.g. Trip.com domestic). */
export function listContextHubFlightBookingAlternates(
  booking: ContextHubFlightBooking,
): ContextHubFlightBooking[] {
  if (booking.routeKind !== "domestic_kr" || !booking.destinationIata) {
    return [];
  }

  return [
    {
      url: buildTripComFlightUrl({
        originIata: booking.originIata,
        destinationIata: booking.destinationIata,
        departDateYmd: null,
      }),
      provider: "trip_com",
      routeKind: "domestic_kr",
      originIata: booking.originIata,
      destinationIata: booking.destinationIata,
      actionLabelKo: "Trip.com 예매",
    },
  ];
}
