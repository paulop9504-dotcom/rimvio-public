import type { VisionSnapshot } from "@/lib/vision/types";

export type GoogleWebContextInput = Partial<
  Pick<VisionSnapshot, "bestGuessLabels" | "webEntities" | "labels" | "text">
>;

/** Google Vision annotate features — OCR + web knowledge + labels. */
export const GOOGLE_VISION_ANNOTATE_FEATURES = [
  { type: "TEXT_DETECTION", maxResults: 1 },
  { type: "WEB_DETECTION", maxResults: 20 },
  { type: "LABEL_DETECTION", maxResults: 12 },
] as const;

export function hasGoogleWebHints(
  vision?: GoogleWebContextInput | null
): boolean {
  if (!vision) {
    return false;
  }

  return (
    (vision.bestGuessLabels?.length ?? 0) > 0 ||
    (vision.webEntities?.length ?? 0) > 0 ||
    (vision.labels?.length ?? 0) > 0
  );
}

/**
 * Format Google WEB_DETECTION + label data for Gemini prompt injection.
 * Web entities carry local place/product names that pure vision models often miss.
 */
export function buildGoogleWebContextHint(
  vision?: GoogleWebContextInput | null
): string {
  if (!hasGoogleWebHints(vision)) {
    return "";
  }

  const lines: string[] = [
    "# Reference Data (Google Vision WEB_DETECTION Context Hint)",
    "You analyze the image directly, but Google’s web search engine also saw this photo.",
    "Combine your visual reasoning with these hints to derive the most accurate search_query.",
    "Prefer webEntities/bestGuessLabels for local brand or branch names (e.g. 대전 은행동 떡반집).",
    "Never copy garbled OCR wall noise verbatim — web hints override noisy text when they align with the scene.",
    "",
  ];

  if (vision?.bestGuessLabels?.length) {
    lines.push(
      `bestGuessLabels: ${vision.bestGuessLabels.slice(0, 8).join(" | ")}`
    );
  }

  if (vision?.webEntities?.length) {
    lines.push(
      `webEntities: ${vision.webEntities.slice(0, 15).join(" | ")}`
    );
  }

  if (vision?.labels?.length) {
    lines.push(`labelDetection: ${vision.labels.slice(0, 10).join(" | ")}`);
  }

  if (vision?.text?.trim()) {
    lines.push(
      `ocrText (auxiliary only — may be wall graffiti/noise): ${vision.text.trim().slice(0, 240)}`
    );
  }

  return lines.join("\n");
}

export function buildGeminiCapturePrompt(
  basePrompt: string,
  webContext?: GoogleWebContextInput | null
) {
  const hint = buildGoogleWebContextHint(webContext);
  return hint ? `${basePrompt}\n\n${hint}` : basePrompt;
}
