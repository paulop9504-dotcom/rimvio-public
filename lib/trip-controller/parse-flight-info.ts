import type { FlightInfo } from "@/lib/trip-controller/types";

const FLIGHT_NO = /\b([A-Z]{2}\s?\d{2,4})\b/i;
const ROUTE =
  /([가-힣A-Za-z]{2,12})\s*[-–→]\s*([가-힣A-Za-z]{2,12})|([가-힣A-Za-z]{2,12})\s*(?:에서|→)\s*([가-힣A-Za-z]{2,12})/u;
const GATE = /(?:게이트|gate)\s*([A-Z]?\d{1,3}[A-Z]?)/iu;
const PNR = /\b(?:PNR|예약번호|booking)\s*[:#]?\s*([A-Z0-9]{5,8})\b/iu;
const TIME = /(\d{1,2}):(\d{2})/;

function padTime(hour: string, minute: string): string {
  return `${String(Number.parseInt(hour, 10)).padStart(2, "0")}:${minute}`;
}

function inferIso(referenceDate: string, hour: string, minute: string): string {
  return `${referenceDate}T${padTime(hour, minute)}:00`;
}

/** Parse flight fields from mail/SMS/chat text into FlightInfo. */
export function parseFlightInfoFromText(input: {
  text: string;
  referenceDate: string;
  defaultOrigin?: string;
  defaultDestination?: string;
}): FlightInfo | null {
  const text = input.text.trim();
  if (!text) {
    return null;
  }

  const flightMatch = text.match(FLIGHT_NO);
  if (!flightMatch && !/(?:항공|탑승|체크인|boarding)/iu.test(text)) {
    return null;
  }

  const flightNumber = (flightMatch?.[1] ?? "FLIGHT").replace(/\s+/g, "").toUpperCase();
  const routeMatch = text.match(ROUTE);
  const origin =
    routeMatch?.[1] ??
    routeMatch?.[3] ??
    input.defaultOrigin ??
    "인천";
  const destination =
    routeMatch?.[2] ??
    routeMatch?.[4] ??
    input.defaultDestination ??
    "도쿄";

  const timeMatch = text.match(TIME);
  const departureIso = timeMatch
    ? inferIso(input.referenceDate, timeMatch[1]!, timeMatch[2]!)
    : `${input.referenceDate}T09:00:00`;

  const gate = text.match(GATE)?.[1] ?? null;
  const pnr = text.match(PNR)?.[1] ?? null;

  const airline = /^KE/i.test(flightNumber)
    ? "대한항공"
    : /^OZ/i.test(flightNumber)
      ? "아시아나"
      : null;

  return {
    flightNumber,
    airline,
    origin,
    destination,
    departureIso,
    gate,
    pnr,
    checkInUrl: airline === "대한항공" ? "https://www.koreanair.com/check-in" : null,
    boardingPassUrl: null,
    statusLabel: gate ? "게이트 오픈" : null,
  };
}
