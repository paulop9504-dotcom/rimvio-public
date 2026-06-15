import type { PlanWindowConfidence } from "@/lib/plan-context/plan-context-types";

const NIGHTS_PATTERN = /(\d{1,2})\s*박\s*(\d{1,2})\s*일/u;
const NIGHTS_SHORT = /(\d{1,2})\s*박/u;
const RETURN_SIGNAL =
  /(?:돌아|귀국|까지|에서\s*나와|체크아웃|끝나|종료)/u;

function dateKeyFromParts(month: number, day: number, ref = new Date()): string {
  let year = ref.getFullYear();
  const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (candidate.getTime() < ref.getTime() - 120 * 24 * 60 * 60 * 1000) {
    year += 1;
  }
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function endIsoFromDateKey(dateKey: string, hour = 12, minute = 0): string | undefined {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return undefined;
  }
  const when = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(when.getTime())) {
    return undefined;
  }
  return when.toISOString();
}

function extractExplicitEndDate(text: string, ref = new Date()): string | undefined {
  const slash = text.match(
    /(?:돌아|귀국|까지|~|부터)?\s*(\d{1,2})\s*[\/\.월]\s*(\d{1,2})\s*일?(?:\s*(?:에|까지|돌아|귀국))?/u,
  );
  if (slash?.[1] && slash?.[2]) {
    return endIsoFromDateKey(dateKeyFromParts(Number(slash[1]), Number(slash[2]), ref));
  }

  const hangul = text.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*(?:에|까지|돌아|귀국))?/u,
  );
  if (hangul?.[1] && hangul?.[2]) {
    return endIsoFromDateKey(dateKeyFromParts(Number(hangul[1]), Number(hangul[2]), ref));
  }

  return undefined;
}

function addDaysIso(startIso: string, days: number): string | undefined {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return undefined;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}

export type ExtractedPlanWindow = {
  windowEndIso?: string;
  nights?: number;
  windowConfidence: PlanWindowConfidence;
};

/** Parse end date / nights from conversation text. */
export function extractPlanWindowFromText(
  text: string,
  windowStartIso?: string,
  ref = new Date(),
): ExtractedPlanWindow {
  const blob = text.trim();
  if (!blob) {
    return { windowConfidence: "open" };
  }

  const nightsMatch = blob.match(NIGHTS_PATTERN);
  if (nightsMatch?.[1]) {
    const nights = Number(nightsMatch[1]);
    if (nights > 0 && nights < 30 && windowStartIso) {
      return {
        nights,
        windowEndIso: addDaysIso(windowStartIso, nights),
        windowConfidence: "estimated",
      };
    }
  }

  const nightsShort = blob.match(NIGHTS_SHORT);
  if (nightsShort?.[1] && windowStartIso) {
    const nights = Number(nightsShort[1]);
    if (nights > 0 && nights < 30) {
      return {
        nights,
        windowEndIso: addDaysIso(windowStartIso, nights),
        windowConfidence: "estimated",
      };
    }
  }

  if (RETURN_SIGNAL.test(blob)) {
    const endIso = extractExplicitEndDate(blob, ref);
    if (endIso) {
      return {
        windowEndIso: endIso,
        windowConfidence: "confirmed",
      };
    }
  }

  return { windowConfidence: "open" };
}

/** End ISO from start + night count (checkout day). */
export function computeWindowEndFromNights(
  windowStartIso: string,
  nights: number,
): string | undefined {
  if (nights < 1 || nights > 29) {
    return undefined;
  }
  return addDaysIso(windowStartIso, nights);
}
