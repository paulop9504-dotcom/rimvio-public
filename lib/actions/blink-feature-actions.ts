import { createOpenAction } from "@/lib/enrichers/action-factory";
import type { LinkActionItem } from "@/types/database";

export const BLINK_ACTION_IDS = {
  kakaoBeam: "blink.kakao_beam",
  directShare: "blink.direct_share",
  remindLater: "blink.remind_later",
  splitBill: "blink.split_bill",
  quoteTemplate: "blink.quote_template",
  workoutTimer: "blink.workout_timer",
  todoRegister: "blink.todo_register",
  deadlineRemind: "blink.deadline_remind",
  mealLog: "blink.meal_log",
  studyTimer: "blink.study_timer",
  priceAlert: "blink.price_alert",
  vcardSave: "blink.vcard_save",
  currencyConvert: "blink.currency_convert",
  conversationTemplate: "blink.conversation_template",
  todoThree: "blink.todo_three",
  doneShare: "blink.done_share",
  achievementLog: "blink.achievement_log",
  morningBriefing: "blink.morning_briefing",
  readAloud: "blink.read_aloud",
} as const;

export function createKakaoBeamShareAction(): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "share",
    label: "💬 카톡 한 줄 공유",
    payload: {
      icon: "share",
      blinkAction: BLINK_ACTION_IDS.kakaoBeam,
    },
  };
}

export function createDirectShareAction(): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "share",
    label: "📤 친구에게 바로 보내기",
    payload: {
      icon: "share",
      blinkAction: BLINK_ACTION_IDS.directShare,
    },
  };
}

export function createRemindLaterAction(delayMinutes = 120): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "remind",
    label: "⏰ 나중에 다시",
    payload: {
      icon: "bell",
      blinkAction: BLINK_ACTION_IDS.remindLater,
      delayMinutes,
    },
  };
}

export function createOpenSimilarLinksAction(): LinkActionItem {
  return createOpenAction({
    label: "🔗 비슷한 링크",
    href: "#similar-links",
    icon: "link",
  });
}

export function buildBlinkFeatureActions(): LinkActionItem[] {
  return [createDirectShareAction(), createRemindLaterAction()];
}
