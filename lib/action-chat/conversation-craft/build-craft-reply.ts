import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";
import type { ConversationCraftFlags, CraftTechniqueId } from "@/lib/action-chat/conversation-craft/types";

type TikiChoice = { label: string; text: string };

function formatTiki(input: { summary: string; choices: TikiChoice[]; closing: string }): string {
  const lines = input.choices.map((_, i) => `${String.fromCharCode(65 + i)}) ${input.choices[i].text}`);
  return [input.summary, "", ...lines, "", `👉 ${input.closing}`].join("\n");
}

function applyAnchoring(choices: TikiChoice[]): TikiChoice[] {
  if (choices.length < 3) return choices;
  return [
    { label: "A", text: choices[0].text.includes("프리미엄") ? choices[0].text : `${choices[0].text} (인기·예약)` },
    { label: "B", text: choices[1].text },
    { label: "C", text: choices[2].text },
  ];
}

function mealAlternativeChoice(message: string): string {
  const weatherish = /(?:비|추|더|더워|추워|같은\s*날씨)/iu.test(message);
  const opener = weatherish
    ? "오늘 같은 날씨엔 **국물** 쪽이 당기지 않나요?"
    : "지금은 **뭐 먹을지** 좁혀볼게요.";

  const choices = applyAnchoring([
    { label: "A", text: "프리미엄·예약 어려운 핫플 (앵커)" },
    { label: "B", text: "가성비·당장 갈 수 있는 식당" },
    { label: "C", text: "가볍게 (샐러드·샌드·브런치)" },
  ]);

  return formatTiki({
    summary: opener,
    choices,
    closing: "국물·가벼운 쪽 중 어디가 더 끌려요?",
  });
}

function assumptiveClose(message: string, craft: ConversationCraftFlags): string {
  if (/(?:부산|제주|여행)/iu.test(message)) {
    return formatTiki({
      summary: "**이번 주말 여행**으로 잡고 갈게요.",
      choices: [
        { label: "A", text: "숙소부터 훑기" },
        { label: "B", text: "교통편 먼저 잡기" },
        { label: "C", text: "일정·맛집 묶어서 보기" },
      ],
      closing: "어디부터 손대볼까요?",
    });
  }
  if (craft.scheduleAnchor) {
    return formatTiki({
      summary: `**${craft.scheduleAnchor}** 일정은 이미 잡혀 있는 느낌이에요.`,
      choices: [
        { label: "A", text: "전후 이동·버퍼만 정리" },
        { label: "B", text: "근처 식사·카페까지 묶기" },
        { label: "C", text: "일정 시간만 미세 조정" },
      ],
      closing: "어느 쪽부터 맞출까요?",
    });
  }
  return formatTiki({
    summary: "말씀하신 흐름 **그대로 진행**할게요.",
    choices: [
      { label: "A", text: "시간·장소부터 확정" },
      { label: "B", text: "옵션만 빠르게 비교" },
      { label: "C", text: "바로 검색·실행" },
    ],
    closing: "어디부터 이어갈까요?",
  });
}

function ifThenProbe(): string {
  return [
    "혹시 **거리가 10분 정도 더 멀어져도**, 웨이팅 없고 분위기 확실한 곳이면 그쪽으로 보여드릴까요?",
    "",
    "A) 네, 그 조건으로",
    "B) 아니, 거리는 지금 기준",
    "C) 다른 기준으로 다시",
    "",
    "👉 어느 쪽이 더 맞을까요?",
  ].join("\n");
}

function takeawayReply(): string {
  return [
    "리스트가 많아 보여요. **복잡하고 웨이팅 긴 핫플은 일단 빼고** 담백하게만 보여드릴까요?",
    "",
    "원하시면 핫플 한두 곳만 다시 끼워 넣을 수도 있어요.",
    "",
    "👉 일단 심플하게 갈까요, 아니면 핫플도 섞을까요?",
  ].join("\n");
}

function defaultAssumption(vitality: readonly string[]): string {
  if (vitality.includes("energy_depletion") || vitality.includes("sleepiness")) {
    return formatTiki({
      summary: "오늘은 **많이 피곤**해 보여요.",
      choices: [
        { label: "A", text: "배달 + 집에서 쉬기" },
        { label: "B", text: "근처 10분 거리만" },
        { label: "C", text: "일정 1개만 미루기" },
      ],
      closing: "이 중에 바로 잡을까요?",
    });
  }
  if (vitality.includes("hunger")) {
    return formatTiki({
      summary: "지금은 **배부터** 채우는 게 제일 빠를 것 같아요.",
      choices: [
        { label: "A", text: "국밥·분식 (빠르게)" },
        { label: "B", text: "가성비 한 끼" },
        { label: "C", text: "배달로 바로" },
      ],
      closing: "어느 쪽으로 갈까요?",
    });
  }
  return formatTiki({
    summary: "지금 컨디션 기준으로 **무난한 첫 선택**부터 잡아볼게요.",
    choices: [
      { label: "A", text: "가벼운 한 끼·카페" },
      { label: "B", text: "집에서 쉬기" },
      { label: "C", text: "일정만 정리" },
    ],
    closing: "어디부터 할까요?",
  });
}

function zeroStepReply(message: string, fingerprint: string): string {
  const place = message.match(/(?:성수(?:동)?|강남|홍대|연남|을지로)/iu)?.[0] ?? "그쪽";
  const pref =
    fingerprint === "quiet_value"
      ? "조용하고 가성비 좋은"
      : fingerprint === "value_first"
        ? "가성비 좋은"
        : "분위기 괜찮은";
  return [
    `${place} 가시는군요! 늘 좋아하시던 **${pref} 식당** 위주로 바로 추려볼게요.`,
    "",
    "👉 마음에 안 들면 한 마디만 더 알려주세요.",
  ].join("\n");
}

function crossDomainStitch(craft: ConversationCraftFlags): string {
  const anchor = craft.scheduleAnchor ?? "오늘 일정";
  return [
    `${anchor} 전후로 보니, **미팅 끝나고 피곤하실 타이밍** 같아요.`,
    "근처에서 **조용한 카페·가벼운 한 끼**까지 묶어볼까요?",
    "",
    "👉 식사부터 볼까요, 카페만 먼저 볼까요?",
  ].join("\n");
}

function contextualPivot(): string {
  return [
    "금요일 저녁엔 보통 **운동 루틴**이셨는데, 오늘은 **스트레스 지수**가 높아 보여요.",
    "오늘 하루 운동은 미루고, 근처에서 **가볍게 한잔 + 일찍 쉬기**로 리밸런싱 해볼까요?",
    "",
    "👉 운동 유지 / 오늘만 쉬기 중 어디가 더 맞을까요?",
  ].join("\n");
}

function madLibsReply(slots: NonNullable<ConversationCraftFlags["madLibs"]>): string {
  const time = slots.find((s) => s.id === "time")?.value ?? "이번 주말";
  const place = slots.find((s) => s.id === "place")?.value ?? "근처";
  const vibe = slots.find((s) => s.id === "vibe")?.value ?? "가벼운 브런치";
  return [
    `좋아요! **${time}**에 **${place}** 근처에서 **${vibe}** 어때요?`,
    "",
    "A) 이대로 검색",
    "B) 시간만 바꾸기",
    "C) 장소·무드 바꾸기",
    "",
    "👉 이대로 진행할까요?",
  ].join("\n");
}

function zeigarnikClosing(domain: "meal" | "schedule" | "generic"): string {
  switch (domain) {
    case "meal":
      return "일단 식당은 여기로 픽스할까요, 아니면 식사 후 카페까지 묶어볼까요?";
    case "schedule":
      return "일정만 잡을까요, 이동·식사까지 한 번에 묶어볼까요?";
    default:
      return "이 선택으로 확정할까요, 아니면 한 단계만 더 좁혀볼까요?";
  }
}

export function enhanceZeigarnikClosing(summary: string, message: string): string {
  if (!summary.includes("👉")) return summary;
  const domain = /(?:일정|약속|미팅)/iu.test(message)
    ? "schedule"
    : /(?:먹|맛집|식사|카페)/iu.test(message)
      ? "meal"
      : "generic";
  const closing = zeigarnikClosing(domain);
  return summary.replace(/👉[^\n]*$/u, `👉 ${closing}`);
}

/** Craft-aware offline Tiki — composes on top of base Tiki, does not replace UX guards. */
export function buildCraftTikiOfflineReply(
  message: string,
  category: AiIntentCategory,
  craft: ConversationCraftFlags,
  vitalityStates: readonly string[]
): string | null {
  const techniques = new Set<CraftTechniqueId>(craft.techniques);

  if (techniques.has("contextual_pivot")) return contextualPivot();
  if (techniques.has("cross_domain_stitch")) return crossDomainStitch(craft);
  if (techniques.has("zero_step") && craft.preferenceFingerprint) {
    return zeroStepReply(message, craft.preferenceFingerprint);
  }
  if (techniques.has("takeaway") && techniques.has("alternative_choice") === false) {
    return takeawayReply();
  }
  if (techniques.has("if_then_probe")) return ifThenProbe();
  if (techniques.has("assumptive_close")) return assumptiveClose(message, craft);
  if (techniques.has("mad_libs_slot") && craft.madLibs?.length) {
    return madLibsReply(craft.madLibs);
  }
  if (techniques.has("default_assumption") && vitalityStates.length) {
    return defaultAssumption(vitalityStates);
  }
  if (techniques.has("alternative_choice") && /(?:먹|맛집|배고|점심|저녁|뭐\s*먹)/iu.test(message)) {
    return mealAlternativeChoice(message);
  }

  if (techniques.has("anchoring") && category === "DECISION") {
    return formatTiki({
      summary: "지금은 **기준 하나만** 고르면 될 것 같아요.",
      choices: applyAnchoring([
        { label: "A", text: "프리미엄·브랜드 (앵커)" },
        { label: "B", text: "가성비·실용" },
        { label: "C", text: "지금 당장 필요한 정도" },
      ]),
      closing: "어느 기준이 더 중요해요?",
    });
  }

  return null;
}

export function applyCraftToReply(summary: string, craft: ConversationCraftFlags, message: string): string {
  let next = summary;
  if (craft.techniques.includes("zeigarnik_close") && next.includes("👉")) {
    next = enhanceZeigarnikClosing(next, message);
  }
  if (craft.techniques.includes("takeaway") && !next.includes("핫플")) {
    next = `${next}\n\n${takeawayReply()}`.trim();
  }
  return next;
}
