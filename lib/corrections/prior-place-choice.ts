import type {
  CorrectionLogEntry,
  LocationConfirmUxWire,
  LocationSuggestion,
} from "@/lib/action-chat/confirmation-types";

const BRAND_INTENT =
  /(?:갤러리아|스타벅스|헤어|미용실|미용|네일|병원|cgv|메가박스|이마트|홈플러스|올리브영|쿠우쿠우)/iu;

export type PriorPlaceChoiceWire = {
  suggestion: LocationSuggestion;
  matched_intent: string;
  matched_log_id: string;
  confidence: number;
};

function normalizeHay(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Brand / place keyword for log matching. */
export function extractPlaceIntentKey(input: {
  message: string;
  place_name?: string | null;
}): string | null {
  const hay = `${input.message} ${input.place_name ?? ""}`;
  const brand = hay.match(BRAND_INTENT)?.[0];
  if (brand) {
    return brand.trim();
  }

  const place = input.place_name?.trim();
  if (place && place.length <= 16 && !/역$/u.test(place)) {
    return place;
  }

  return null;
}

function intentMatchesLog(intentKey: string, entry: CorrectionLogEntry): boolean {
  const needle = intentKey.toLowerCase();
  const fields = [
    entry.user_input,
    entry.ai_inferred_place_name,
    entry.user_corrected_place_name,
  ].map(normalizeHay);

  return fields.some((field) => field.includes(needle));
}

function branchLabelFromLog(entry: CorrectionLogEntry): string {
  const corrected = entry.user_corrected_place_name?.trim();
  const inferred = entry.ai_inferred_place_name?.trim();
  const base = corrected || inferred || "선택한 장소";

  if (corrected && inferred && corrected !== inferred && !base.includes(inferred)) {
    return corrected;
  }

  const parts = base.split(/\s+/);
  if (parts.length >= 2) {
    return parts.slice(1).join(" ").slice(0, 24) || base;
  }

  return base.slice(0, 24);
}

export function correctionLogToPriorSuggestion(
  entry: CorrectionLogEntry
): LocationSuggestion | null {
  const place_name =
    entry.user_corrected_place_name?.trim() ||
    entry.ai_inferred_place_name?.trim() ||
    null;
  const address =
    entry.user_corrected_location?.trim() ||
    entry.ai_inferred_location?.trim() ||
    "";

  if (!place_name) {
    return null;
  }

  const branch = branchLabelFromLog(entry);

  return {
    id: `prior-${entry.id}`,
    label: `지난번 선택: ${branch}`,
    place_name,
    address,
    branch,
    is_prior: true,
  };
}

export function resolvePriorPlaceChoice(input: {
  message: string;
  place_name?: string | null;
  logs: CorrectionLogEntry[];
}): PriorPlaceChoiceWire | null {
  const intentKey = extractPlaceIntentKey({
    message: input.message,
    place_name: input.place_name,
  });

  if (!intentKey) {
    return null;
  }

  const candidates = input.logs.filter(
    (entry) =>
      (entry.outcome === "accepted" || entry.outcome === "corrected") &&
      intentMatchesLog(intentKey, entry)
  );

  if (candidates.length === 0) {
    return null;
  }

  const latest = candidates.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0]!;

  const suggestion = correctionLogToPriorSuggestion(latest);
  if (!suggestion) {
    return null;
  }

  return {
    suggestion,
    matched_intent: intentKey,
    matched_log_id: latest.id,
    confidence: latest.outcome === "corrected" ? 0.88 : 0.82,
  };
}

export function planPriorPlaceConfirmUx(input: {
  prior: LocationSuggestion;
  subject: string;
}): LocationConfirmUxWire {
  const branch =
    input.prior.branch?.trim() ||
    input.prior.label.replace(/^지난번 선택:\s*/u, "").trim() ||
    input.subject;

  const priorSuggestion: LocationSuggestion = {
    ...input.prior,
    is_prior: true,
    label: `지난번 선택: ${branch}`,
  };

  return {
    mode: "prior_pick",
    prompt: `지난번 ${branch}을(를) 선택하셨어요. 이번에도 여기로 할까요?`,
    recommended_id: priorSuggestion.id,
    suggestions: [priorSuggestion],
  };
}
