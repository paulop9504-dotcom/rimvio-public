import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  isKoreaDomesticAirportPair,
  resolveKoreaDomesticDestinationIata,
} from "@/lib/globe/context-hub/korea-domestic-airports";

export type FlightRouteKind = "domestic_kr" | "international";

export type ResolvedFlightRoute = {
  kind: FlightRouteKind;
  originIata: string;
  destinationIata: string | null;
  destinationPlace: string;
  departDateYmd: string | null;
};

function normalizeDepartDate(iso: string | null | undefined): string | null {
  const raw = iso?.trim().slice(0, 10);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/u.test(raw)) {
    return null;
  }
  return raw;
}

/** Classify hub flight route — domestic KR uses Naver Flight, overseas uses Google Flights. */
export function resolveFlightRoute(input: {
  originIata: string;
  destinationPlace: string;
  departDateIso?: string | null;
}): ResolvedFlightRoute {
  const originIata = input.originIata.trim().toUpperCase();
  const destinationPlace = input.destinationPlace.trim() || "destination";
  const departDateYmd = normalizeDepartDate(input.departDateIso);

  if (classifyOverseasManualPlace(destinationPlace)) {
    return {
      kind: "international",
      originIata,
      destinationIata: null,
      destinationPlace,
      departDateYmd,
    };
  }

  const domesticDest = resolveKoreaDomesticDestinationIata(destinationPlace);
  if (
    domesticDest &&
    isKoreaDomesticAirportPair(originIata, domesticDest.iata)
  ) {
    return {
      kind: "domestic_kr",
      originIata,
      destinationIata: domesticDest.iata,
      destinationPlace: domesticDest.labelKo,
      departDateYmd,
    };
  }

  return {
    kind: "international",
    originIata,
    destinationIata: null,
    destinationPlace,
    departDateYmd,
  };
}
