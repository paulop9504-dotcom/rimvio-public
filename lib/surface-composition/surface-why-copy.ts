import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";
import type { SurfaceCompositionFrame } from "@/lib/surface-composition/surface-node-contract";
import type { SurfacePriorityBand } from "@/lib/surface-engine/surface-contract";

const REASON_KO: Record<string, string> = {
  travel_sequence: "여행은 항공 → 숙소 → 체크인 순서가 가장 편해요",
  reminder: "곧 필요한 알림이에요",
  conflict_resolution: "지금은 이 일정을 먼저 보는 게 좋아요",
  low_signal_merge: "비슷한 일정을 하나로 묶었어요",
  ux_fallback: "오늘 할 일을 가볍게 정리했어요",
  decision_stream_collapse: "지금 가장 급한 일만 보여드려요",
  active_surface_selected: "지금 이게 가장 중요한 다음 행동이에요",
  peer_talk_marble: "대화에서 남긴 일 — 꼭 지금 할 필요는 없어요",
  sadness_hold: "잠시 뒤로 둔 일이에요. 준비되면 다시 꺼낼 수 있어요",
};

const BAND_KO: Record<SurfacePriorityBand, string | null> = {
  critical: "시간이 거의 없어요 — 바로 처리하는 게 좋아요",
  high: "오늘 안에 보면 좋은 일정이에요",
  medium: null,
  low: null,
};

export function deriveSurfaceWhyLineKo(input: {
  node: SurfaceNode | null;
  frame?: Pick<SurfaceCompositionFrame, "collapse" | "engine">;
}): string | null {
  const { node, frame } = input;
  if (!node) {
    return null;
  }

  const reasonKey = node.narration?.reason?.trim();
  if (reasonKey && REASON_KO[reasonKey]) {
    return REASON_KO[reasonKey];
  }

  if (node.narration?.summary?.trim()) {
    return node.narration.summary.trim();
  }

  const band = node.priority?.band;
  if (band) {
    const bandLine = BAND_KO[band];
    if (bandLine) {
      return bandLine;
    }
  }

  if (frame && frame.collapse.latentSurfaceIds.length > 0) {
    return "다른 일정은 잠시 뒤로 미뤄두고, 지금 할 일 하나에 집중해요";
  }

  if (frame?.engine.uxState === "overloaded") {
    return "할 일이 많아서, 가장 급한 것만 먼저 보여드려요";
  }

  return "아래 버튼이 지금 가장 빠른 다음 단계예요";
}
