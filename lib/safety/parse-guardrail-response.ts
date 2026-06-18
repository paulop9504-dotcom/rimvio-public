import type {
  GuardrailActionType,
  GuardrailOption,
  GuardrailWire,
  EventCriticality,
} from "@/lib/safety/types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptions(value: unknown, fallback: GuardrailOption[]): GuardrailOption[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const options = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const label = asString(row.label);
      const action = asString(row.action);
      if (!label || !action) {
        return null;
      }
      return { label, action };
    })
    .filter((entry): entry is GuardrailOption => Boolean(entry))
    .slice(0, 4);

  return options.length ? options : fallback;
}

function parseMitigationAsOptions(value: unknown): GuardrailOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asString(entry))
    .filter(Boolean)
    .slice(0, 4)
    .map((label, index) => ({
      label: label.replace(/^대안\s*\d+:\s*/u, ""),
      action: index === 0 ? "POSTPONE" : "VERIFY_FIRST",
    }));
}

export function parseGuardrailResponse(
  raw: string,
  fallback: Omit<GuardrailWire, "decision">
): GuardrailWire | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const message = asString(parsed.message_to_user);
    const optionFallback = fallback.options;
    const fromOptions = parseOptions(parsed.options, optionFallback);
    const fromMitigation =
      fromOptions.length >= 2
        ? fromOptions
        : parseMitigationAsOptions(parsed.mitigation_plan);

    if (!message) {
      return null;
    }

    return {
      decision: "NEGOTIATE_WITH_EMPATHY",
      message_to_user: message,
      options: fromOptions.length >= 2 ? fromOptions : fromMitigation.length ? fromMitigation : optionFallback,
      risk_score:
        typeof parsed.risk_score === "number" ? parsed.risk_score : fallback.risk_score,
      action: fallback.action,
      event_criticality: fallback.event_criticality,
    };
  } catch {
    return null;
  }
}

function partnerOptionsForAction(
  action: GuardrailActionType,
  eventTitle: string
): GuardrailOption[] {
  if (action === "CANCEL") {
    return [
      {
        label: `"${eventTitle}" 1시간 뒤로 미루기`,
        action: "UPDATE_CALENDAR",
      },
      {
        label: "취소는 하되, 정중한 사유 메일 초안 쓰기",
        action: "DRAFT_EMAIL",
      },
    ];
  }

  if (action === "TRANSFER_FUNDS") {
    return [
      { label: "받는 사람·금액 한 번 더 확인하기", action: "VERIFY_FIRST" },
      { label: "송금 대신 알림만 예약해 두기", action: "POSTPONE" },
    ];
  }

  if (action === "DELETE") {
    return [
      { label: "삭제 대신 보관함으로 옮기기", action: "KEEP_AND_NOTIFY" },
      { label: "영향 범위 먼저 확인하기", action: "VERIFY_FIRST" },
    ];
  }

  if (action === "BLOCK") {
    return [
      { label: "차단 대신 알림만 끄기", action: "POSTPONE" },
      { label: "상대방에게 정중히 거절 메시지 보내기", action: "DRAFT_EMAIL" },
    ];
  }

  return [
    { label: "잠시 미루고 다시 검토하기", action: "POSTPONE" },
    { label: "영향 범위 먼저 확인하기", action: "VERIFY_FIRST" },
  ];
}

function partnerMessageForAction(input: {
  action: GuardrailActionType;
  eventTitle: string;
  regret: string;
}): string {
  const opener =
    input.action === "CANCEL"
      ? "많이 당황스러우시죠? 일정이 꼬이면 저도 마음이 써요."
      : input.action === "TRANSFER_FUNDS"
        ? "송금은 한 번 누르면 되돌리기 어려워서, 저도 신중해지게 돼요."
        : input.action === "DELETE"
          ? "정리하고 싶은 마음 충분히 이해해요. 다만 한 번 지우면 아쉬울 수 있어요."
          : "결정하기 애매한 순간이시군요. 저도 함께 천천히 정리해 볼게요.";

  return `${opener} "${input.eventTitle}" 관련해서 ${input.regret} 우리가 손해 보지 않으면서도 원하시는 방향으로 가는 방법이 있어요. 어떠세요?`;
}

export function buildRuleBasedGuardrailWire(input: {
  action: GuardrailActionType;
  actionDescription: string;
  riskScore: number;
  eventCriticality: EventCriticality;
  eventTitle?: string;
}): GuardrailWire {
  const eventTitle = input.eventTitle ?? input.actionDescription.slice(0, 32);

  const regret =
    input.action === "TRANSFER_FUNDS"
      ? "잘못 보내면 돈을 되찾기 어려울 수 있어요."
      : input.action === "DELETE"
        ? "삭제하면 다시 찾기 어려울 수 있어요."
        : input.action === "CANCEL"
          ? "지금 바로 취소하면 신뢰나 기회를 잃을 수도 있어요."
          : "지금 처리하면 되돌리기 어려울 수 있어요.";

  return {
    decision: "NEGOTIATE_WITH_EMPATHY",
    message_to_user: partnerMessageForAction({
      action: input.action,
      eventTitle,
      regret,
    }),
    options: partnerOptionsForAction(input.action, eventTitle),
    risk_score: input.riskScore,
    action: input.action,
    event_criticality: input.eventCriticality,
  };
}
