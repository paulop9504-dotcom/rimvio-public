import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  DEPARTURE_HUB_AIRPORTS,
  type DepartureHubAirport,
  type DepartureHubAirportId,
} from "@/lib/globe/departure-hub-airports";

export type DepartureHubOption = DepartureHubAirport & {
  recommended: boolean;
  reasonKo: string;
};

const CHUNGCHEONG_HOME =
  /(?:대전|세종|청주|충청|충북|충남|천안|아산|공주|유성|둔산|daejeon|cheongju)/iu;
const METRO_HOME = /(?:서울|경기|수원|성남|고양|용인|강남|인천|김포|seoul|gyeonggi)/iu;
const JEJU_DEST = /(?:제주|jeju)/iu;

function rankAirports(input: {
  destinationPlace: string;
  homeRegionHint?: string | null;
}): DepartureHubAirportId[] {
  const dest = input.destinationPlace.trim();
  const home = input.homeRegionHint?.trim() ?? "";
  const overseas = classifyOverseasManualPlace(dest);

  if (overseas?.isOverseas) {
    return ["icn", "gmp", "cjj"];
  }
  if (JEJU_DEST.test(dest)) {
    if (CHUNGCHEONG_HOME.test(home)) {
      return ["cjj", "gmp", "icn"];
    }
    if (METRO_HOME.test(home)) {
      return ["gmp", "cjj", "icn"];
    }
    return ["cjj", "gmp", "icn"];
  }
  if (CHUNGCHEONG_HOME.test(home)) {
    return ["cjj", "icn", "gmp"];
  }
  if (METRO_HOME.test(home)) {
    return ["gmp", "icn", "cjj"];
  }
  return ["icn", "gmp", "cjj"];
}

function reasonFor(id: DepartureHubAirportId, recommended: boolean): string {
  if (!recommended) {
    return "";
  }
  switch (id) {
    case "cjj":
      return "충청·대전 쪽에서 가깝게";
    case "gmp":
      return "수도권 국내선";
    case "icn":
      return "국제선·전 노선";
    default:
      return "";
  }
}

/** Ordered hub cards with one recommended choice for the picker UI. */
export function suggestDepartureHubOptions(input: {
  destinationPlace: string;
  homeRegionHint?: string | null;
}): DepartureHubOption[] {
  const order = rankAirports(input);
  const recommendedId = order[0]!;

  return order.map((id) => {
    const airport = DEPARTURE_HUB_AIRPORTS.find((row) => row.id === id)!;
    const recommended = id === recommendedId;
    return {
      ...airport,
      recommended,
      reasonKo: recommended ? reasonFor(id, true) : airport.regionHintKo,
    };
  });
}
