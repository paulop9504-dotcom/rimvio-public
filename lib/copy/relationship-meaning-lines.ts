import type { RelationshipMeaningFrame } from "@/lib/meaning/relationship-meaning-types";

export const RELATIONSHIP_MEANING_LINES: Record<
  RelationshipMeaningFrame,
  readonly string[]
> = {
  repetition: [
    "특별한 하루보다, 반복된 순간들이 이 관계를 만들었어요.",
    "큰 하루보다, 자주 겹친 날들이 쌓인 관계예요.",
    "한 번의 이벤트보다, 꾸준히 함께한 시간이 더 많아요.",
  ],
  emergence: [
    "우연처럼 시작됐지만, 점점 더 자주 만나게 된 사람이에요.",
    "처음은 뜻밖이었는데, 지금은 자연스럽게 함께하는 사람이에요.",
    "가끔이던 만남이, 시간이 지나며 익숙한 리듬이 됐어요.",
  ],
  dormancy: [
    "한동안 떠올리지 않았지만, 당신의 기록 곳곳에 남아 있는 사람이에요.",
    "오래 만나지 않았지만, 함께한 맥락은 그대로 남아 있어요.",
    "잠시 멀어졌지만, 당신의 삶 기록 속에는 여전히 함께해요.",
  ],
  spread: [
    "한곳이 아니라, 여러 장소에 함께 남아 있는 사람이에요.",
    "당신의 지도 위 여러 곳에 함께한 흔적이 있어요.",
    "같은 장소만이 아니라, 여러 맥락에 걸쳐 함께해 왔어요.",
  ],
};

function stableTemplateIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

export function pickRelationshipMeaningLine(input: {
  frame: RelationshipMeaningFrame;
  peerDisplayName: string;
}): string {
  const variants = RELATIONSHIP_MEANING_LINES[input.frame];
  const index = stableTemplateIndex(
    `${input.frame}:${input.peerDisplayName}`,
    variants.length,
  );
  return variants[index] ?? variants[0]!;
}
