/** Rimvio / Context OS layer stack — read-model vocabulary only. */

export const RIMVIO_LAYER_STACK = [
  {
    id: "reality",
    order: 0,
    label: "Reality",
    labelKo: "현실",
    summary: "사람·장소·시간·행동·관계가 발생하는 층",
  },
  {
    id: "capture",
    order: 1,
    label: "Capture",
    labelKo: "수집",
    summary: "GPS·영상·채팅·일정 — 삶을 살면 쌓임",
  },
  {
    id: "context",
    order: 2,
    label: "Context Engine",
    labelKo: "맥락 엔진",
    summary: "궤적×공간×시간×미디어 → Experience Volume",
  },
  {
    id: "experience_graph",
    order: 3,
    label: "Experience Graph",
    labelKo: "경험 그래프",
    summary: "경험 노드·엣지 — 공간·시간·궤적 유사도",
  },
  {
    id: "life_graph",
    order: 4,
    label: "Life Graph",
    labelKo: "라이프 그래프",
    summary: "여행·가족·업무·취미가 같은 그래프",
  },
  {
    id: "shared_graph",
    order: 5,
    label: "Shared Graph",
    labelKo: "공유 그래프",
    summary: "집단 경험 볼륨 — 친구·가족 co-volume",
  },
  {
    id: "experience_feed",
    order: 6,
    label: "Experience Feed",
    labelKo: "경험 피드",
    summary: "시간축 탐색 — 유튜브처럼 경험을 스크롤",
  },
  {
    id: "context_ai",
    order: 7,
    label: "Context AI",
    labelKo: "맥락 AI",
    summary: "과거·현재 맥락 기반 추천·이어가기",
  },
  {
    id: "personal_os",
    order: 8,
    label: "Personal OS",
    labelKo: "개인 OS",
    summary: "일정·행동·목표·관계·경험 통합",
  },
] as const;

export type RimvioLayerId = (typeof RIMVIO_LAYER_STACK)[number]["id"];

export function rimvioLayerById(id: RimvioLayerId) {
  return RIMVIO_LAYER_STACK.find((layer) => layer.id === id);
}
