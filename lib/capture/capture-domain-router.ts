import { PRODUCT_SIGNAL } from "@/lib/capture/classify-legacy-place-product";

import { checkDomainConfidence } from "@/lib/capture/domain-confidence-checker";

import { countStudyVocabularyHits } from "@/lib/capture/study-vocabulary";

import { looksLikeDocumentStudy } from "@/lib/study/detect-document-study";

import { isFashionVision } from "@/lib/vision/parse-vision-response";

import type { VisionSnapshot } from "@/lib/vision/types";



export type CaptureEssentialDomain = "STUDY" | "MEDICAL" | "OTHER";



export const STUDY_ACADEMIC_SIGNAL =

  /philosophy|quantum|consciousness|theorem|hypothesis|methodology|paradox|essay|chapter|저자|연구|이론|개념|학술|역사|경제학|철학|과학|문헌|논지|학습|시험|exam|textbook|publication|literature|creative principle|measurement|et al\.|ibid|footnote/i;



const STUDY_LAYOUT_SIGNAL =

  /^\d{1,3}$|^[A-Z][A-Za-z\s':,-]{8,64}$|^\(\d{4}\)|p\.\s*\d+/m;



const MEDICAL_STRONG_SIGNAL =

  /처방전|prescription|약봉투|조제|복약|복용법|1일\s*\d+\s*회|식후|식전|공복|투여|약국|pharmacy|drug facts|side effects|contraindic/i;



const MEDICAL_DRUG_LAYOUT =

  /(?:정|캡슐|tablet|capsule)\s*[\·•]?\s*\d+\s*(?:mg|ml|g)\b|\d+\s*(?:mg|ml)\s*(?:정|캡슐|tablet|capsule)?/i;



const NON_STUDY_BLOCK =

  /영수증|receipt|합계|₩|\d+\s*원|메뉴|menu|주차|parking|wifi|ssid|password|ticket|boarding pass/i;



export type CaptureDomainRouterInput = {

  rawText: string;

  ocrText?: string;

  vision?: Pick<

    VisionSnapshot,

    "bestGuessLabels" | "webEntities" | "labels" | "fashionScore"

  > | null;

};



function normalizeLines(raw: string) {

  return raw

    .split(/\r?\n/)

    .map((line) => line.replace(/\s+/g, " ").trim())

    .filter((line) => line.length >= 2);

}



function isStudyBlocked(input: CaptureDomainRouterInput): boolean {

  const raw = input.rawText ?? "";

  return (

    NON_STUDY_BLOCK.test(raw) ||

    PRODUCT_SIGNAL.test(raw) ||

    isFashionVision(input.vision as VisionSnapshot | null | undefined)

  );

}



export function scoreStudyDomain(input: CaptureDomainRouterInput): number {

  const raw = input.rawText ?? "";

  if (isStudyBlocked(input)) {

    return 0;

  }



  let score = 0;

  const documentStudy = looksLikeDocumentStudy(raw, input.vision ?? null);

  const hasAcademicSignal = STUDY_ACADEMIC_SIGNAL.test(raw);

  const vocabHits = countStudyVocabularyHits(raw);



  if (documentStudy) {

    score += 5;

  }



  const lines = normalizeLines(raw);

  const longLines = lines.filter((line) => line.length >= 45);

  const compact = raw.replace(/\s+/g, "");



  if (compact.length >= 120 && longLines.length >= 1) {

    score += 1;

  }



  if (hasAcademicSignal) {

    score += 3;

  }



  if (vocabHits.total >= 2) {

    score += 2;

  }



  if (

    STUDY_LAYOUT_SIGNAL.test(raw) &&

    (hasAcademicSignal || documentStudy || compact.length >= 120)

  ) {

    score += 2;

  }



  if (/\([12]\d{3}\)|et al\.|Mitchell|Goswami|Libet/i.test(raw)) {

    score += 2;

  }



  const visionBlob = [

    ...(input.vision?.bestGuessLabels ?? []),

    ...(input.vision?.webEntities ?? []),

    ...(input.vision?.labels ?? []),

  ]

    .join(" ")

    .toLowerCase();



  if (/book|publication|literature|document|textbook|handwriting|page|paper/i.test(visionBlob)) {

    score += 2;

  }



  return score;

}



export function scoreMedicalDomain(input: CaptureDomainRouterInput): number {

  const raw = input.rawText ?? "";

  let score = 0;



  if (MEDICAL_STRONG_SIGNAL.test(raw)) {

    score += 4;

  }



  if (MEDICAL_DRUG_LAYOUT.test(raw)) {

    score += 3;

  }



  if (/복용|용법|효능|주의|처방|약품|성분/i.test(raw)) {

    score += 2;

  }



  const lines = normalizeLines(raw);

  const structuredDrugLine = lines.some(

    (line) =>

      line.length <= 56 &&

      /(?:mg|ml|정|캡슐|tablet|capsule)/i.test(line) &&

      !/quantum|consciousness|philosophy|theorem|chapter/i.test(line)

  );



  if (structuredDrugLine) {

    score += 2;

  }



  if (/book|publication|literature|essay|chapter/i.test(raw)) {

    score -= 3;

  }



  return Math.max(0, score);

}



export function resolveDomainConfidence(input: CaptureDomainRouterInput) {

  const studyRaw = scoreStudyDomain(input);

  const medicalRaw = scoreMedicalDomain(input);

  const otherRaw = Math.max(0, 3 - Math.max(studyRaw, medicalRaw));



  const confidence = checkDomainConfidence(input, {

    studyRaw,

    medicalRaw,

    otherRaw,

  });



  if (isStudyBlocked(input) && !STUDY_ACADEMIC_SIGNAL.test(input.rawText ?? "")) {

    return {

      ...confidence,

      domain: confidence.domain === "STUDY" ? ("OTHER" as const) : confidence.domain,

      forcedStudy: false,

      winnerTakeAll: false,

    };

  }



  return confidence;

}



/**

 * L-stage classifier — Academic Priority Score + line-density hard rule + winner-take-all.

 * Pure read path; no side effects.

 */

export function routeCaptureEssentialDomain(

  input: CaptureDomainRouterInput

): CaptureEssentialDomain {

  return resolveDomainConfidence(input).domain;

}



export function shouldBlockExternalActionsForDomain(domain: CaptureEssentialDomain) {

  return domain === "STUDY";

}



export function pickStudyHeaderFromText(rawText: string) {

  return (

    normalizeLines(rawText).find(

      (line) =>

        line.length >= 4 &&

        line.length <= 72 &&

        !/^\d{1,3}$/.test(line) &&

        !/^(복용|용법|주의|처방)/i.test(line)

    ) ?? "학습 캡처"

  );

}



export function shouldForceStudyDomain(input: CaptureDomainRouterInput) {

  const result = resolveDomainConfidence(input);

  return (

    result.domain === "STUDY" &&

    (result.forcedStudy || result.winnerTakeAll || result.academicPriorityScore >= 0.7)

  );

}


