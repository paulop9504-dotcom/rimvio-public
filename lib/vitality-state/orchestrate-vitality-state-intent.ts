import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { orchestrateScheduleAdvisory } from "@/lib/schedule/orchestrate-schedule-advisory";
import { scoreDailyProductivity } from "@/lib/goal-roadmap/orchestrate-goal-alignment";
import type { ExperienceChoiceWire } from "@/lib/experience/types";
import type { LinkActionItem } from "@/types/database";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import {
  classifyVitalityStateWithLlm,
} from "@/lib/vitality-state/classify-vitality-state-llm";
import type { VitalityStateMatch, VitalityStateProtocol } from "@/lib/vitality-state/vitality-state-types";

function choiceActions(wire: ExperienceChoiceWire): LinkActionItem[] {
  return wire.options.map((option, index) => ({
    id: `vitality-choice-${index}`,
    label: option.label,
    kind: "custom",
    payload: {
      experienceChoice: true,
      experienceChoicePrompt: option.prompt,
      experienceLens: option.lens,
    },
  }));
}

function choiceResult(
  wire: ExperienceChoiceWire,
  match: VitalityStateMatch
): OrchestratorResult {
  return {
    summary: wire.headline,
    actions: choiceActions(wire),
    source: "rules",
    confidence: match.confidence,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    experienceChoice: wire,
    presentation: { mode: "EXPERIENCE_CHOICE" },
    thought: `VitalityState · ${match.kind} · ${match.vitality} · ${match.protocol}`,
  };
}

function buildChoiceWire(
  match: VitalityStateMatch,
  protocol: VitalityStateProtocol
): ExperienceChoiceWire {
  const hint = `${match.vitality} · ${match.label}`;

  switch (protocol) {
    case "haven_schedule_relief":
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "많이 지치셨겠어요. 오늘 일정을 조금 비울까요?",
        empathy_line: "쉬는 것도 계획의 일부예요. Apex 일정을 잠시 미뤄도 괜찮아요.",
        context_hint: hint,
        options: [
          {
            label: "오늘 일정 줄이기",
            prompt: "오늘 일정 중 덜 중요한 걸 찾아서 쉬는 시간 만들어줘",
            lens: "efficiency",
          },
          {
            label: "Haven 모드로 전환",
            prompt: "오늘은 Haven 모드로 쉬면서 할 수 있는 가벼운 것만 추천해줘",
            lens: "memory",
          },
          {
            label: "30분만 쉬기",
            prompt: "30분 휴식 타이머 잡아줘",
            lens: "efficiency",
          },
        ],
      };
    case "sentinel_pause":
      return {
        mode: "EFFICIENCY",
        action: "ASK_CHOICE",
        headline: "지금은 꼭 필요한 것만 남겨볼까요?",
        empathy_line: "Sentinel 모드 — 급하지 않은 건 잠시 멈춰도 돼요.",
        context_hint: hint,
        options: [
          {
            label: "긴급만 남기기",
            prompt: "오늘 일정에서 지금 당장 꼭 필요한 것만 골라줘",
            lens: "efficiency",
          },
          {
            label: "15분 멈춤",
            prompt: "15분간 알림 끄고 쉬는 타이머 잡아줘",
            lens: "efficiency",
          },
          {
            label: "내일로 미루기",
            prompt: "오늘 일정 중 내일로 미룰 수 있는 것 정리해줘",
            lens: "efficiency",
          },
        ],
      };
    case "apex_golden_path":
      return {
        mode: "EFFICIENCY",
        action: "ASK_CHOICE",
        headline: "뭐부터 할지 같이 정리해볼까요?",
        empathy_line: "Golden Path — 목표에 맞게 우선순위부터 잡을게요.",
        context_hint: hint,
        options: [
          {
            label: "오늘 Top 3",
            prompt: "오늘 꼭 해야 할 일 Top 3 우선순위로 정리해줘",
            lens: "efficiency",
          },
          {
            label: "생산성 점수 보기",
            prompt: "오늘 생산성 점수랑 Apex 블록 어떤지 알려줘",
            lens: "efficiency",
          },
          {
            label: "작은 것부터",
            prompt: "5분 안에 끝낼 수 있는 일부터 추천해줘",
            lens: "efficiency",
          },
        ],
      };
    case "nexus_connect":
      return {
        mode: "MEMORY",
        action: "ASK_CHOICE",
        headline: "누군가와 연결되면 좋을 것 같아요.",
        empathy_line: "Nexus — 관계가 지금 필요한 순간일 수 있어요.",
        context_hint: hint,
        options: [
          {
            label: "연락할 사람 추천",
            prompt: "최근에 연락 안 한 친구 중에 지금 연락하면 좋을 사람 추천해줘",
            lens: "memory",
          },
          {
            label: "만남 제안 문구",
            prompt: "친구한테 가볍게 만나자고 연락하는 말 만들어줘",
            lens: "ask_group",
          },
          {
            label: "같이 할 활동",
            prompt: "친구랑 같이하기 좋은 가벼운 활동 추천해줘",
            lens: "memory",
          },
        ],
      };
    case "sentinel_conflict_resolve":
      return {
        mode: "EFFICIENCY",
        action: "ASK_CHOICE",
        headline: "시간이 빠듯해 보여요. 일정부터 정리할까요?",
        empathy_line: "겹치는 일정을 찾아서 가장 덜 아픈 쪽으로 조정해볼게요.",
        context_hint: hint,
        options: [
          {
            label: "일정 충돌 확인",
            prompt: "오늘 일정 겹치는 거 있어? 뭐를 옮기는 게 나을지 봐줘",
            lens: "efficiency",
          },
          {
            label: "급한 것만",
            prompt: "지금 당장 꼭 해야 하는 것만 알려줘",
            lens: "efficiency",
          },
          {
            label: "이동 시간 계산",
            prompt: "다음 약속까지 시간 충분한지 봐줘",
            lens: "efficiency",
          },
        ],
      };
    case "haven_activity_suggest":
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "심심하시군요. 가볍게 뭐라도 해볼까요?",
        empathy_line: "Haven — 재충전이나 로드맵 보조 활동도 좋아요.",
        context_hint: hint,
        options: [
          {
            label: "근처 산책·카페",
            prompt: "근처에서 가볍게 시간 보낼 만한 곳 추천해줘",
            lens: "memory",
          },
          {
            label: "취미·공부 20분",
            prompt: "20분짜리 취미나 공부 추천해줘",
            lens: "efficiency",
          },
          {
            label: "재미있는 영상·글",
            prompt: "지금 볼 만한 가벼운 콘텐츠 추천해줘",
            lens: "memory",
          },
        ],
      };
    case "haven_hydrate":
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "물 한 잔 마시면 좋겠어요.",
        empathy_line: "작은 것부터 챙겨볼까요?",
        context_hint: hint,
        options: [
          {
            label: "물 마시기 알림",
            prompt: "10분 뒤에 물 마시라고 알림 잡아줘",
            lens: "efficiency",
          },
          {
            label: "근처 카페",
            prompt: "근처 카페 추천해줘",
            lens: "memory",
          },
        ],
      };
    case "haven_rest":
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "잠깐 쉬어도 괜찮아요.",
        empathy_line: "Haven — 휴식도 오늘의 일정이에요.",
        context_hint: hint,
        options: [
          {
            label: "20분 낮잠 타이머",
            prompt: "20분 낮잠 타이머 잡아줘",
            lens: "efficiency",
          },
          {
            label: "오늘 일정 줄이기",
            prompt: "오늘 일정 중 미룰 수 있는 것 찾아줘",
            lens: "efficiency",
          },
        ],
      };
    case "sentinel_calm":
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "지금 마음이 많이 불안하시군요.",
        empathy_line: "급한 결정은 잠시 미루고, 숨 고를 공간부터 만들어볼까요?",
        context_hint: hint,
        options: [
          {
            label: "5분 호흡 타이머",
            prompt: "5분 호흡 타이머 잡아줘",
            lens: "efficiency",
          },
          {
            label: "걱정 정리",
            prompt: "지금 걱정되는 것들 목록으로 정리해줘",
            lens: "efficiency",
          },
        ],
      };
    case "state_router":
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "지금 상태에 맞게 도와드릴게요.",
        empathy_line: "원하시는 방향을 골라 주세요.",
        context_hint: hint,
        options: [
          {
            label: "먹을 거 추천",
            prompt: "지금 먹기 좋은 곳 추천해줘",
            lens: "efficiency",
          },
          {
            label: "쉬고 싶어",
            prompt: "오늘 일정 줄이고 쉬는 시간 만들어줘",
            lens: "efficiency",
          },
          {
            label: "뭐부터 할지",
            prompt: "오늘 꼭 해야 할 일 우선순위 정리해줘",
            lens: "efficiency",
          },
          {
            label: "연락하고 싶어",
            prompt: "연락하면 좋을 사람 추천해줘",
            lens: "memory",
          },
        ],
      };
    default:
      return {
        mode: "BALANCED",
        action: "ASK_CHOICE",
        headline: "어떻게 도와드릴까요?",
        context_hint: hint,
        options: [],
      };
  }
}

async function orchestrateHunger(
  message: string,
  match: VitalityStateMatch
): Promise<OrchestratorResult> {
  const discovery = await orchestratePlaceRecommendation("근처 맛집 추천해줘");
  if (discovery?.cafeDiscovery || (discovery?.actions?.length ?? 0) > 0) {
    return {
      ...discovery,
      summary: "배고프시군요. 근처에서 골라볼게요.",
      thought: `VitalityState · hunger · Haven · food_discovery · ${discovery.thought ?? ""}`,
    };
  }

  return choiceResult(
    {
      mode: "BALANCED",
      action: "ASK_CHOICE",
      headline: "배고프시군요. 뭐 드실지 같이 골라볼까요?",
      empathy_line: "장소 확인 없이 바로 추천해 드릴게요.",
      context_hint: "Haven · 배고픔",
      options: [
        {
          label: "근처 맛집",
          prompt: "지금 근처 맛집 추천해줘",
          lens: "efficiency",
        },
        {
          label: "가볍게",
          prompt: "가볍게 먹을 만한 곳 추천해줘",
          lens: "memory",
        },
        {
          label: "배달·포장",
          prompt: "배달이나 포장 괜찮은 메뉴 추천해줘",
          lens: "efficiency",
        },
      ],
    },
    match
  );
}

/**
 * State utterances (배고파, 피곤해, …) → Vitality intent → choice / discovery.
 * Runs before place-confirm gate.
 */
export async function orchestrateVitalityStateIntent(input: {
  message: string;
  existingSchedule?: ExistingScheduleInput;
  referenceDate?: string;
  /** Skip LLM when Global Brain already classified this turn. */
  preclassified?: VitalityStateMatch | null;
}): Promise<OrchestratorResult | null> {
  const match =
    input.preclassified ?? (await classifyVitalityStateWithLlm(input.message));
  if (!match) {
    return null;
  }

  if (match.protocol === "food_discovery") {
    return orchestrateHunger(input.message, match);
  }

  if (match.protocol === "sentinel_conflict_resolve") {
    const advisory = orchestrateScheduleAdvisory({
      message: "오늘 일정 겹치는 거 있어? 시간 없어",
      existingSchedule: input.existingSchedule,
    });
    if (advisory) {
      return {
        ...advisory,
        summary: "시간이 빠듯해 보여요. " + advisory.summary,
        thought: `VitalityState · ${match.kind} · ${match.vitality} · ${match.protocol}`,
      };
    }
  }

  if (match.protocol === "apex_golden_path" && input.referenceDate) {
    const productivity = scoreDailyProductivity({
      context: {
        referenceDate: input.referenceDate,
        reminders: [],
        goals: [],
      },
    });
    if (productivity.score !== undefined) {
      return {
        summary: `뭐부터 할지 같이 정리해볼까요? ${productivity.summary}`,
        actions: productivity.suggestions.slice(0, 2).map((text, index) => ({
          id: `golden-path-${index}`,
          label: text.slice(0, 28),
          kind: "custom" as const,
          payload: { experienceChoicePrompt: text },
        })),
        source: "rules",
        confidence: match.confidence,
        disclosure: "high",
        actionsRevealed: true,
        pendingConfirm: false,
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
        thought: `VitalityState · ${match.kind} · ${match.vitality} · ${match.protocol}`,
      };
    }
  }

  return choiceResult(buildChoiceWire(match, match.protocol), match);
}
