import { isAirportLikeTitle } from "@/lib/action-projection/detect-travel-event";
import type {
  SecondaryActionGeneratorInput,
  SecondaryActionReason,
  SecondaryActionWire,
} from "@/lib/secondary-action-generator/types";
import { MAX_SECONDARY_ACTIONS } from "@/lib/secondary-action-generator/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function isHospitalLike(title: string): boolean {
  return /(?:병원|치과|의원|클리닉|진료)/u.test(title);
}

function isMeetingLike(title: string): boolean {
  return /(?:미팅|회의|meeting|zoom|화상|발표|면접)/iu.test(title);
}

function mainLabelNorm(input: SecondaryActionGeneratorInput): string {
  return normalizeLabel(input.main_action.label);
}

function isDuplicateOfMain(label: string, mainNorm: string): boolean {
  const norm = normalizeLabel(label);
  if (norm === mainNorm) {
    return true;
  }
  if (mainNorm.includes(norm) || norm.includes(mainNorm)) {
    return true;
  }
  return false;
}

function isDismissed(label: string, dismissed?: readonly string[]): boolean {
  if (!dismissed?.length) {
    return false;
  }
  const norm = normalizeLabel(label);
  return dismissed.some((entry) => normalizeLabel(entry) === norm);
}

type DraftSecondary = Omit<SecondaryActionWire, "confidence"> & {
  confidence: number;
};

function pushUnique(
  bucket: DraftSecondary[],
  seen: Set<string>,
  item: DraftSecondary,
  mainNorm: string,
  dismissed?: readonly string[],
): void {
  const key = normalizeLabel(item.label);
  if (seen.has(key) || isDuplicateOfMain(item.label, mainNorm)) {
    return;
  }
  if (isDismissed(item.label, dismissed)) {
    return;
  }
  if (!item.plugin?.trim()) {
    return;
  }
  seen.add(key);
  bucket.push(item);
}

function boostFromHistory(plugin: string, preferred?: readonly string[]): number {
  if (!preferred?.includes(plugin)) {
    return 0;
  }
  return 0.08;
}

function phaseLifecycleDrafts(input: SecondaryActionGeneratorInput): DraftSecondary[] {
  const { event, main_action } = input;
  const phase = event.spawn_phase ?? "default";
  const mainNorm = mainLabelNorm(input);
  const dismissed = input.user_history?.dismissed_labels;
  const drafts: DraftSecondary[] = [];
  const seen = new Set<string>();

  if (phase === "on_site") {
    pushUnique(
      drafts,
      seen,
      {
        id: `${main_action.id}:aux:deck`,
        label: "회사 소개서 PDF",
        reason: "next_step",
        plugin: "file.open",
        category: "next_step_projection",
        confidence: 0.88,
      },
      mainNorm,
      dismissed,
    );
    pushUnique(
      drafts,
      seen,
      {
        id: `${main_action.id}:aux:qr`,
        label: "명함 QR",
        reason: "convenience",
        plugin: "card.qr",
        category: "convenience_optimization",
        confidence: 0.84,
      },
      mainNorm,
      dismissed,
    );
    return drafts;
  }

  if (phase === "prep") {
    pushUnique(
      drafts,
      seen,
      {
        id: `${main_action.id}:aux:salad`,
        label: "샐러드 픽업",
        reason: "convenience",
        plugin: "order.pickup",
        category: "convenience_optimization",
        confidence: 0.8,
      },
      mainNorm,
      dismissed,
    );
    pushUnique(
      drafts,
      seen,
      {
        id: `${main_action.id}:aux:barcode`,
        label: "멤버십 바코드",
        reason: "next_step",
        plugin: "gym.barcode",
        category: "next_step_projection",
        confidence: 0.86,
      },
      mainNorm,
      dismissed,
    );
    return drafts;
  }

  if (phase === "travel") {
    return drafts;
  }

  return drafts;
}

function lifecycleDrafts(input: SecondaryActionGeneratorInput): DraftSecondary[] {
  const phaseFirst = phaseLifecycleDrafts(input);
  if ((input.event.spawn_phase ?? "default") !== "default") {
    if (phaseFirst.length > 0 || input.event.spawn_phase === "travel") {
      return phaseFirst;
    }
  }

  const { event, main_action } = input;
  const title = event.title;
  const minutes = event.minutes_until_event ?? null;
  const mainNorm = mainLabelNorm(input);
  const drafts: DraftSecondary[] = [];
  const seen = new Set<string>();
  const dismissed = input.user_history?.dismissed_labels;
  const preferred = input.user_history?.preferred_plugins;

  const mainIsTaxi = /(?:택시|카카오)/iu.test(main_action.label);
  const mainIsNavigate = /길찾기|내비/u.test(main_action.label);
  const mainIsCall = /전화/u.test(main_action.label);

  if (isAirportLikeTitle(title)) {
    if (!mainIsNavigate) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:navigate`,
          label: "길찾기",
          reason: "next_step",
          plugin: "navigation",
          category: "next_step_projection",
          confidence: clamp01(0.82 + boostFromHistory("navigation", preferred)),
        },
        mainNorm,
        dismissed,
      );
    }

    if (minutes != null && minutes > 120) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:ticket`,
          label: "티켓 확인",
          reason: "risk",
          plugin: "ticket.view",
          category: "risk_prevention",
          confidence: clamp01(0.78 + boostFromHistory("ticket.view", preferred)),
        },
        mainNorm,
        dismissed,
      );
    }

    if (!mainIsTaxi && minutes != null && minutes <= 180) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:parking`,
          label: "주차 등록",
          reason: "convenience",
          plugin: "parking.register",
          category: "convenience_optimization",
          confidence: clamp01(0.71 + boostFromHistory("parking.register", preferred)),
        },
        mainNorm,
        dismissed,
      );
    }

    if (minutes != null && minutes <= 90 && !/체크인/u.test(mainNorm)) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:checkin`,
          label: "체크인 확인",
          reason: "risk",
          plugin: "ticket.view",
          category: "risk_prevention",
          confidence: clamp01(0.84 + boostFromHistory("ticket.view", preferred)),
        },
        mainNorm,
        dismissed,
      );
    }
  } else if (isHospitalLike(title)) {
    if (!mainIsNavigate) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:navigate`,
          label: "길찾기",
          reason: "next_step",
          plugin: "navigation",
          category: "next_step_projection",
          confidence: 0.8,
        },
        mainNorm,
        dismissed,
      );
    }
    if (!mainIsCall) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:call`,
          label: "병원 전화",
          reason: "risk",
          plugin: "tel",
          category: "risk_prevention",
          confidence: 0.76,
        },
        mainNorm,
        dismissed,
      );
    }
    pushUnique(
      drafts,
      seen,
      {
        id: `${main_action.id}:aux:parking`,
        label: "주차 안내",
        reason: "convenience",
        plugin: "parking.register",
        category: "convenience_optimization",
        confidence: 0.68,
      },
      mainNorm,
      dismissed,
    );
  } else if (isMeetingLike(title)) {
    pushUnique(
      drafts,
      seen,
      {
        id: `${main_action.id}:aux:zoom`,
        label: "화상회의 열기",
        reason: "next_step",
        plugin: "zoom.join",
        category: "next_step_projection",
        confidence: 0.79,
      },
      mainNorm,
      dismissed,
    );
    if (event.location && !mainIsNavigate) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:navigate`,
          label: "장소 길찾기",
          reason: "convenience",
          plugin: "navigation",
          category: "convenience_optimization",
          confidence: 0.72,
        },
        mainNorm,
        dismissed,
      );
    }
  } else {
    if (!mainIsNavigate && event.location) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:navigate`,
          label: "길찾기",
          reason: "next_step",
          plugin: "navigation",
          category: "next_step_projection",
          confidence: 0.74,
        },
        mainNorm,
        dismissed,
      );
    }
    if (!mainIsCall && minutes != null && minutes <= 120) {
      pushUnique(
        drafts,
        seen,
        {
          id: `${main_action.id}:aux:call`,
          label: "전화",
          reason: "risk",
          plugin: "tel",
          category: "risk_prevention",
          confidence: 0.7,
        },
        mainNorm,
        dismissed,
      );
    }
  }

  return drafts;
}

function poolDrafts(input: SecondaryActionGeneratorInput): DraftSecondary[] {
  const mainNorm = mainLabelNorm(input);
  const dismissed = input.user_history?.dismissed_labels;
  const drafts: DraftSecondary[] = [];
  const seen = new Set<string>();

  for (const item of input.candidate_pool ?? []) {
    if (item.id === input.main_action.id) {
      continue;
    }

    let reason: SecondaryActionReason = "convenience";
    let category = "convenience_optimization" as const;
    let plugin = "navigation";

    if (/(?:티켓|체크인|확인)/u.test(item.label)) {
      reason = "risk";
      category = "risk_prevention";
      plugin = "ticket.view";
    } else if (/(?:길찾기|내비)/u.test(item.label)) {
      reason = "next_step";
      category = "next_step_projection";
      plugin = "navigation";
    } else if (/전화/u.test(item.label)) {
      reason = "risk";
      category = "risk_prevention";
      plugin = "tel";
    } else if (/주차/u.test(item.label)) {
      reason = "convenience";
      category = "convenience_optimization";
      plugin = "parking.register";
    } else if (/(?:준비|위치)/u.test(item.label)) {
      reason = "next_step";
      category = "next_step_projection";
      plugin = "calendar.view";
    }

    pushUnique(
      drafts,
      seen,
      {
        id: item.id,
        label: item.label,
        reason,
        plugin,
        category,
        confidence: 0.65,
      },
      mainNorm,
      dismissed,
    );
  }

  return drafts;
}

/**
 * Generate 1–3 optional secondary actions for event lifecycle completion.
 * Does not replace or duplicate the selected MAIN action.
 */
export function generateSecondaryActions(
  input: SecondaryActionGeneratorInput,
): SecondaryActionWire[] {
  const merged = [...lifecycleDrafts(input), ...poolDrafts(input)];

  const byReason = new Map<SecondaryActionReason, DraftSecondary[]>();
  for (const draft of merged) {
    const list = byReason.get(draft.reason) ?? [];
    list.push(draft);
    byReason.set(draft.reason, list);
  }

  const picked: SecondaryActionWire[] = [];
  const pickedLabels = new Set<string>();

  const pickBest = (reason: SecondaryActionReason) => {
    const candidates = (byReason.get(reason) ?? [])
      .sort((left, right) => right.confidence - left.confidence)
      .filter((item) => !pickedLabels.has(normalizeLabel(item.label)));
    const best = candidates[0];
    if (!best) {
      return;
    }
    pickedLabels.add(normalizeLabel(best.label));
    picked.push({
      id: best.id,
      label: best.label,
      reason: best.reason,
      plugin: best.plugin,
      confidence: best.confidence,
      category: best.category,
    });
  };

  pickBest("risk");
  pickBest("next_step");
  pickBest("convenience");

  for (const draft of merged.sort((left, right) => right.confidence - left.confidence)) {
    if (picked.length >= MAX_SECONDARY_ACTIONS) {
      break;
    }
    const key = normalizeLabel(draft.label);
    if (pickedLabels.has(key)) {
      continue;
    }
    pickedLabels.add(key);
    picked.push({
      id: draft.id,
      label: draft.label,
      reason: draft.reason,
      plugin: draft.plugin,
      confidence: draft.confidence,
      category: draft.category,
    });
  }

  return picked.slice(0, MAX_SECONDARY_ACTIONS);
}

/** Public JSON shape (without internal id/category). */
export function toSecondaryActionPublicJson(
  actions: readonly SecondaryActionWire[],
): Array<{
  label: string;
  reason: SecondaryActionReason;
  plugin: string;
  confidence: number;
}> {
  return actions.map(({ label, reason, plugin, confidence }) => ({
    label,
    reason,
    plugin,
    confidence,
  }));
}
