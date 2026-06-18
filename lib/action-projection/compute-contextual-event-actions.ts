import { isAirportLikeTitle } from "@/lib/action-projection/detect-travel-event";
import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type {
  ActionProjectionPhase,
  ProjectedEventAction,
} from "@/lib/action-projection/types";

const MS_36H = 36 * 60 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;
const MS_30M = 30 * 60 * 1000;

function phaseId(ecId: string, phase: ActionProjectionPhase, label: string) {
  return `${ecId}:${phase}:${label}`;
}

function isMeetingLike(title: string): boolean {
  return /(?:미팅|회의|meeting|파트너|외부|약속)/iu.test(title);
}

function extractPlaceHint(title: string): string | null {
  const match = title.match(/(?:강남역|[^\s]{2,8}역)/u);
  return match?.[0] ?? null;
}

function isHospitalLike(title: string): boolean {
  return /(?:병원|치과|의원|클리닉|진료)/u.test(title);
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/**
 * Event + time context → dynamic actions (not stored on Event).
 * Returns empty outside prep/execution windows so the prep board stays hidden.
 */
export function computeContextualEventActions(input: {
  ecId: string;
  title: string;
  startAt: string;
  now?: Date;
}): ProjectedEventAction[] {
  const now = input.now ?? new Date();
  const start = parseActionTargetDatetime(input.startAt);
  if (!start) {
    return [];
  }

  const deltaMs = start.getTime() - now.getTime();
  const hospital = isHospitalLike(input.title);
  const airport = isAirportLikeTitle(input.title);
  const meeting = isMeetingLike(input.title);
  const placeHint = extractPlaceHint(input.title);

  if (deltaMs > MS_36H || deltaMs < -MS_2H) {
    return [];
  }

  if (deltaMs > MS_2H) {
    if (airport) {
      return [
        {
          id: phaseId(input.ecId, "T-24h", "ticket"),
          label: "티켓 확인",
          phase: "T-24h",
        },
        {
          id: phaseId(input.ecId, "T-24h", "checkin"),
          label: "체크인 확인",
          phase: "T-24h",
        },
      ];
    }

    return [
      {
        id: phaseId(input.ecId, "T-24h", "prep"),
        label: "준비물 확인",
        phase: "T-24h",
      },
      {
        id: phaseId(input.ecId, "T-24h", "place"),
        label: "위치 확인",
        phase: "T-24h",
      },
    ];
  }

  if (deltaMs > MS_30M) {
    if (meeting && deltaMs <= MS_2H) {
      const dest = placeHint ? ` (${placeHint})` : "";
      return [
        {
          id: phaseId(input.ecId, "T-departure", "taxi"),
          label: `카카오T 호출${dest}`,
          phase: "T-departure",
        },
      ];
    }

    const actions: ProjectedEventAction[] = [
      {
        id: phaseId(input.ecId, "T-2h", "navigate"),
        label: "길찾기",
        phase: "T-2h",
      },
      {
        id: phaseId(input.ecId, "T-2h", "call"),
        label: "전화",
        phase: "T-2h",
      },
    ];

    if (airport && isSameLocalDay(now, start)) {
      actions.unshift({
        id: phaseId(input.ecId, "T-departure", "ready"),
        label: "나갈 준비 확인",
        phase: "T-departure",
      });
    }

    return actions;
  }

  if (deltaMs >= -MS_2H) {
    if (hospital) {
      return [
        {
          id: phaseId(input.ecId, "AT_EVENT", "checkin"),
          label: "접수",
          phase: "AT_EVENT",
        },
        {
          id: phaseId(input.ecId, "AT_EVENT", "parking"),
          label: "주차",
          phase: "AT_EVENT",
        },
      ];
    }

    return [
      {
        id: phaseId(input.ecId, "AT_EVENT", "open"),
        label: "일정 열기",
        phase: "AT_EVENT",
      },
    ];
  }

  return [];
}
