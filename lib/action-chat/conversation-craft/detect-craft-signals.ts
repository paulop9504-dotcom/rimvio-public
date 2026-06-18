import { classifyAbstractionLevel, isLowAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type {
  ConversationCraftFlags,
  CraftContextIcon,
  CraftMadLibsSlot,
  CraftPolarSlider,
  CraftTechniqueId,
  CraftVitalityReact,
} from "@/lib/action-chat/conversation-craft/types";
import { EMPTY_CRAFT_FLAGS } from "@/lib/action-chat/conversation-craft/types";

const TRAVEL_DOMAIN =
  /(?:여행|부산|제주|숙소|항공|비행|기차|KTX|호텔|펜션|주말\s*에\s*가)/iu;
const SCHEDULE_DOMAIN =
  /(?:일정|약속|미팅|회의|캘린더|내일|오늘\s*오후|강남역|역에서)/iu;
const PLACE_DOMAIN =
  /(?:성수|강남|홍대|이태원|연남|을지로|근처|동네)/iu;
const MEAL_DOMAIN = /(?:먹|맛집|배고|점심|저녁|식사|카페|브런치)/iu;
const L3_TRADEOFF = /(?:가성비|분위기|조용|웨이팅|예산|프리미엄|핫플)/iu;
const LUKEWARM_REACTION =
  /(?:글쎄|별로|애매|그냥|잘\s*모르|다른\s*거|다시|아닌\s*것\s*같)/iu;

const PREFERENCE_QUIET = /(?:조용|한적|조용한)/iu;
const PREFERENCE_VALUE = /(?:가성비|저렴|합리)/iu;
const PREFERENCE_VIBE = /(?:분위기|예쁜|감성)/iu;
const ROUTINE_MARKERS = /(?:헬스|운동|루틴|매주|항상)/iu;

function recentText(history: readonly OrchestrateHistoryTurn[] | undefined, limit = 8): string {
  if (!history?.length) return "";
  return history
    .slice(-limit)
    .map((turn) => turn.content)
    .join("\n");
}

function detectPreferenceFingerprint(history?: readonly OrchestrateHistoryTurn[]): string | null {
  const blob = recentText(history, 12);
  if (PREFERENCE_QUIET.test(blob)) return "quiet_value";
  if (PREFERENCE_VALUE.test(blob)) return "value_first";
  if (PREFERENCE_VIBE.test(blob)) return "vibe_first";
  return null;
}

function detectLukewarmReaction(history?: readonly OrchestrateHistoryTurn[]): boolean {
  const users = history?.filter((t) => t.role === "user").slice(-3) ?? [];
  return users.some((t) => LUKEWARM_REACTION.test(t.content));
}

function detectScheduleAnchor(
  existingSchedule: readonly { time?: string; task?: string; title?: string }[] | undefined,
  _referenceDate?: string
): string | null {
  if (!existingSchedule?.length) return null;
  for (const item of existingSchedule) {
    const label = item.task ?? item.title ?? "";
    if (!label.trim()) continue;
    if (/(?:미팅|회의|약속|강남|역)/iu.test(label)) {
      return label.trim();
    }
  }
  if (existingSchedule[0]) {
    const first = existingSchedule[0].task ?? existingSchedule[0].title;
    if (first?.trim()) return first.trim();
  }
  return null;
}

function buildContextIcons(message: string, techniques: CraftTechniqueId[]): CraftContextIcon[] {
  if (techniques.includes("vitality_quick_react")) return [];
  const icons: CraftContextIcon[] = [];
  if (TRAVEL_DOMAIN.test(message) || SCHEDULE_DOMAIN.test(message)) {
    icons.push({ icon: "📅", label: "일정", prompt: "일정 탭으로 잡기", axis: "schedule" });
    if (TRAVEL_DOMAIN.test(message)) {
      icons.push({ icon: "✈️", label: "교통", prompt: "교통편부터 볼게요", axis: "schedule" });
    }
  }
  if (MEAL_DOMAIN.test(message)) {
    icons.push({ icon: "🍽", label: "맛집", prompt: "맛집 추천 받기", axis: "meal" });
  }
  if (/(?:정산|예산|가격|₩|만원)/iu.test(message)) {
    icons.push({ icon: "₩", label: "예산", prompt: "예산 기준으로 다시 추려줘", axis: "concern" });
  }
  if (/(?:예약|링크|티켓)/iu.test(message)) {
    icons.push({ icon: "🔗", label: "예약", prompt: "예약 링크 찾아줘", axis: "concern" });
  }
  return icons.slice(0, 2);
}

function buildMadLibs(message: string): CraftMadLibsSlot[] | null {
  const timeMatch = message.match(/(?:이번\s*주말|주말|내일|오늘\s*저녁|토요일|일요일)/iu);
  const placeMatch = message.match(/(?:성수(?:동)?|강남|홍대|연남|을지로|근처)/iu);
  const mealMatch = message.match(/(?:브런치|점심|저녁|카페|맛집|가벼운)/iu);
  if (!timeMatch && !placeMatch) return null;
  if (!mealMatch && !/(?:먹|갈|들)/iu.test(message)) return null;

  return [
    {
      id: "time",
      label: "시간",
      value: timeMatch?.[0] ?? "이번 주말",
      alternatives: ["오늘 저녁", "내일 점심", "이번 주말"],
    },
    {
      id: "place",
      label: "장소",
      value: placeMatch?.[0] ?? "근처",
      alternatives: ["성수동", "강남", "홍대", "근처"],
    },
    {
      id: "vibe",
      label: "무드",
      value: mealMatch?.[0] ?? "가벼운 브런치",
      alternatives: ["가벼운 브런치", "국물 한 끼", "조용한 카페"],
    },
  ];
}

function buildPolarSlider(message: string, abstraction: string): CraftPolarSlider | null {
  if (abstraction !== "L3") return null;
  if (/(?:가성비|저렴)/iu.test(message) && /(?:분위기|프리미엄|오마카세)/iu.test(message)) {
    return { left: "가성비", right: "분위기", defaultPosition: 45 };
  }
  if (/(?:조용|한적)/iu.test(message) && /(?:핫플|웨이팅|인기)/iu.test(message)) {
    return { left: "조용함", right: "핫플", defaultPosition: 35 };
  }
  if (L3_TRADEOFF.test(message)) {
    return { left: "실용", right: "경험", defaultPosition: 50 };
  }
  return null;
}

function buildVitalityReact(
  message: string,
  abstraction: ReturnType<typeof classifyAbstractionLevel>
): CraftVitalityReact[] | null {
  if (!isLowAbstractionLevel(abstraction.level)) return null;
  if (MEAL_DOMAIN.test(message) || TRAVEL_DOMAIN.test(message) || SCHEDULE_DOMAIN.test(message)) {
    return null;
  }
  if (!/^(?:뭐\s*하지|심심|할\s*게\s*없|지루|모르겠)/iu.test(message.trim())) {
    return null;
  }
  return [
    { emoji: "🫠", label: "피곤", prompt: "피곤해, 집에서 쉬고 싶어", vitality: "energy_depletion" },
    { emoji: "🤤", label: "배고픔", prompt: "배고파, 뭐 먹을지 추천해줘", vitality: "hunger" },
    { emoji: "🤯", label: "과부하", prompt: "머리 복잡해, 간단히 정리해줘", vitality: "overload" },
  ];
}

export type CraftResolveInput = {
  message: string;
  history?: readonly OrchestrateHistoryTurn[];
  adaptive: Pick<
    AdaptiveBehaviorContext,
    | "abstractionLevel"
    | "hiddenIntents"
    | "vitalityStates"
    | "autoDecide"
    | "decisionFatigue"
    | "shouldPreemptTiki"
    | "routingHint"
    | "ux"
  >;
  existingSchedule?: readonly { time?: string; task?: string; title?: string }[];
  referenceDate?: string;
};

export function resolveConversationCraft(input: CraftResolveInput): ConversationCraftFlags {
  const message = input.message.trim();
  if (!message) return { ...EMPTY_CRAFT_FLAGS };

  const { adaptive } = input;
  const abstraction = classifyAbstractionLevel(message);
  const aiIntent = classifyAiIntentUtterance(message);
  const techniques: CraftTechniqueId[] = [];
  const ux = adaptive.ux;

  if (ux.frustrationEscape || ux.activeListening) {
    return { ...EMPTY_CRAFT_FLAGS, defersToUxGuard: EMPTY_CRAFT_FLAGS.defersToUxGuard };
  }

  const low = isLowAbstractionLevel(abstraction.level);
  const preferenceFingerprint = detectPreferenceFingerprint(input.history);
  const scheduleAnchor = detectScheduleAnchor(input.existingSchedule, input.referenceDate);
  const lukewarm = detectLukewarmReaction(input.history);
  const historyBlob = recentText(input.history);

  if (
    low &&
    (MEAL_DOMAIN.test(message) || aiIntent === "DECISION" || adaptive.routingHint === "FOOD") &&
    !adaptive.shouldPreemptTiki
  ) {
    techniques.push("alternative_choice");
  }

  if (
    (abstraction.level === "L2" || abstraction.level === "L3") &&
    (TRAVEL_DOMAIN.test(message) || SCHEDULE_DOMAIN.test(message)) &&
    !/(?:\?|할까|인가요)/iu.test(message)
  ) {
    techniques.push("assumptive_close");
  }

  if (
    (abstraction.level === "L3" && L3_TRADEOFF.test(message) && lukewarm) ||
    (lukewarm && MEAL_DOMAIN.test(message))
  ) {
    techniques.push("if_then_probe");
  }

  if (
    (adaptive.vitalityStates.includes("overload") || adaptive.autoDecide || adaptive.decisionFatigue) &&
    (MEAL_DOMAIN.test(message) || adaptive.routingHint === "FOOD")
  ) {
    techniques.push("takeaway");
  }

  if (techniques.includes("alternative_choice") && (MEAL_DOMAIN.test(message) || aiIntent === "DECISION")) {
    techniques.push("anchoring");
  }

  if (!ux.activeListening && !adaptive.shouldPreemptTiki) {
    techniques.push("zeigarnik_close");
  }

  if (low && adaptive.vitalityStates.length > 0 && !adaptive.shouldPreemptTiki) {
    techniques.push("default_assumption");
  }

  if (preferenceFingerprint && MEAL_DOMAIN.test(message) && PLACE_DOMAIN.test(message)) {
    techniques.push("zero_step");
  }

  if (scheduleAnchor && (MEAL_DOMAIN.test(message) || adaptive.vitalityStates.includes("energy_depletion"))) {
    techniques.push("cross_domain_stitch");
  }

  if (
    ROUTINE_MARKERS.test(historyBlob) &&
    adaptive.vitalityStates.includes("overload") &&
    /(?:금요일|토요일|저녁|운동|헬스)/iu.test(`${message}\n${historyBlob}`)
  ) {
    techniques.push("contextual_pivot");
  }

  let madLibs: CraftMadLibsSlot[] | null = null;
  if (abstraction.level === "L2" && PLACE_DOMAIN.test(message)) {
    madLibs = buildMadLibs(message);
    if (madLibs) techniques.push("mad_libs_slot");
  }

  const polarSlider = buildPolarSlider(message, abstraction.level);
  if (polarSlider && !ux.frustrationEscape) {
    techniques.push("polar_slider");
  }

  const vitalityReact = buildVitalityReact(message, abstraction);
  if (vitalityReact) {
    techniques.push("vitality_quick_react");
  }

  const contextIcons =
    abstraction.level !== "L0" && !low
      ? buildContextIcons(message, techniques)
      : buildContextIcons(message, techniques);
  if (contextIcons.length && !techniques.includes("vitality_quick_react")) {
    techniques.push("context_icon");
  }

  return {
    techniques: [...new Set(techniques)],
    defersToUxGuard: EMPTY_CRAFT_FLAGS.defersToUxGuard,
    contextIcons,
    madLibs,
    polarSlider,
    vitalityReact,
    preferenceFingerprint,
    scheduleAnchor,
  };
}
