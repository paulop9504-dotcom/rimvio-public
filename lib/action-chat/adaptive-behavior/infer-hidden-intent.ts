import type { AbstractionAnalysis } from "@/lib/action-chat/classify-abstraction-level";
import { isLowAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import type { HiddenIntentKind } from "@/lib/action-chat/adaptive-behavior/types";

const BOREDOM =
  /(?:심심|뭐\s*하지|할\s*게\s*없|지루|뭐\s*하지\??|오늘\s*뭐)/iu;
const ANXIETY =
  /(?:불안|걱정|후회|망할|실수|괜찮(?:을)?(?:까|지)|사도\s*돼|해도\s*돼)/iu;
const FATIGUE =
  /(?:피곤|지쳤|졸려|귀찮|힘들|번아웃|burnout|쉬고\s*싶)/iu;
const AVOIDANCE =
  /(?:그냥|대충|알아서|모르겠|피하고|하기\s*싫|귀찮)/iu;
const CURIOSITY =
  /(?:궁금|어떻게\s*되|뭐(?:야|임)|설명|차이)/iu;

/** L0/L1 utterances often hide emotional intent behind vague phrasing. */
export function inferHiddenIntents(
  message: string,
  abstraction: AbstractionAnalysis
): HiddenIntentKind[] {
  const trimmed = message.trim();
  const intents = new Set<HiddenIntentKind>();

  if (BOREDOM.test(trimmed)) intents.add("boredom");
  if (ANXIETY.test(trimmed)) intents.add("anxiety");
  if (FATIGUE.test(trimmed)) intents.add("fatigue");
  if (AVOIDANCE.test(trimmed)) intents.add("avoidance");
  if (CURIOSITY.test(trimmed)) intents.add("curiosity");

  if (isLowAbstractionLevel(abstraction.level) && intents.size === 0) {
    if (/^(?:뭐\s*하지|추천|그냥|모르)/iu.test(trimmed)) {
      intents.add("boredom");
      intents.add("avoidance");
    }
  }

  if (/배고(?:픈|파)/iu.test(trimmed) && FATIGUE.test(trimmed)) {
    intents.add("fatigue");
    intents.add("avoidance");
  }

  return [...intents];
}
