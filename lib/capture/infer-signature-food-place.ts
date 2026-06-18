import { isFoodVision } from "@/lib/capture/classify-legacy-place-product";

function visionBlob(
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
  } | null
) {
  return [
    ...(vision?.bestGuessLabels ?? []),
    ...(vision?.webEntities ?? []),
    ...(vision?.labels ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Signature Korean restaurant brands from Google Vision food labels alone.
 * Used when Gemini is unavailable and OCR is wall-noise.
 */
export function inferSignatureFoodPlace(
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
  } | null
): string | null {
  if (!isFoodVision(vision)) {
    return null;
  }

  const blob = visionBlob(vision);

  if (/떡반집|tteokban|tteok\s*ban/i.test(blob)) {
    return "떡반집";
  }

  const hasTteokbokki =
    /tteok|bokki|떡볶|topokki|rice\s*cake/i.test(blob);
  const hasToast =
    /toast|sandwich|egg\s*sandwich|토스트|sandwiches/i.test(blob);
  const hasPolkaBowl =
    /polka|polka-dot|blue.*bowl|점박/i.test(blob);

  if (hasTteokbokki && (hasToast || hasPolkaBowl)) {
    return "떡반집";
  }

  if (/starbucks|mermaid|스타벅스/i.test(blob)) {
    return "스타벅스";
  }

  if (/dakgalbi|닭갈비|chuncheon|춘천/i.test(blob)) {
    return "춘천 닭갈비";
  }

  return null;
}

export function foodVisionSearchFallback(
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
  } | null
) {
  return (
    inferSignatureFoodPlace(vision) ??
    vision?.bestGuessLabels?.[0]?.trim() ??
    vision?.labels?.[0]?.trim() ??
    "맛집"
  );
}
