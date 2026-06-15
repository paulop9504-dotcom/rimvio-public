import { analyzeCaptureLayout } from "@/lib/capture/capture-layout-analyzer";
import type { CaptureEssentialDomain } from "@/lib/capture/capture-domain-router";
import type { CaptureDomainRouterInput } from "@/lib/capture/capture-domain-router";

export const STUDY_WINNER_TAKE_ALL_THRESHOLD = 0.7;
export const LINE_DENSITY_STUDY_HARD_RULE = 0.7;

export type DomainScoreBundle = {
  studyRaw: number;
  medicalRaw: number;
  otherRaw: number;
};

export type DomainConfidenceResult = {
  domain: CaptureEssentialDomain;
  studyConfidence: number;
  medicalConfidence: number;
  otherConfidence: number;
  academicPriorityScore: number;
  lineDensity: number;
  isParagraph: boolean;
  forcedStudy: boolean;
  winnerTakeAll: boolean;
  layoutMedicalVisual: boolean;
};

function normalizeConfidence(raw: number, cap: number) {
  if (cap <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, raw / cap));
}

/**
 * L-stage Domain Confidence Checker — winner-take-all when STUDY ≥ 70%.
 * Pure read path.
 */
export function checkDomainConfidence(
  input: CaptureDomainRouterInput,
  scores: DomainScoreBundle
): DomainConfidenceResult {
  const layout = analyzeCaptureLayout({
    rawText: input.rawText ?? "",
    vision: input.vision ?? null,
  });

  const studyRaw =
    scores.studyRaw +
    (layout.studyParagraphLayout ? 4 : 0) +
    layout.lineDensity * 2;

  const medicalRaw = layout.medicalVisualPattern
    ? scores.medicalRaw + 1
    : scores.medicalRaw;

  const total = studyRaw + medicalRaw + scores.otherRaw + 0.001;

  const studyConfidence = studyRaw / total;
  const medicalConfidence = medicalRaw / total;
  const otherConfidence = scores.otherRaw / total;

  const academicPriorityScore = normalizeConfidence(studyRaw, 14);

  const forcedStudy =
    layout.lineDensity > LINE_DENSITY_STUDY_HARD_RULE && layout.isParagraph;

  const winnerTakeAll = studyConfidence >= STUDY_WINNER_TAKE_ALL_THRESHOLD;

  let domain: CaptureEssentialDomain = "OTHER";

  if (forcedStudy || winnerTakeAll || academicPriorityScore >= STUDY_WINNER_TAKE_ALL_THRESHOLD) {
    domain = "STUDY";
  } else if (medicalConfidence > studyConfidence && scores.medicalRaw >= 4) {
    domain = "MEDICAL";
  } else if (scores.medicalRaw >= 4 && scores.studyRaw <= 1) {
    domain = "MEDICAL";
  } else if (scores.studyRaw >= 3) {
    domain = "STUDY";
  } else if (
    scores.studyRaw >= 2 &&
    scores.medicalRaw <= 3 &&
    academicPriorityScore >= 0.35
  ) {
    domain = "STUDY";
  } else if (scores.medicalRaw >= 3 && scores.studyRaw <= 1) {
    domain = "MEDICAL";
  }

  return {
    domain,
    studyConfidence,
    medicalConfidence,
    otherConfidence,
    academicPriorityScore,
    lineDensity: layout.lineDensity,
    isParagraph: layout.isParagraph,
    forcedStudy,
    winnerTakeAll,
    layoutMedicalVisual: layout.medicalVisualPattern,
  };
}
