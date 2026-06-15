import type {
  MorningBriefingWire,
  MorningContextBundle,
  MorningPriorityAction,
  MorningProviderSnapshot,
  MorningToneMode,
} from "@/lib/morning-orchestrator/types";
import { selectTopMorningProviders } from "@/lib/morning-orchestrator/resolve-morning-context";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parsePriorityActions(value: unknown): MorningPriorityAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const category = asString(row.category);
      const content = asString(row.content);
      const action_label = asString(row.action_label);
      if (!content || !action_label) {
        return null;
      }
      return {
        category: category || "일반",
        content,
        action_label,
        action_type: asString(row.action_type) || undefined,
      };
    })
    .filter((entry): entry is MorningPriorityAction => Boolean(entry))
    .slice(0, 3);
}

export function parseMorningBriefingResponse(
  raw: string,
  fallback: MorningBriefingWire
): MorningBriefingWire | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const greeting = asString(parsed.greeting);
    const insightRaw = parsed.daily_insight;
    const encouragement = asString(parsed.encouragement);
    const actions = parsePriorityActions(parsed.priority_actions);

    let daily_insight = fallback.daily_insight;
    if (insightRaw && typeof insightRaw === "object") {
      const insight = insightRaw as Record<string, unknown>;
      const summary = asString(insight.summary);
      const reason = asString(insight.reason);
      if (summary && reason) {
        daily_insight = { summary, reason };
      }
    }

    if (!greeting || actions.length === 0) {
      return null;
    }

    return {
      tone: fallback.tone,
      greeting,
      daily_insight,
      priority_actions: actions,
      encouragement: encouragement || fallback.encouragement,
      selected_providers: fallback.selected_providers,
    };
  } catch {
    return null;
  }
}

function providerToAction(provider: MorningProviderSnapshot): MorningPriorityAction {
  const categoryMap: Record<string, string> = {
    weather: "기상",
    health: "건강",
    finance: "금융",
    shadow_inbox: "인박스",
    habits: "습관",
    device: "디바이스",
  };

  return {
    category: categoryMap[provider.id] ?? "일반",
    content: provider.detail ? `${provider.summary} ${provider.detail}` : provider.summary,
    action_label: provider.suggested_action ?? "자세히 보기",
    action_type: provider.id.toUpperCase(),
  };
}

function partnerGreeting(hour: number): string {
  if (hour < 10) {
    return "좋은 아침이에요. 오늘 하루, 함께 가볍게 정리해 볼게요.";
  }
  return "오늘 흐름을 한번에 정리해 드릴게요.";
}

function jarvisGreeting(hour: number): string {
  if (hour < 10) {
    return "아침 브리핑을 준비했습니다. 핵심 3건을 보고합니다.";
  }
  return "현재 상태를 집계했습니다. 우선순위 3건입니다.";
}

function synergizeReason(providers: MorningProviderSnapshot[]): string {
  const ids = providers.map((provider) => provider.id);
  if (ids.includes("health") && ids.includes("shadow_inbox")) {
    return "수면·컨디션과 인박스 부하가 겹쳐, 오전 집중력 관리가 필요합니다.";
  }
  if (ids.includes("weather") && ids.includes("device")) {
    return "기상 변화와 디바이스 상태를 함께 고려해 이동·준비 순서를 조정했습니다.";
  }
  if (ids.includes("finance")) {
    return "자산 변동 신호가 있어 오늘은 결정·확인이 필요한 날입니다.";
  }
  return "변동이 큰 신호 3개를 묶어 오늘의 우선순위를 정리했습니다.";
}

function partnerEncouragement(providers: MorningProviderSnapshot[]): string {
  const habit = providers.find((provider) => provider.id === "habits");
  if (habit) {
    return "작은 루틴 하나만 지켜도 오늘은 충분히 잘하고 있는 하루예요.";
  }
  return "오늘 필요한 것만 골라 처리하면, 하루가 훨씬 가벼워질 거예요.";
}

function jarvisEncouragement(): string {
  return "핵심 3건만 처리하면 오늘 운영 리스크는 낮아집니다.";
}

export function buildRuleBasedMorningBriefing(
  bundle: MorningContextBundle
): MorningBriefingWire {
  const top = selectTopMorningProviders(bundle.providers);
  const hour = new Date(bundle.resolved_at).getHours();
  const tone = bundle.tone;
  const theme =
    top.some((provider) => provider.strength === "high")
      ? tone === "jarvis"
        ? "오늘은 선제 대응이 필요한 운영일"
        : "오늘은 집중과 선택이 필요한 날"
      : tone === "jarvis"
        ? "표준 운영일 — 이상 신호 낮음"
        : "오늘은 차분하게 밀어붙이기 좋은 날";

  return {
    tone,
    greeting: tone === "jarvis" ? jarvisGreeting(hour) : partnerGreeting(hour),
    daily_insight: {
      summary: theme,
      reason: synergizeReason(top),
    },
    priority_actions: top.map(providerToAction),
    encouragement:
      tone === "jarvis" ? jarvisEncouragement() : partnerEncouragement(top),
    selected_providers: top.map((provider) => provider.id),
  };
}

export function formatMorningBriefingText(wire: MorningBriefingWire): string {
  const actions = wire.priority_actions
    .map(
      (action, index) =>
        `${index + 1}. [${action.category}] ${action.content}\n   → ${action.action_label}`
    )
    .join("\n");

  const opener =
    wire.tone === "jarvis"
      ? [wire.greeting, "", `테마: ${wire.daily_insight.summary}`, wire.daily_insight.reason]
      : [
          wire.greeting,
          "",
          `💡 ${wire.daily_insight.summary}`,
          wire.daily_insight.reason,
        ];

  return [...opener, "", actions, "", wire.encouragement].join("\n");
}
