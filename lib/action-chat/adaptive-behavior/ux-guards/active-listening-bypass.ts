import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { classifyAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { isLowAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";

const EMPATHY_LINES = [
  "말씀만으로도 충분히 힘드셨을 것 같아요.",
  "지금은 해결책보다 **들어드리는 것**이 먼저예요.",
  "편한 만큼만 이어서 말씀해 주셔도 괜찮아요.",
];

/** COUNSELING + L0/L1 — no A/B/C chips, empathy text only. */
export function shouldActiveListeningBypass(message: string): boolean {
  const abstraction = classifyAbstractionLevel(message);
  if (!isLowAbstractionLevel(abstraction.level)) {
    return false;
  }
  const category = classifyAiIntentUtterance(message);
  if (category === "COUNSELING") {
    return true;
  }
  return /(?:스트레스|우울|힘들|속상|짜증|답답|burnout)/iu.test(message.trim());
}

export function buildActiveListeningReply(message: string): string {
  const trimmed = message.trim();
  const opener = /(?:우울|힘들|스트레스)/iu.test(trimmed)
    ? "많이 버티고 계셨네요."
    : "그 마음, 충분히 이해돼요.";
  return [opener, ...EMPATHY_LINES].join("\n\n");
}
