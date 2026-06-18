export type ContainerAllowedAction =
  | "BUY"
  | "SELL"
  | "CHECK_PRICE"
  | "SET_ALARM"
  | "FETCH_NEWS"
  | "SUMMARIZE"
  | "ADD_SCHEDULE"
  | "CHECK_SCHEDULE"
  | "CHECK_TRANSIT"
  | "NAVIGATE"
  | "CALL"
  | "OPEN_LINK"
  | "ACTION";

export type ContainerPreset = {
  id: string;
  title: string;
  topic?: string;
  persona: string;
  allowedActions: ContainerAllowedAction[];
  accent: string;
};

/** Canonical container keys — used in activeChains state array. */export type CanonicalContainerKey =
  | "bitcoin_trader"
  | "news_briefing"
  | "calendar_planner"
  | "transport_guard";

export const LEGACY_CONTAINER_ID_ALIASES: Record<string, CanonicalContainerKey> = {
  crypto_trader_01: "bitcoin_trader",
  news_reader_01: "news_briefing",
  schedule_planner_01: "calendar_planner",
  transport_guard_01: "transport_guard",
};

export const CANONICAL_CONTAINER_REGISTRY: Record<
  CanonicalContainerKey,
  ContainerPreset
> = {
  bitcoin_trader: {
    id: "bitcoin_trader",
    title: "비트코인 트레이더",
    topic: "finance",
    persona:
      "철저히 분석적이고 이성적인 비트코인 트레이더. 감정 배제. 위험 수치 강조.",
    allowedActions: ["BUY", "SELL", "CHECK_PRICE", "SET_ALARM"],
    accent: "#F59E0B",
  },
  news_briefing: {
    id: "news_briefing",
    title: "뉴스 브리핑",
    topic: "news",
    persona: "시장·정치·테크 헤드라인을 빠르게 요약하는 뉴스 리더.",
    allowedActions: ["FETCH_NEWS", "SUMMARIZE", "OPEN_LINK"],
    accent: "#6366F1",
  },
  calendar_planner: {
    id: "calendar_planner",
    title: "일정 관리",
    topic: "schedule",
    persona: "캘린더 중심. 시간 충돌을 먼저 확인하고 명확한 일정 제안.",
    allowedActions: ["ADD_SCHEDULE", "CHECK_SCHEDULE", "SET_ALARM"],
    accent: "#10B981",
  },
  transport_guard: {
    id: "transport_guard",
    title: "교통·이동",
    topic: "transport",
    persona: "실시간 교통·대중교통·경로를 결합해 지각을 방지하는 이동 코치.",
    allowedActions: ["CHECK_TRANSIT", "NAVIGATE", "SET_ALARM"],
    accent: "#4A90E2",
  },
};

export function normalizeContainerKey(raw: string): CanonicalContainerKey | null {
  const trimmed = raw.trim();
  if (trimmed in CANONICAL_CONTAINER_REGISTRY) {
    return trimmed as CanonicalContainerKey;
  }
  return LEGACY_CONTAINER_ID_ALIASES[trimmed] ?? null;
}

export function normalizeActiveChains(raw: string[]): CanonicalContainerKey[] {
  const seen = new Set<CanonicalContainerKey>();
  const result: CanonicalContainerKey[] = [];

  for (const id of raw) {
    const key = normalizeContainerKey(id);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }

  return result;
}

export function resolveCanonicalPreset(
  key: CanonicalContainerKey
): ContainerPreset {
  return CANONICAL_CONTAINER_REGISTRY[key];
}

export function unionCapabilities(
  keys: CanonicalContainerKey[]
): ContainerAllowedAction[] {
  const set = new Set<ContainerAllowedAction>();
  for (const key of keys) {
    for (const action of CANONICAL_CONTAINER_REGISTRY[key].allowedActions) {
      set.add(action);
    }
  }
  return [...set];
}

export function mergeActiveChainsPersona(keys: CanonicalContainerKey[]): string {
  if (keys.length === 0) {
    return "";
  }

  if (keys.length === 1) {
    return CANONICAL_CONTAINER_REGISTRY[keys[0]!].persona;
  }

  const titles = keys.map((key) => CANONICAL_CONTAINER_REGISTRY[key].title);
  const personas = keys.map((key) => CANONICAL_CONTAINER_REGISTRY[key].persona);
  return `${titles.join(" + ")} 융합: ${personas.join(" · ")}`;
}

export function buildHybridLabelFromKeys(keys: CanonicalContainerKey[]): string {
  if (keys.length === 0) {
    return "";
  }
  if (keys.length === 1) {
    return CANONICAL_CONTAINER_REGISTRY[keys[0]!].title;
  }
  return keys.map((key) => CANONICAL_CONTAINER_REGISTRY[key].title).join(" × ");
}

export type ActiveChainWire = {
  chain_id: string;
  priority_order: string[];
  containers: Array<{
    container_id: string;
    title: string;
    persona: string;
    allowed_actions: ContainerAllowedAction[];
  }>;
  merged_persona: string;
  allowed_actions_union: ContainerAllowedAction[];
  hybrid_label: string;
};

/** @deprecated use CANONICAL_CONTAINER_REGISTRY values */
export const CONTAINER_PRESETS: ContainerPreset[] = Object.values(
  CANONICAL_CONTAINER_REGISTRY
);
