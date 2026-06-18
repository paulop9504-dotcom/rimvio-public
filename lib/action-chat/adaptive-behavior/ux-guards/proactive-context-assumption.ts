import { classifyAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";

const PLACE_FRAGMENT =
  /(?:감(?:\s*$|\s*요)?|간(?:다|까)?|가(?:\s*$|자)?|들(?:렀|를)?)/iu;

const PLACE_NAME =
  /(?:성수(?:동)?|강남|홍대|이태원|연남|을지로|잠실|판교|분당|해운대|제주|부산|대구|광주|대전|수원|인천|동네|역\s*근처)/iu;

const TIME_FRAGMENT =
  /(?:주말|이따(?:가)?|오늘\s*저녁|내일|토요일|일요일|금요일|점심(?:때)?|저녁(?:때)?|브런치\s*타임)/iu;

function isDomainSparse(message: string): boolean {
  return !/(?:맛집|카페|쇼핑|일정|약속|회의|운동|영화)/iu.test(message);
}

/** L1 place/time fragment → proactive A/B/C instead of blank "뭐 하실 건가요?" */
export function buildProactiveContextAssumption(
  message: string,
  referenceDate?: string
): string | null {
  const trimmed = message.trim();
  const abstraction = classifyAbstractionLevel(trimmed);
  if (abstraction.level === "L3" || abstraction.level === "L4") {
    return null;
  }

  if (!isDomainSparse(trimmed)) {
    return null;
  }

  const hasPlace = PLACE_NAME.test(trimmed);
  const hasTime = TIME_FRAGMENT.test(trimmed);
  if (!hasPlace && !hasTime) {
    return null;
  }

  const placeMatch = trimmed.match(PLACE_NAME);
  const place = placeMatch?.[0] ?? "그쪽";
  const hour = referenceDate ? new Date(referenceDate).getHours() : new Date().getHours();
  const evening = /(?:저녁|금요일|토요일)/iu.test(trimmed) || hour >= 17;

  if (evening || /(?:저녁|술|밤)/iu.test(trimmed)) {
    return formatTikiTakaReply({
      summary: `${place} 가실 때 **저녁 타임**으로 보여요.`,
      choices: [
        { label: "A", text: "저녁 식당" },
        { label: "B", text: "가벼운 술·바" },
        { label: "C", text: "예쁜 카페·디저트" },
      ],
      closing: "어느 쪽이 더 끌려요?",
    });
  }

  if (/주말/u.test(trimmed)) {
    return formatTikiTakaReply({
      summary: `**주말 ${place}** 일정으로 보여요.`,
      choices: [
        { label: "A", text: "맛집·브런치" },
        { label: "B", text: "카페·산책" },
        { label: "C", text: "쇼핑·구경" },
      ],
      closing: "무엇부터 잡을까요?",
    });
  }

  return formatTikiTakaReply({
    summary: `${place} **잠깐 들르는** 느낌으로 보여요.`,
    choices: [
      { label: "A", text: "식사·카페" },
      { label: "B", text: "구경·쇼핑" },
      { label: "C", text: "약속·일정 잡기" },
    ],
    closing: "어느 쪽에 가까워요?",
  });
}

function formatTikiTakaReply(input: {
  summary: string;
  choices: { label: string; text: string }[];
  closing: string;
}): string {
  const lines = input.choices.map((choice, index) => {
    const letter = String.fromCharCode(65 + index);
    return `${letter}) ${choice.text}`;
  });
  return [input.summary, "", ...lines, "", `👉 ${input.closing}`].join("\n");
}
