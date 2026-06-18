import type { VisionSnapshot } from "@/lib/vision/types";

export type CaptureLayoutAnalysis = {
  /** Long prose occupies most of the OCR body (0–1). */
  lineDensity: number;
  /** Multiple long lines forming readable paragraphs. */
  isParagraph: boolean;
  /** Pill bag / dosage table / Rx label visual or textual layout. */
  medicalVisualPattern: boolean;
  /** Book page / dense prose layout (not receipt/menu). */
  studyParagraphLayout: boolean;
};

const MEDICAL_VISUAL_LABELS =
  /pill|capsule|tablet|medicine|pharmacy|prescription|drug|medication|syringe|blister|packaging.*medicine|약|알약|캡슐|처방|약봉/i;

const MEDICAL_STRUCTURED_OCR =
  /(?:복용|용법|1일\s*\d+\s*회|식후|식전|공복|투여|조제|처방전|약봉투|side effects|drug facts)/i;

const MEDICAL_DOSAGE_TABLE =
  /(?:정|캡슐|tablet|capsule)\s*[\·•]?\s*\d+\s*(?:mg|ml|g)\b|\d+\s*(?:mg|ml)\s*(?:정|캡슐)?/i;

function normalizeLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2);
}

/**
 * E-stage layout probe — lightweight OCR + vision label heuristics only.
 * Pure read path; no network or mutation.
 */
export function analyzeCaptureLayout(input: {
  rawText: string;
  vision?: Pick<
    VisionSnapshot,
    "bestGuessLabels" | "webEntities" | "labels"
  > | null;
}): CaptureLayoutAnalysis {
  const raw = input.rawText ?? "";
  const lines = normalizeLines(raw);
  const longLines = lines.filter((line) => line.length >= 45);

  const meaningfulChars = lines.reduce((sum, line) => sum + line.length, 0);
  const longLineChars = longLines.reduce((sum, line) => sum + line.length, 0);
  const lineDensity =
    meaningfulChars > 0 ? longLineChars / meaningfulChars : 0;

  const isParagraph =
    longLines.length >= 2 &&
    longLines.every((line) => line.split(/\s+/).length >= 6) &&
    lines.filter((line) => line.length <= 12).length <= Math.max(2, lines.length * 0.25);

  const visionBlob = [
    ...(input.vision?.bestGuessLabels ?? []),
    ...(input.vision?.webEntities ?? []),
    ...(input.vision?.labels ?? []),
  ].join(" ");

  const medicalVisualPattern =
    MEDICAL_VISUAL_LABELS.test(visionBlob) ||
    (MEDICAL_STRUCTURED_OCR.test(raw) && MEDICAL_DOSAGE_TABLE.test(raw));

  const studyParagraphLayout =
    lineDensity > 0.7 &&
    isParagraph &&
    !/영수증|receipt|합계|₩|\d+\s*원|메뉴|menu/i.test(raw);

  return {
    lineDensity,
    isParagraph,
    medicalVisualPattern,
    studyParagraphLayout,
  };
}
