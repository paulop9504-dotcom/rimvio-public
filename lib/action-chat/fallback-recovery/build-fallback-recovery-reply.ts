import { inferFallbackRecovery } from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
import type { FallbackRecoveryInference } from "@/lib/action-chat/fallback-recovery/types";

function formatRecoveryReply(input: {
  opener: string;
  choices: string[];
  closing: string;
}): string {
  const lines = input.choices.map((text, index) => {
    const letter = String.fromCharCode(65 + index);
    return `${letter}) ${text}`;
  });
  return [input.opener, "", ...lines, "", `👉 ${input.closing}`].join("\n");
}

function careerRecovery(inference: FallbackRecoveryInference): string {
  const role = inference.roleHint ?? "그 분야";
  if (role === "의사") {
    return [
      "의사가 되고 싶은 거면 **진로 준비** 쪽 이야기일 가능성이 커요.",
      "지금은 **공부·시험 방향**이 궁금한 걸까요, 아니면 **현실적인 준비 방법**이 궁금한 걸까요?",
      "",
      "A) 공부·시험 로드맵",
      "B) 현실적인 준비 방법",
      "C) 마음·동기 정리",
      "",
      "👉 어느 쪽부터 이야기 나눠볼까요?",
    ].join("\n");
  }

  return formatRecoveryReply({
    opener: `${role} **진로·커리어 준비** 이야기로 이해했어요.`,
    choices: [
      "자격·시험·교육 과정",
      "현실적인 준비 방법",
      "마음·동기 정리",
    ],
    closing: "어느 쪽부터 이야기 나눠볼까요?",
  });
}

function educationRecovery(): string {
  return formatRecoveryReply({
    opener: "**공부·시험 준비** 쪽으로 이해했어요.",
    choices: ["지금 당장 시작할 것", "중장기 계획", "방법·자료 추천"],
    closing: "어디부터 정리해볼까요?",
  });
}

function counselingRecovery(): string {
  return [
    "지금은 **결정보다 마음 정리**가 먼저일 수 있어요.",
    "무겁게 느껴지는 이유가 **일·공부** 쪽인지, **사람·관계** 쪽인지, 아니면 **전반적인 지침**인지 알려주셔도 괜찮아요.",
    "",
    "👉 편한 쪽부터 말씀해 주세요.",
  ].join("\n");
}

function mealRecovery(): string {
  return formatRecoveryReply({
    opener: "**뭐 먹을지** 고르는 쪽으로 보여요.",
    choices: ["빠르게 한 끼", "맛·분위기 중심", "가볍게"],
    closing: "오늘은 어느 쪽이 더 끌려요?",
  });
}

function scheduleRecovery(): string {
  return formatRecoveryReply({
    opener: "**일정·약속** 쪽으로 이해했어요.",
    choices: ["시간부터 잡기", "장소·이동까지 묶기", "겹치는 일정 정리"],
    closing: "어디부터 손대볼까요?",
  });
}

function decisionRecovery(): string {
  return formatRecoveryReply({
    opener: "**선택을 정리**하는 쪽으로 보여요.",
    choices: ["가성비·실용", "경험·분위기", "지금 당장 필요한 정도"],
    closing: "어느 기준이 더 중요해요?",
  });
}

function explorationRecovery(message: string): string {
  const snippet = message.trim().slice(0, 24) || "말씀하신 내용";
  return formatRecoveryReply({
    opener: `**"${snippet}"** 쪽으로 이해했는데, 조금만 더 좁혀볼게요.`,
    choices: ["정보·설명이 필요", "선택·결정이 필요", "바로 실행·검색"],
    closing: "어느 쪽에 더 가까워요?",
  });
}

/** Natural Korean recovery — never generic error copy. */
export function buildFallbackRecoveryReply(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return formatRecoveryReply({
      opener: "말씀하신 내용을 **조금만 더** 구체화하면 바로 이어갈게요.",
      choices: ["맛집·식사", "일정·약속", "고민·선택"],
      closing: "어느 쪽부터 볼까요?",
    });
  }

  const inference = inferFallbackRecovery(trimmed);

  switch (inference.primary) {
    case "career_planning":
      return careerRecovery(inference);
    case "education_planning":
      return educationRecovery();
    case "counseling":
      return counselingRecovery();
    case "meal_decision":
      return mealRecovery();
    case "schedule_planning":
      return scheduleRecovery();
    case "general_decision":
      return decisionRecovery();
    default:
      return explorationRecovery(trimmed);
  }
}
