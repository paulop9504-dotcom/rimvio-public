import {
  COMMIT_PHRASE_BANK_SORTED,
} from "@/lib/action-chat/commit-speech/commit-phrase-bank";
import type {
  CommitSpeechAct,
  CommitSpeechAnalysis,
  CommitSpeechTier,
} from "@/lib/action-chat/commit-speech/types";
import {
  ACTION_UI_CONFIRM_THRESHOLD,
  DEFAULT_EXECUTION_APPROVAL_THRESHOLD,
} from "@/lib/action-chat/commit-speech/types";

const REJECT_PATTERN =
  /^(?:아니(?:요|오)?|취소|그만|안\s*(?:할|돼|해)|하지\s*마|다시|틀려|잘못|빼(?:줘|주세요)?|삭제(?:해줘|해주세요)?|stop|cancel)(?:[!?.~ㅋㅎ\s]*)?$/iu;

const REJECT_ALTERNATE =
  /^(?:아니(?:요|오)?|다른(?:\s*거)?|또\s*다른|다시(?:\s*찾)?)(?:[\s,.!?~]*(?:보여(?:줘|주세요)?|해(?:줘|주세요)?|액션|거|띄워(?:줘|주세요)?|찾아(?:줘|주세요)?))?/iu;

/** Schedule/calendar utterance with explicit commit verb — no pending gate needed. */
const CONTEXTUAL_APPROVE_ACTION =
  /(?:캘린더|일정|스케줄|캘).*(?:넣|등록|저장|추가|만들)|(?:넣|등록|저장|추가|만들|진행).*(?:줘|주세요|해)|일정으로\s*만들/iu;

const AFFIRM_ACTION_TAIL =
  /^(?:네|응|예|좋아|그래|맞(?:아|아요|습니다)?|확인|알겠(?:어|어요|습니다)?|오케이)\s+(?:보여(?:줘|주세요)?|켜(?:줘|주세요)?|해(?:줘|주세요)?|넣(?:어(?:줘|주세요)?)?|등록(?:해(?:줘|주세요)?)?|추가(?:해(?:줘|주세요)?)?|저장(?:해(?:줘|주세요)?)?|진행(?:해(?:줘|주세요)?)?)$/iu;

const TIER_PRIORITY: CommitSpeechTier[] = [
  "hard_commit",
  "action_trigger",
  "tiki_taka_approval",
  "implicit_commit",
  "soft_commit",
  "emotional_commit",
  "weak_commit",
];

const patternCache = new Map<string, RegExp>();

export function normalizeCommitMessage(message: string): string {
  return message
    .trim()
    .replace(/[,，]/g, " ")
    .replace(/…+/g, "…")
    .replace(/\s+/g, " ");
}

function phraseToPattern(phrase: string): RegExp {
  const cached = patternCache.get(phrase);
  if (cached) {
    return cached;
  }
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+")
    .replace(/…/g, "…?");
  const pattern = new RegExp(`^${escaped}(?:[!?.~ㅋㅎ…\\s]*)?$`, "iu");
  patternCache.set(phrase, pattern);
  return pattern;
}

export function isCommitRejectMessage(message: string): boolean {
  const normalized = normalizeCommitMessage(message);
  if (!normalized) {
    return false;
  }
  return REJECT_PATTERN.test(normalized) || REJECT_ALTERNATE.test(normalized);
}

export function classifyCommitSpeech(message: string): CommitSpeechAnalysis {
  const normalized = normalizeCommitMessage(message);
  if (!normalized) {
    return { act: "NONE", confidence: 0 };
  }

  if (isCommitRejectMessage(normalized)) {
    return { act: "REJECT", confidence: 1 };
  }

  for (const { tier, phrase, confidence } of COMMIT_PHRASE_BANK_SORTED) {
    if (phraseToPattern(phrase).test(normalized)) {
      return {
        act: "APPROVE",
        tier,
        confidence,
        matchedPhrase: phrase,
      };
    }
  }

  if (CONTEXTUAL_APPROVE_ACTION.test(normalized)) {
    return {
      act: "APPROVE",
      tier: "action_trigger",
      confidence: 0.95,
      matchedPhrase: normalized,
    };
  }

  if (AFFIRM_ACTION_TAIL.test(normalized)) {
    return {
      act: "APPROVE",
      tier: "action_trigger",
      confidence: 0.95,
      matchedPhrase: normalized,
    };
  }

  return { act: "NONE", confidence: 0 };
}

export function isExecutionApproval(
  message: string,
  threshold = DEFAULT_EXECUTION_APPROVAL_THRESHOLD
): boolean {
  if (isCommitRejectMessage(message)) {
    return false;
  }
  const analysis = classifyCommitSpeech(message);
  return analysis.act === "APPROVE" && analysis.confidence >= threshold;
}

export function isActionUiConfirm(message: string): boolean {
  return isExecutionApproval(message, ACTION_UI_CONFIRM_THRESHOLD);
}

export function phrasesForTier(tier: CommitSpeechTier): string[] {
  return COMMIT_PHRASE_BANK_SORTED.filter((row) => row.tier === tier).map(
    (row) => row.phrase
  );
}

export function tierPriority(a: CommitSpeechTier, b: CommitSpeechTier): number {
  return TIER_PRIORITY.indexOf(a) - TIER_PRIORITY.indexOf(b);
}
