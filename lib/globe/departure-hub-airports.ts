/** Korea departure hubs — linked to destination context for flight booking. */

export type DepartureHubAirportId = "cjj" | "gmp" | "icn";

export type DepartureHubAirport = {
  id: DepartureHubAirportId;
  iata: string;
  labelKo: string;
  shortLabelKo: string;
  regionHintKo: string;
  lat: number;
  lng: number;
};

export const DEPARTURE_HUB_AIRPORTS: readonly DepartureHubAirport[] = [
  {
    id: "cjj",
    iata: "CJJ",
    labelKo: "청주국제공항",
    shortLabelKo: "청주공항",
    regionHintKo: "충청·대전·세종 — 제주·국내선",
    lat: 36.716556,
    lng: 127.499119,
  },
  {
    id: "gmp",
    iata: "GMP",
    labelKo: "김포국제공항",
    shortLabelKo: "김포공항",
    regionHintKo: "수도권 — 국내선·단거리",
    lat: 37.558309,
    lng: 126.790586,
  },
  {
    id: "icn",
    iata: "ICN",
    labelKo: "인천국제공항",
    shortLabelKo: "인천공항",
    regionHintKo: "국제선 · 장거리",
    lat: 37.4602,
    lng: 126.4407,
  },
] as const;

export const DEPARTURE_HUB_PROJECTION_KIND = "departure_hub" as const;
export const DEPARTURE_HUB_AIRPORT_IATA_META_KEY = "hubAirportIata" as const;
export const PIN_PROJECTION_KIND_META_KEY = "pinProjectionKind" as const;

export function getDepartureHubAirport(
  id: DepartureHubAirportId,
): DepartureHubAirport {
  const row = DEPARTURE_HUB_AIRPORTS.find((entry) => entry.id === id);
  if (!row) {
    throw new Error(`unknown_departure_hub:${id}`);
  }
  return row;
}

export function findDepartureHubAirportByIata(
  iata: string,
): DepartureHubAirport | null {
  const key = iata.trim().toUpperCase();
  return DEPARTURE_HUB_AIRPORTS.find((entry) => entry.iata === key) ?? null;
}
