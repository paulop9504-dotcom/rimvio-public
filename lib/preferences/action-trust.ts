/** Adaptive automation — trust staircase (신뢰의 계단). */

export const ACTION_TRUST_STORAGE_KEY = "rimvio.action-trust.v1";
export const ACTION_TRUST_UPDATED = "rimvio-action-trust-updated";

/** Success count thresholds for auto mode stage transitions. */
export const TRUST_STAGE_PARTNER_AT = 20;
export const TRUST_STAGE_HEAVY_AT = 100;

export type TrustLevelMode = "auto" | "beginner" | "partner" | "heavy";

export type TrustStaircaseStage = 1 | 2 | 3;

export type ActionTrustState = {
  mode: TrustLevelMode;
  successScore: number;
  updatedAt: string;
};

export type TrustLevelOption = {
  id: TrustLevelMode;
  label: string;
  emoji: string;
  hint: string;
  badge?: string;
};

export const TRUST_LEVEL_OPTIONS: TrustLevelOption[] = [
  {
    id: "auto",
    label: "자동 진화",
    emoji: "📈",
    hint: "성공 경험이 쌓이면 확인 → 제안 → 즉시 실행으로 자연스럽게 바뀌어요",
    badge: "추천",
  },
  {
    id: "beginner",
    label: "초보자 모드",
    emoji: "🛡️",
    hint: "모든 액션 전에 확인을 받아요 · 처음 쓰실 때 편해요",
  },
  {
    id: "partner",
    label: "파트너 모드",
    emoji: "🤝",
    hint: "분석이 끝나면 바로 액션 버튼을 보여줘요",
  },
  {
    id: "heavy",
    label: "자동화 모드",
    emoji: "⚡",
    hint: "1순위 액션을 강조하고, 빠르게 실행할 수 있게 도와줘요",
  },
];

const MODE_SET = new Set<TrustLevelMode>(
  TRUST_LEVEL_OPTIONS.map((option) => option.id)
);

function isTrustLevelMode(value: string): value is TrustLevelMode {
  return MODE_SET.has(value as TrustLevelMode);
}

function defaultTrustState(): ActionTrustState {
  return {
    mode: "auto",
    successScore: 0,
    updatedAt: new Date().toISOString(),
  };
}

function parseTrustState(raw: string | null): ActionTrustState {
  if (!raw) {
    return defaultTrustState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ActionTrustState>;
    const mode =
      typeof parsed.mode === "string" && isTrustLevelMode(parsed.mode)
        ? parsed.mode
        : "auto";
    const successScore =
      typeof parsed.successScore === "number" && parsed.successScore >= 0
        ? Math.floor(parsed.successScore)
        : 0;

    return {
      mode,
      successScore,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return defaultTrustState();
  }
}

export function readActionTrustState(): ActionTrustState {
  if (typeof window === "undefined") {
    return defaultTrustState();
  }

  try {
    return parseTrustState(localStorage.getItem(ACTION_TRUST_STORAGE_KEY));
  } catch {
    return defaultTrustState();
  }
}

export function readActionTrustMode(): TrustLevelMode {
  return readActionTrustState().mode;
}

export function readActionTrustSuccessScore(): number {
  return readActionTrustState().successScore;
}

function writeActionTrustState(state: ActionTrustState): ActionTrustState {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTION_TRUST_STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent(ACTION_TRUST_UPDATED));
    } catch {
      // ignore quota / private mode
    }
  }

  return state;
}

export function writeActionTrustMode(mode: TrustLevelMode): ActionTrustState {
  const current = readActionTrustState();
  return writeActionTrustState({
    ...current,
    mode,
    updatedAt: new Date().toISOString(),
  });
}

export function recordActionTrustSuccess(): ActionTrustState {
  const current = readActionTrustState();
  return writeActionTrustState({
    ...current,
    successScore: current.successScore + 1,
    updatedAt: new Date().toISOString(),
  });
}

export function resolveTrustStaircaseStage(input?: {
  mode?: TrustLevelMode;
  successScore?: number;
}): TrustStaircaseStage {
  const mode = input?.mode ?? readActionTrustMode();
  const score = input?.successScore ?? readActionTrustSuccessScore();

  if (mode === "beginner") {
    return 1;
  }
  if (mode === "partner") {
    return 2;
  }
  if (mode === "heavy") {
    return 3;
  }

  if (score >= TRUST_STAGE_HEAVY_AT) {
    return 3;
  }
  if (score >= TRUST_STAGE_PARTNER_AT) {
    return 2;
  }
  return 1;
}

export function labelForTrustLevelMode(mode: TrustLevelMode) {
  const match = TRUST_LEVEL_OPTIONS.find((option) => option.id === mode);
  return match ? `${match.emoji} ${match.label}` : mode;
}

export function stageLabel(stage: TrustStaircaseStage) {
  if (stage === 1) {
    return "신중한 비서";
  }
  if (stage === 2) {
    return "손발 맞는 파트너";
  }
  return "투명한 조력자";
}

export function nextTrustMilestone(successScore: number): {
  target: number;
  label: string;
} | null {
  if (successScore < TRUST_STAGE_PARTNER_AT) {
    return {
      target: TRUST_STAGE_PARTNER_AT,
      label: "파트너 모드",
    };
  }
  if (successScore < TRUST_STAGE_HEAVY_AT) {
    return {
      target: TRUST_STAGE_HEAVY_AT,
      label: "자동화 모드",
    };
  }
  return null;
}
