import type { LensActionType } from "@/lib/peer-chat/ai-lens/types";

export type PlanHorizon = "short" | "medium" | "long";
export type ScheduleIntentKind = "appointment" | "plan" | "entertainment";

export type ScheduleIntentProfile = {
  kind: ScheduleIntentKind;
  horizon: PlanHorizon;
  suggestFeed: boolean;
  feedCheckboxLabel: string;
  feedCheckboxHint?: string;
  toastCalendarOnly: string;
  toastWithFeed: string;
};

const PLAN_SIGNAL =
  /(?:목표|계획|루틴|프로젝트|공부|다이어트|이직|운동|준비|시작|완료|전략|로드맵|타임라인)/u;
const LONG_HORIZON =
  /(?:장기|몇\s*달|3개월|6개월|1년|올해\s*안|내년|졸업|이직)/u;
const MEDIUM_HORIZON = /(?:이번\s*달|한\s*달|4주|8주|중기|분기)/u;
const PREP_SIGNAL = /(?:여행|출국|공항|준비|챙|짐|예매|티켓)/u;

function inferHorizon(blob: string, hasDatetime: boolean): PlanHorizon {
  if (LONG_HORIZON.test(blob)) {
    return "long";
  }
  if (MEDIUM_HORIZON.test(blob)) {
    return "medium";
  }
  if (!hasDatetime && PLAN_SIGNAL.test(blob)) {
    return "medium";
  }
  return "short";
}

function feedCopyFor(input: {
  kind: ScheduleIntentKind;
  horizon: PlanHorizon;
  peerName?: string;
  blob: string;
}): Pick<
  ScheduleIntentProfile,
  "suggestFeed" | "feedCheckboxLabel" | "feedCheckboxHint"
> {
  if (input.kind === "plan") {
    if (input.horizon === "long") {
      return {
        suggestFeed: true,
        feedCheckboxLabel: "피드에 올려 단계별로 같이 진행할게요",
        feedCheckboxHint: "AI가 중간 점검과 다음 할 일을 피드에 올려 드려요",
      };
    }
    if (input.horizon === "medium") {
      return {
        suggestFeed: true,
        feedCheckboxLabel: "피드에서 주간 계획도 같이 볼게요",
        feedCheckboxHint: "캘린더와 함께 피드에서 진행 상황을 챙길 수 있어요",
      };
    }
    return {
      suggestFeed: true,
      feedCheckboxLabel: "피드에 올려 오늘 할 일도 정리할게요",
      feedCheckboxHint: "짧은 계획도 피드에서 바로 이어갈 수 있어요",
    };
  }

  if (input.kind === "entertainment" && PREP_SIGNAL.test(input.blob)) {
    return {
      suggestFeed: true,
      feedCheckboxLabel: "피드에서 준비할 것도 같이 챙길게요",
      feedCheckboxHint: "예매·이동·준비물을 피드에서 이어갈 수 있어요",
    };
  }

  if (input.kind === "entertainment") {
    return {
      suggestFeed: false,
      feedCheckboxLabel: "피드에도 올릴게요",
      feedCheckboxHint: "상영·모임 전에 피드에서 다시 볼 수 있어요",
    };
  }

  return {
    suggestFeed: false,
    feedCheckboxLabel: "피드에도 올릴게요",
    feedCheckboxHint: "약속 전에 피드에서 다시 확인할 수 있어요",
  };
}

export function classifyScheduleIntent(input: {
  title: string;
  reason?: string;
  actionType: LensActionType;
  hasDatetime: boolean;
  peerDisplayName?: string;
}): ScheduleIntentProfile {
  const blob = `${input.title} ${input.reason ?? ""}`;
  const peerName = input.peerDisplayName?.trim();

  let kind: ScheduleIntentKind = "appointment";
  if (input.actionType === "movie_schedule") {
    kind = "entertainment";
  } else if (PLAN_SIGNAL.test(blob) && !input.hasDatetime) {
    kind = "plan";
  } else if (PLAN_SIGNAL.test(blob) && /(?:루틴|목표|계획)/u.test(blob)) {
    kind = "plan";
  }

  const horizon = inferHorizon(blob, input.hasDatetime);
  const feed = feedCopyFor({ kind, horizon, peerName, blob });

  const titleSnippet = input.title.trim().slice(0, 24) || "일정";

  return {
    kind,
    horizon,
    ...feed,
    toastCalendarOnly: `${titleSnippet} · 캘린더에 저장했어요`,
    toastWithFeed:
      kind === "plan"
        ? `${titleSnippet} · 캘린더에 넣고 피드에서 계획을 이어갈게요`
        : `${titleSnippet} · 캘린더에 넣고 피드에도 올렸어요`,
  };
}
