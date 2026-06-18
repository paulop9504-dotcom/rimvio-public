import type { ExperienceChoiceWire } from "@/lib/experience/types";
import {
  inferExperienceMode,
  isEfficiencyTrapInSocialContext,
} from "@/lib/experience/infer-experience-mode";

function defaultIceCreamChoice(message: string): ExperienceChoiceWire {
  const atView = /바로\s*아래|바다|노을|뷰|경치|해변/u.test(message);

  return {
    mode: "MEMORY",
    action: "ASK_CHOICE",
    headline: atView
      ? "여기서 먹는 경험이 더 남을 수 있어요."
      : "지금은 ‘싸게’보다 ‘함께’가 먼저일 수 있어요.",
    empathy_line:
      "친구들은 비용보다 그 자리의 추억을 더 원할 수 있어요. 바로 결정하기보다 한 번 물어보는 게 좋아요.",
    context_hint: "Nexus · MEMORY",
    options: [
      {
        label: "여기서 경치 보며 먹기",
        prompt: "여기 바로 아래에서 아이스크림 먹자고 친구들한테 말해줘",
        lens: "memory",
      },
      {
        label: "편의점 대안 제안",
        prompt: "편의점 말고 근처 분위기 좋은 곳에서 아이스크림 먹을까?",
        lens: "memory",
      },
      {
        label: "친구들한테 물어보기",
        prompt: "아이스크림 여기서 먹을지 편의점 갈지 친구들한테 물어보는 말 만들어줘",
        lens: "ask_group",
      },
    ],
  };
}

function genericSocialChoice(message: string): ExperienceChoiceWire {
  return {
    mode: inferExperienceMode(message),
    action: "ASK_CHOICE",
    headline: "지금은 효율보다 분위기를 먼저 맞춰볼까요?",
    empathy_line:
      "답을 대신 정해주기보다, 함께 고르는 쪽이 관계에 더 좋을 수 있어요.",
    context_hint: "Nexus · MEMORY",
    options: [
      {
        label: "분위기·뷰 우선",
        prompt: "친구들이랑 분위기 좋은 곳 추천해줘",
        lens: "memory",
      },
      {
        label: "친구들에게 물어보기",
        prompt: "친구들한테 어떻게 할지 물어보는 말 자연스럽게 만들어줘",
        lens: "ask_group",
      },
      {
        label: "가성비도 비교",
        prompt: "분위기 좋은 곳이랑 가성비 좋은 곳 둘 다 비교해줘",
        lens: "efficiency",
      },
    ],
  };
}

export function compileExperienceChoiceWire(message: string): ExperienceChoiceWire | null {
  if (!isEfficiencyTrapInSocialContext(message)) {
    return null;
  }

  if (/아이스크림|간식|디저트/u.test(message)) {
    return defaultIceCreamChoice(message);
  }

  return genericSocialChoice(message);
}
