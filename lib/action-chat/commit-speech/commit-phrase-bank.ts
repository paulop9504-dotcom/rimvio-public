import type { CommitPhraseEntry, CommitSpeechTier } from "@/lib/action-chat/commit-speech/types";
import { COMMIT_TIER_CONFIDENCE } from "@/lib/action-chat/commit-speech/types";

function entry(tier: CommitSpeechTier, phrase: string): CommitPhraseEntry {
  return { tier, phrase, confidence: COMMIT_TIER_CONFIDENCE[tier] };
}

/**
 * Canonical Rimvio approval phrase bank — 7 tiers.
 * Drop-in for OCR review, confirm cards, schedule register, action reveal.
 */
export const COMMIT_PHRASE_BANK: readonly CommitPhraseEntry[] = [
  // 1. HARD COMMIT — 무조건 실행/등록
  entry("hard_commit", "응, 넣어"),
  entry("hard_commit", "응 넣어"),
  entry("hard_commit", "네"),
  entry("hard_commit", "좋아"),
  entry("hard_commit", "오케이"),
  entry("hard_commit", "OK"),
  entry("hard_commit", "알겠어"),
  entry("hard_commit", "그렇게 해"),
  entry("hard_commit", "그렇게 하자"),
  entry("hard_commit", "진행해"),
  entry("hard_commit", "실행해"),
  entry("hard_commit", "시작해"),
  entry("hard_commit", "등록해"),
  entry("hard_commit", "추가해"),
  entry("hard_commit", "저장해"),
  entry("hard_commit", "반영해"),
  entry("hard_commit", "확정"),
  entry("hard_commit", "그걸로 가자"),
  entry("hard_commit", "그걸로 해"),
  entry("hard_commit", "이걸로 할게"),
  entry("hard_commit", "진행 부탁"),
  entry("hard_commit", "처리해줘"),
  entry("hard_commit", "바로 해줘"),
  entry("hard_commit", "응"),
  entry("hard_commit", "넵"),
  entry("hard_commit", "예"),
  entry("hard_commit", "ㅇㅇ"),
  entry("hard_commit", "맞아"),
  entry("hard_commit", "맞아요"),
  entry("hard_commit", "확인"),

  // 2. SOFT COMMIT
  entry("soft_commit", "괜찮아"),
  entry("soft_commit", "좋아 보여"),
  entry("soft_commit", "그럼 그렇게 할까"),
  entry("soft_commit", "일단 해봐"),
  entry("soft_commit", "그걸로 해도 될 듯"),
  entry("soft_commit", "나쁘지 않네"),
  entry("soft_commit", "그 방향으로"),
  entry("soft_commit", "그렇게 하면 좋겠다"),
  entry("soft_commit", "그걸로 해도 될 것 같아"),
  entry("soft_commit", "일단 진행해보자"),
  entry("soft_commit", "우선 그렇게"),
  entry("soft_commit", "일단 넣어줘"),
  entry("soft_commit", "그 정도면 괜찮아"),

  // 3. TIKI-TAKA APPROVAL
  entry("tiki_taka_approval", "음 좋아"),
  entry("tiki_taka_approval", "그래 좋아"),
  entry("tiki_taka_approval", "오 괜찮네"),
  entry("tiki_taka_approval", "좋다"),
  entry("tiki_taka_approval", "맞아 그거"),
  entry("tiki_taka_approval", "그게 낫겠다"),
  entry("tiki_taka_approval", "그거 괜찮다"),
  entry("tiki_taka_approval", "응 그쪽으로"),
  entry("tiki_taka_approval", "오키 그걸로"),
  entry("tiki_taka_approval", "괜찮은데?"),
  entry("tiki_taka_approval", "그래"),

  // 4. ACTION TRIGGER
  entry("action_trigger", "추가해줘"),
  entry("action_trigger", "등록해줘"),
  entry("action_trigger", "저장해줘"),
  entry("action_trigger", "반영해줘"),
  entry("action_trigger", "적용해줘"),
  entry("action_trigger", "넣어줘"),
  entry("action_trigger", "업데이트 해줘"),
  entry("action_trigger", "수정해줘"),
  entry("action_trigger", "바로 등록"),
  entry("action_trigger", "바로 추가"),
  entry("action_trigger", "지금 해줘"),
  entry("action_trigger", "즉시 반영"),
  entry("action_trigger", "실행 부탁"),
  entry("action_trigger", "보여줘"),
  entry("action_trigger", "켜줘"),
  entry("action_trigger", "해줘"),

  // 5. IMPLICIT COMMIT — 앞 맥락 기준 동의
  entry("implicit_commit", "그걸로 하자"),
  entry("implicit_commit", "그 방향으로 가자"),
  entry("implicit_commit", "아까 말한대로"),
  entry("implicit_commit", "그거 기준으로"),
  entry("implicit_commit", "그걸 기준으로"),
  entry("implicit_commit", "방금 그걸로"),
  entry("implicit_commit", "위에 말한대로"),
  entry("implicit_commit", "그대로 해"),
  entry("implicit_commit", "그대로 진행"),

  // 6. EMOTIONAL COMMIT
  entry("emotional_commit", "좋아 보이네"),
  entry("emotional_commit", "괜찮은 선택인 것 같아"),
  entry("emotional_commit", "나도 그게 좋아"),
  entry("emotional_commit", "그게 더 낫겠다"),
  entry("emotional_commit", "믿고 가자"),
  entry("emotional_commit", "일단 좋아"),
  entry("emotional_commit", "나쁘지 않다"),
  entry("emotional_commit", "괜찮은 듯"),
  entry("emotional_commit", "이게 맞는 느낌"),

  // 7. WEAK COMMIT
  entry("weak_commit", "음… 일단 해보자"),
  entry("weak_commit", "음 일단 해보자"),
  entry("weak_commit", "애매한데 해봐"),
  entry("weak_commit", "잘 모르겠지만 해"),
  entry("weak_commit", "일단 넣고 보자"),
  entry("weak_commit", "우선 해놓자"),
  entry("weak_commit", "테스트로 해보자"),
  entry("weak_commit", "일단 적용해봐"),
];

/** Longest phrase first — avoids partial shadowing. */
export const COMMIT_PHRASE_BANK_SORTED = [...COMMIT_PHRASE_BANK].sort(
  (a, b) => b.phrase.length - a.phrase.length
);

export const COMMIT_TIER_LABELS: Record<CommitSpeechTier, string> = {
  hard_commit: "강한 확정 (HARD COMMIT)",
  soft_commit: "소프트 확정 (SOFT COMMIT)",
  tiki_taka_approval: "반응형 동의 (TIKI-TAKA)",
  action_trigger: "즉시 실행형 (ACTION TRIGGER)",
  implicit_commit: "컨텍스트 기반 승인 (IMPLICIT COMMIT)",
  emotional_commit: "감정 기반 승인 (EMOTIONAL COMMIT)",
  weak_commit: "애매하지만 승인 가능 (WEAK COMMIT)",
};
