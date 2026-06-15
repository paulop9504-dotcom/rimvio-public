import type { VisionSnapshot } from "@/lib/vision/types";

const FASHION_LABEL =
  /clothing|fashion|dress|shirt|jacket|shoe|footwear|apparel|outerwear|denim|knit|skirt|pants|jeans|handbag|bag|sneaker|coat|blouse|top|streetwear|원피스|패션|옷|신발|가방|코트|자켓|니트|셔츠|바지|스니커즈/i;

type GoogleVisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    labelAnnotations?: Array<{ description?: string; score?: number }>;
    webDetection?: {
      bestGuessLabels?: Array<{ label?: string }>;
      webEntities?: Array<{ description?: string; score?: number }>;
      pagesWithMatchingImages?: Array<{ url?: string; pageTitle?: string }>;
      visuallySimilarImages?: Array<{ url?: string }>;
      fullMatchingImages?: Array<{ url?: string }>;
    };
  }>;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      continue;
    }
    seen.add(trimmed.toLowerCase());
    next.push(trimmed);
  }

  return next;
}

function fashionScoreFromLabels(labels: string[]) {
  let score = 0;

  for (const label of labels) {
    if (FASHION_LABEL.test(label)) {
      score += 2;
    }
  }

  return score;
}

export function parseGoogleVisionResponse(
  payload: GoogleVisionResponse
): VisionSnapshot | null {
  const response = payload.responses?.[0];
  if (!response) {
    return null;
  }

  const text =
    response.fullTextAnnotation?.text?.trim() ??
    response.textAnnotations?.[0]?.description?.trim() ??
    "";

  const bestGuessLabels = uniqueStrings(
    response.webDetection?.bestGuessLabels?.map((item) => item.label) ?? []
  );

  const webEntities = uniqueStrings(
    response.webDetection?.webEntities
      ?.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((item) => item.description) ?? []
  );

  const labels = uniqueStrings(
    response.labelAnnotations
      ?.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((item) => item.description) ?? []
  );

  const pagesWithMatchingImages =
    response.webDetection?.pagesWithMatchingImages
      ?.map((page) => ({
        url: page.url?.trim() ?? "",
        title: page.pageTitle?.trim() || "Matching page",
      }))
      .filter((page) => page.url.length > 0)
      .slice(0, 3) ?? [];

  const visuallySimilarPages =
    response.webDetection?.visuallySimilarImages
      ?.map((image) => ({
        url: image.url?.trim() ?? "",
        title: "Visually similar image",
      }))
      .filter((item) => item.url.length > 0)
      .slice(0, 3) ?? [];

  const mergedLabels = uniqueStrings([...bestGuessLabels, ...webEntities, ...labels]);
  const fashionScore = fashionScoreFromLabels(mergedLabels);

  return {
    provider: "google_vision",
    text,
    bestGuessLabels,
    webEntities,
    labels,
    fashionScore,
    pagesWithMatchingImages,
    visuallySimilarPages,
    similarImageResults: [],
  };
}

export function isFashionVision(vision?: VisionSnapshot | null) {
  return Boolean(vision && vision.fashionScore >= 2);
}

export function visionSearchQuery(vision?: VisionSnapshot | null, fallback = "") {
  if (!vision) {
    return fallback.trim();
  }

  return (
    vision.bestGuessLabels[0] ??
    vision.webEntities[0] ??
    vision.labels.find((label) => FASHION_LABEL.test(label)) ??
    fallback
  ).trim();
}
