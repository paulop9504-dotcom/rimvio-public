import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";

const SUCCESS_KO: Partial<Record<CapabilityId, string>> = {
  BOOK_FLIGHT: "항공권 예약을 열었어요",
  BOOK_HOTEL: "숙소 예약을 열었어요",
  CHECK_IN: "체크인 준비 화면을 열었어요",
  NAVIGATE: "길찾기를 열었어요",
  ALARM: "알림을 맞췄어요",
  CALENDAR: "일정을 열었어요",
  CONFIRM_PLACE: "장소를 확인했어요",
  DISMISS_SURFACE: "나중에 볼게요",
  SEARCH: "검색을 열었어요",
  MESSAGE: "메시지를 열었어요",
  CALL: "연락하기를 열었어요",
};

const NEXT_HINT: Partial<Record<CapabilityId, string>> = {
  BOOK_FLIGHT: "다음: 숙소 예약",
  BOOK_HOTEL: "다음: 체크인 준비",
};

export function derivePrimarySuccessMessage(
  capabilityId: CapabilityId,
  node: Pick<SurfaceNode, "title" | "type">,
): string {
  const base = SUCCESS_KO[capabilityId] ?? `${node.title} — 실행했어요`;
  const next = NEXT_HINT[capabilityId];
  return next ? `${base} · ${next}` : base;
}

export function derivePrimaryErrorMessage(capabilityId: CapabilityId): string {
  void capabilityId;
  return "잠시 문제가 있어요. 다시 눌러 주세요";
}
