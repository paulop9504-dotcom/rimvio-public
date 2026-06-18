import { ACTION_ORIENTED_PROMPT_BLOCK } from "@/lib/action-chat/action-oriented-prompt";
import { CONFIRMATION_LOGIC_PROMPT } from "@/lib/action-chat/confirmation-prompt";
import { buildDataCleanerPromptBlock } from "@/lib/action-chat/data-cleaner-prompt";
import { buildDeepLinkDispatcherPromptBlock } from "@/lib/deep-link-dispatch/deep-link-dispatcher-prompt";
import { assessPlaceConfirmationNeed } from "@/lib/action-chat/confirmation-logic";
import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";

export type OrchestratorFeatureKey =
  | "master_task"
  | "action_oriented"
  | "confirmation"
  | "data_cleaner"
  | "deep_link_dispatch";

const UI_NOISE_PATTERN =
  /펼쳐보기|참여\s*인원|키워드\s*선택|사용\s*안내|좋아요\s*\d|댓글\s*\d|공유하기|신고하기/i;

const DEEP_LINK_HINT =
  /토스|송금|카카오\s*페이|카톡|택시|우버|노션|스포티파이|유튜브|쿠팡|배송|스마트\s*싱스|삼성\s*헬스|전화\s*걸|문자\s*보내/i;

const VERB_SCHEDULE_HINT =
  /(?:갈\s*거|할\s*거|만날\s*거|볼\s*거|약속|일정|예약|내일|모레|오늘|\d{1,2}\s*시|\d{1,2}:\d{2})/i;

const PHONE_SAVE_HINT = /010[-\s]?\d{4}[-\s]?\d{4}|저장(?:해|해\s*놔|해\s*줘)/i;

export function resolveOrchestratorFeatures(input: {
  message: string;
  referenceDate?: string;
}): OrchestratorFeatureKey[] {
  const message = input.message.trim();
  const features: OrchestratorFeatureKey[] = ["master_task"];

  if (!message || isConversationalOnlyMessage(message)) {
    return features;
  }

  if (VERB_SCHEDULE_HINT.test(message) || PHONE_SAVE_HINT.test(message)) {
    features.push("action_oriented");
  }

  if (DEEP_LINK_HINT.test(message)) {
    features.push("deep_link_dispatch");
  }

  const placeAssessment = assessPlaceConfirmationNeed({
    message,
    referenceDate: input.referenceDate,
  });
  if (placeAssessment?.needsConfirm) {
    features.push("confirmation");
  }

  if (message.length >= 180 || UI_NOISE_PATTERN.test(message)) {
    features.push("data_cleaner");
  }

  return features;
}

export function buildFeaturePromptBlocks(
  keys: OrchestratorFeatureKey[],
  masterTaskBlock: string
): string {
  const blocks: string[] = [];

  for (const key of keys) {
    switch (key) {
      case "master_task":
        blocks.push(masterTaskBlock);
        break;
      case "action_oriented":
        blocks.push(ACTION_ORIENTED_PROMPT_BLOCK);
        break;
      case "confirmation":
        blocks.push(CONFIRMATION_LOGIC_PROMPT);
        break;
      case "data_cleaner":
        blocks.push(buildDataCleanerPromptBlock());
        break;
      case "deep_link_dispatch":
        blocks.push(buildDeepLinkDispatcherPromptBlock());
        break;
      default:
        break;
    }
  }

  return blocks.join("\n\n");
}
