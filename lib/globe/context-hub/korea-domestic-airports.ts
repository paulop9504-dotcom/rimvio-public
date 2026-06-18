/** Korea domestic airport IATA — departure hubs + common destinations. */

export const KOREA_DEPARTURE_IATA = new Set(["ICN", "GMP", "CJJ"]);

const KOREA_DOMESTIC_AIRPORT_IATA = new Set([
  ...KOREA_DEPARTURE_IATA,
  "CJU",
  "PUS",
  "RSU",
  "USN",
  "KWJ",
  "TAE",
  "KPO",
  "WJU",
  "HIN",
]);

export const KOREA_DOMESTIC_DESTINATION_IATA: readonly {
  pattern: RegExp;
  iata: string;
  labelKo: string;
}[] = [
  { pattern: /(?:^|\s)제주|jeju(?:\s|$)/iu, iata: "CJU", labelKo: "제주" },
  { pattern: /(?:^|\s)부산|김해|busan|pusan/iu, iata: "PUS", labelKo: "부산" },
  { pattern: /(?:^|\s)여수/iu, iata: "RSU", labelKo: "여수" },
  { pattern: /(?:^|\s)울산/iu, iata: "USN", labelKo: "울산" },
  { pattern: /(?:^|\s)광주/iu, iata: "KWJ", labelKo: "광주" },
  { pattern: /(?:^|\s)대구/iu, iata: "TAE", labelKo: "대구" },
  { pattern: /(?:^|\s)포항/iu, iata: "KPO", labelKo: "포항" },
  { pattern: /(?:^|\s)원주/iu, iata: "WJU", labelKo: "원주" },
  { pattern: /(?:^|\s)사천/iu, iata: "HIN", labelKo: "사천" },
  { pattern: /(?:^|\s)청주/iu, iata: "CJJ", labelKo: "청주" },
  { pattern: /(?:^|\s)김포|서울(?:\s|$)|gmp/iu, iata: "GMP", labelKo: "김포" },
  { pattern: /(?:^|\s)인천(?:\s|$)|icn/iu, iata: "ICN", labelKo: "인천" },
] as const;

export function resolveKoreaDomesticDestinationIata(
  place: string,
): { iata: string; labelKo: string } | null {
  const hay = place.trim();
  if (!hay) {
    return null;
  }
  for (const row of KOREA_DOMESTIC_DESTINATION_IATA) {
    if (row.pattern.test(hay)) {
      return { iata: row.iata, labelKo: row.labelKo };
    }
  }
  return null;
}

export function isKoreaDomesticAirportPair(originIata: string, destIata: string): boolean {
  const origin = originIata.trim().toUpperCase();
  const dest = destIata.trim().toUpperCase();
  if (origin === dest) {
    return false;
  }
  return (
    KOREA_DOMESTIC_AIRPORT_IATA.has(origin) &&
    KOREA_DOMESTIC_AIRPORT_IATA.has(dest)
  );
}
