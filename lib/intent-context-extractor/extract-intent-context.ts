import type {
  ContextType,
  IntentContextExtractInput,
  IntentContextWire,
  LocationRelevance,
  PossibleActionCandidate,
  SecondaryReasonSignal,
  TimeSensitivity,
} from "@/lib/intent-context-extractor/types";

function uniquePush<T>(list: T[], value: T) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function isMeetingLike(text: string): boolean {
  return /(?:미팅|회의|meeting|파트너|외부|인터뷰|프레젠)/iu.test(text);
}

function isGymLike(text: string): boolean {
  return /(?:헬스|PT|피티|운동|gym|fitness)/iu.test(text);
}

function isTravelLike(text: string): boolean {
  return /(?:이동|출발|도착|역|공항|택시|카카오\s*T|내비|길찾)/iu.test(text);
}

function extractPlace(title: string, location?: string | null): string | null {
  if (location?.trim()) {
    return location.trim();
  }
  const match = title.match(/(?:강남역|역|공항|병원|헬스장)[^\s,]*/u);
  return match?.[0] ?? null;
}

function inferContextType(text: string): ContextType {
  if (isMeetingLike(text)) {
    return "work";
  }
  if (isGymLike(text)) {
    return "health";
  }
  if (isTravelLike(text)) {
    return "travel";
  }
  if (/(?:송금|결제|카드|계좌|환율|주식|매매)/u.test(text)) {
    return "finance";
  }
  if (/(?:친구|약속|카톡|연락|만나)/u.test(text)) {
    return "social";
  }
  if (/(?:먹|식사|저녁|점심|쇼핑|주문|픽업)/u.test(text)) {
    return "lifestyle";
  }
  return "unknown";
}

function inferTimeSensitivity(minutes: number | null | undefined): TimeSensitivity {
  if (minutes == null) {
    return "low";
  }
  if (minutes <= 30) {
    return "high";
  }
  if (minutes <= 120) {
    return "medium";
  }
  return "low";
}

function inferLocationRelevance(
  place: string | null,
  proximity?: IntentContextExtractInput["signals"]["proximity"],
): LocationRelevance {
  if (proximity === "at_venue" || proximity === "en_route") {
    return "direct";
  }
  if (place) {
    return "indirect";
  }
  return "none";
}

function buildDayStartActions(input: {
  meetingCount: number;
  feedbackCount: number;
}): PossibleActionCandidate[] {
  const actions: PossibleActionCandidate[] = [];

  if (input.meetingCount > 0) {
    actions.push({
      action: `오늘 중요 일정 ${input.meetingCount}건 확인`,
      category: "auxiliary",
      reason: "day-start schedule awareness",
    });
  }

  if (input.feedbackCount > 0) {
    actions.push({
      action: `팀 피드백 ${input.feedbackCount}건 확인`,
      category: "auxiliary",
      reason: "unread team feedback at day start",
    });
  }

  return actions;
}

function buildMeetingActions(input: {
  title: string;
  place: string | null;
  minutes: number | null;
  proximity?: IntentContextExtractInput["signals"]["proximity"];
}): {
  actions: PossibleActionCandidate[];
  signals: SecondaryReasonSignal[];
} {
  const actions: PossibleActionCandidate[] = [];
  const signals: SecondaryReasonSignal[] = ["preparation"];

  actions.push({
    action: input.title.trim() || "일정 참석",
    category: "main",
    reason: "scheduled commitment — skipping affects outcome",
  });

  const enRoute =
    input.proximity === "en_route" ||
    (input.minutes != null && input.minutes > 10 && input.minutes <= 120);
  const onSite =
    input.proximity === "at_venue" ||
    (input.minutes != null && input.minutes <= 10 && input.minutes >= -30);

  if (enRoute && input.place) {
    actions.push({
      action: `카카오T 호출 (${input.place})`,
      category: "main",
      reason: "travel required to reach venue on time",
    });
    actions.push({
      action: `${input.place}까지 이동 시간 확인`,
      category: "auxiliary",
      reason: "departure timing awareness",
    });
    uniquePush(signals, "urgency");
    uniquePush(signals, "efficiency");
  }

  if (onSite) {
    actions.push({
      action: "미팅용 회사 소개서 PDF 열기",
      category: "auxiliary",
      reason: "on-site meeting material ready",
    });
    actions.push({
      action: "디지털 명함 QR코드 표시",
      category: "auxiliary",
      reason: "in-person introduction support",
    });
    uniquePush(signals, "preparation");
    uniquePush(signals, "convenience");
  }

  if (input.minutes != null && input.minutes <= 15) {
    uniquePush(signals, "urgency");
    uniquePush(signals, "risk_prevention");
  }

  return { actions, signals };
}

function buildGymActions(): {
  actions: PossibleActionCandidate[];
  signals: SecondaryReasonSignal[];
} {
  return {
    actions: [
      {
        action: "헬스장 개인 PT 세션",
        category: "main",
        reason: "scheduled health commitment",
      },
      {
        action: "자주 먹는 샐러드 픽업 주문",
        category: "auxiliary",
        reason: "meal prep before session",
      },
      {
        action: "헬스장 입장용 멤버십 바코드",
        category: "auxiliary",
        reason: "venue entry preparation",
      },
    ],
    signals: ["preparation", "convenience", "efficiency"],
  };
}

function buildMessageOnlyActions(message: string): {
  actions: PossibleActionCandidate[];
  signals: SecondaryReasonSignal[];
} {
  const actions: PossibleActionCandidate[] = [];
  const signals: SecondaryReasonSignal[] = [];

  if (/(?:뭐\s*먹|메뉴|추천|저녁|점심)/u.test(message)) {
    actions.push({
      action: "식사 옵션 탐색",
      category: "main",
      reason: "food decision intent expressed",
    });
    uniquePush(signals, "convenience");
  }

  if (/(?:일정|캘린더|스케줄)/u.test(message)) {
    actions.push({
      action: "일정 확인",
      category: "auxiliary",
      reason: "schedule awareness requested",
    });
    uniquePush(signals, "preparation");
  }

  if (/(?:피곤|지침|쉬)/u.test(message)) {
    actions.push({
      action: "휴식·일정 완화 검토",
      category: "auxiliary",
      reason: "recovery intent implied",
    });
    uniquePush(signals, "efficiency");
  }

  return { actions, signals };
}

/**
 * Pure read-path extraction — no UI, timing, ranking, or execution.
 * Returns semantic candidates for downstream Event Engine.
 */
export function extractIntentContext(
  input: IntentContextExtractInput,
): IntentContextWire {
  const message = input.message?.trim() ?? "";
  const eventTitle = input.event?.title?.trim() ?? "";
  const combined = [message, eventTitle].filter(Boolean).join(" · ");
  const text = combined || message || eventTitle;

  const place = extractPlace(eventTitle || message, input.event?.location);
  const minutes = input.event?.minutes_until ?? null;
  const clock = input.clock ?? new Date();
  const hour = clock.getHours();
  const isMorning = hour >= 6 && hour < 11;

  const contextType = inferContextType(text);
  const entities: string[] = [];
  if (place) {
    entities.push(place);
  }
  if (eventTitle) {
    entities.push(eventTitle);
  }

  const possible_actions: PossibleActionCandidate[] = [];
  const secondary_reason_signals: SecondaryReasonSignal[] = [];

  const meetingCount = input.signals?.upcoming_meeting_count ?? 0;
  const feedbackCount = input.signals?.unread_team_feedback_count ?? 0;

  if (isMorning && (meetingCount > 0 || feedbackCount > 0 || isMeetingLike(text))) {
    for (const action of buildDayStartActions({ meetingCount, feedbackCount })) {
      possible_actions.push(action);
    }
    uniquePush(secondary_reason_signals, "preparation");
  }

  if (isMeetingLike(text)) {
    const meeting = buildMeetingActions({
      title: eventTitle || "외부 미팅",
      place,
      minutes,
      proximity: input.signals?.proximity,
    });
    possible_actions.push(...meeting.actions);
    for (const signal of meeting.signals) {
      uniquePush(secondary_reason_signals, signal);
    }
  } else if (isGymLike(text)) {
    const gym = buildGymActions();
    possible_actions.push(...gym.actions);
    for (const signal of gym.signals) {
      uniquePush(secondary_reason_signals, signal);
    }
  } else if (message) {
    const msg = buildMessageOnlyActions(message);
    possible_actions.push(...msg.actions);
    for (const signal of msg.signals) {
      uniquePush(secondary_reason_signals, signal);
    }
  }

  const intent =
    message ||
    (isMeetingLike(text)
      ? "업무 일정 대응"
      : isGymLike(text)
        ? "운동 세션 준비"
        : isMorning
          ? "출근 및 하루 시작"
          : "상황 파악");

  const time_sensitivity: TimeSensitivity = inferTimeSensitivity(minutes);
  const location_relevance: LocationRelevance = inferLocationRelevance(
    place,
    input.signals?.proximity,
  );

  if (time_sensitivity === "high") {
    uniquePush(secondary_reason_signals, "urgency");
  }

  return {
    intent,
    context: {
      type: contextType,
      entities: entities.slice(0, 8),
      time_sensitivity,
      location_relevance,
    },
    possible_actions,
    secondary_reason_signals,
  };
}
