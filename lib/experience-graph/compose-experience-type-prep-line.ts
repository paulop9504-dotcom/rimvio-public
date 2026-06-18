import {
  experienceEventTypeById,
  type ExperienceEventTypeId,
} from "@/lib/experience-graph/experience-event-type-spec";
import type { ExperienceLensId } from "@/lib/experience-graph/resolve-experience-lens";

function peerFragment(peerDisplayName?: string | null): string | null {
  const name = peerDisplayName?.trim();
  return name ? `${name}와 · ` : null;
}

/**
 * Type-specific prep copy when weather is quiet — actionable, one line.
 * Returns null for past volumes or types with no prep story.
 */
export function composeExperienceTypePrepLine(input: {
  eventType: ExperienceEventTypeId;
  lens: ExperienceLensId;
  peerDisplayName?: string | null;
  place?: string | null;
  hoursUntil: number;
}): string | null {
  if (input.lens === "then" || input.hoursUntil < -2) {
    return null;
  }

  const spec = experienceEventTypeById(input.eventType);
  const peer = spec.prep.peer ? peerFragment(input.peerDisplayName) : null;
  const place = input.place?.trim();

  switch (input.eventType) {
    case "travel":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return `${peer ?? ""}출발·이동 확인`;
      }
      if (input.lens === "soon") {
        return `${peer ?? ""}짐·이동 일정 확인`;
      }
      return place ? `${place} · 체류 지도` : null;

    case "date":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return `${peer ?? ""}만남·이동 확인`;
      }
      return `${peer ?? ""}장소·시간 확인`;

    case "concert":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return `${peer ?? ""}입장·좌석 확인`;
      }
      if (input.lens === "soon") {
        return `${peer ?? ""}티켓·이동 시간 확인`;
      }
      return place ? `${place} · 공연장` : null;

    case "sport":
      if (input.lens === "now" || input.hoursUntil <= 6) {
        return "코스·컨디션·장비 확인";
      }
      if (input.lens === "soon") {
        return "장비·이동·날씨 확인";
      }
      return place ? `${place} · 코스 지도` : null;

    case "food":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return `${peer ?? ""}예약·대기 확인`;
      }
      return `${peer ?? ""}이동·예약 확인`;

    case "work":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return "이동·미팅 준비";
      }
      if (input.lens === "soon") {
        return "자료·이동 여유 두기";
      }
      return place ? `${place} · 현장` : null;

    case "family":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return `${peer ?? ""}모임·이동 확인`;
      }
      return `${peer ?? ""}일정·준비 확인`;

    case "daily":
      return input.lens === "soon" && place ? `${place} · 단골 코스` : null;

    case "schedule":
      if (input.lens === "now" || input.hoursUntil <= 3) {
        return "바로 실행·이동 확인";
      }
      if (input.lens === "soon") {
        return "시간·이동 확인";
      }
      return place ? `${place} · 장소` : null;

    default:
      return null;
  }
}
