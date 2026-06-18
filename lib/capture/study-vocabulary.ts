/** Philosophy / existence terms — STUDY pre-filter whitelist (K stage). */
export const STUDY_PHILOSOPHY_VOCAB =
  /의식|존재|하이데거|Heidegger|헤겔|Hegel|칸트|Kant|니체|Nietzsche|플라톤|Plato|아리스토텔|Aristotle|현상학|phenomenology|존재론|ontology|윤리학|ethics|metaphysics|metaphysic|epistemology|인식론|실존|existential|being\b|dasein|hermeneutic|hermeneutics|deconstruction|postmodern|post-structural|consciousness|existence|soul|spirit|mind-body|dualism|monism|free will|determinism|moral agency|virtue ethics|deontology/i;

/** Learning / exam terms — STUDY pre-filter whitelist (K stage). */
export const STUDY_LEARNING_VOCAB =
  /요약|개념|암기|정리|핵심|시험|exam|quiz|review notes|study guide|chapter summary|learning objective|핵심\s*정리|외울\s*것|출제|기출|강의\s*노트|lecture notes|textbook|교재|학습|복습|암기\s*카드|flashcard|mind map|개념\s*정리/i;

/** Terms that must NOT alone trigger STUDY pre-filter (regex collision guard). */
export const STUDY_PREFILTER_BLOCK =
  /영수증|receipt|합계|₩|\d+\s*원|메뉴|menu|주차|parking|wifi|ssid|password|카페|맛집|restaurant|배송|무료배송|장바구니|cart|checkout|티켓|ticket|boarding|처방전|약봉투|복용법|1일\s*\d+\s*회|조제/i;

export function countStudyVocabularyHits(rawText: string): {
  philosophy: number;
  learning: number;
  total: number;
} {
  const philosophy = (rawText.match(new RegExp(STUDY_PHILOSOPHY_VOCAB.source, "gi")) ?? []).length;
  const learning = (rawText.match(new RegExp(STUDY_LEARNING_VOCAB.source, "gi")) ?? []).length;
  return { philosophy, learning, total: philosophy + learning };
}

/**
 * K-stage pre-filter: lift to STUDY before OTHER regex cascade when vocabulary hits.
 * Pure read path.
 */
export function shouldPrefilterAsStudy(rawText: string): boolean {
  if (!rawText.trim() || STUDY_PREFILTER_BLOCK.test(rawText)) {
    return false;
  }

  const hits = countStudyVocabularyHits(rawText);
  if (hits.philosophy >= 1 && hits.total >= 2) {
    return true;
  }

  if (hits.learning >= 2) {
    return true;
  }

  if (hits.philosophy >= 1 && hits.learning >= 1) {
    return true;
  }

  return false;
}
