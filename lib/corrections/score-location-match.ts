import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";

const REGION_HINTS =
  /(?:둔산|타임월드|센터시티|강남|역삼|홍대|신촌|수서|판교|제주|해운대|부산|대전|서울|신림|관악|봉천|사당|건대|잠실|이태원|명동|종로|을지로)/u;

export function scoreLocationSuggestionMatch(
  suggestion: LocationSuggestion,
  input: {
    extracted: ConfirmationExtractedData;
    message: string;
  }
): number {
  const hay = [suggestion.label, suggestion.address, suggestion.branch]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const message = input.message.toLowerCase();
  const placeName = (input.extracted.place_name ?? "").toLowerCase();
  const addressHint = (input.extracted.address ?? "").toLowerCase();

  let score = 0;

  if (placeName && hay.includes(placeName)) {
    score += 42;
  }

  if (placeName && suggestion.label.toLowerCase().startsWith(placeName)) {
    score += 18;
  }

  const stationMatch = message.match(/([가-힣A-Za-z0-9]{2,12}역)/u);
  if (stationMatch && suggestion.label.includes(stationMatch[1]!)) {
    score += 88;
  }

  const dongMatch = message.match(/([가-힣A-Za-z0-9]{2,12}동)/u);
  if (dongMatch && hay.includes(dongMatch[1]!.toLowerCase())) {
    score += 92;
  }

  for (const hint of message.match(REGION_HINTS) ?? []) {
    if (hay.includes(hint.toLowerCase())) {
      score += 28;
    }
  }

  if (addressHint) {
    const cityToken = addressHint.split(/\s+/).slice(0, 2).join(" ");
    if (cityToken && hay.includes(cityToken)) {
      score += 22;
    }
  }

  if (/대전|둔산|타임월드/u.test(message) && /서울/u.test(hay) && !/대전/u.test(hay)) {
    score -= 35;
  }

  if (/서울|강남/u.test(message) && /대전/u.test(hay) && !/서울|강남/u.test(hay)) {
    score -= 35;
  }

  if (/편의점|마트/u.test(hay) && !/편의점|마트/u.test(message)) {
    score -= 12;
  }

  return score;
}

export function rankLocationSuggestions(
  suggestions: LocationSuggestion[],
  input: {
    extracted: ConfirmationExtractedData;
    message: string;
  }
): Array<{ suggestion: LocationSuggestion; score: number }> {
  return suggestions
    .map((suggestion) => ({
      suggestion,
      score: scoreLocationSuggestionMatch(suggestion, input),
    }))
    .sort((a, b) => b.score - a.score);
}
