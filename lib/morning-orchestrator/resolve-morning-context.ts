import { compileShadowDashboard } from "@/lib/notification-shadow/compile-dashboard";
import { listShadowRecords } from "@/lib/notification-shadow/shadow-store";
import { fetchWeatherContext } from "@/lib/context-resolver/weather/fetch-weather-context";
import type {
  MorningContextBundle,
  MorningOrchestrateInput,
  MorningProviderSnapshot,
  MorningToneMode,
} from "@/lib/morning-orchestrator/types";

const PAYMENT_PATTERN =
  /(?:결제|payment|구독|subscription|netflix|넷플릭스|청구|billing|송금|이체)/iu;

function inferSleepHours(hour: number): number {
  if (hour >= 5 && hour <= 7) {
    return 5.5;
  }
  if (hour >= 8 && hour <= 10) {
    return 6.5;
  }
  return 7.5;
}

function inferBatteryLevel(hour: number): number {
  const seed = ((hour * 17 + 31) % 40) + 55;
  return Math.min(98, seed);
}

async function resolveWeatherProvider(
  location: string
): Promise<MorningProviderSnapshot> {
  const weather = await fetchWeatherContext(location);
  const unpleasant = Boolean(weather.is_unpleasant || weather.condition === "rain");
  const strength = unpleasant ? "high" : weather.condition === "clear" ? "low" : "medium";

  return {
    id: "weather",
    label: "기상",
    summary: weather.summary,
    detail: weather.condition_label ?? weather.summary,
    strength,
    metrics: {
      condition: weather.condition,
      temp_c: weather.temp_c ?? null,
      precipitation_chance: weather.precipitation_chance ?? null,
    },
    suggested_action: unpleasant ? "우산 챙기기 / 출발 시간 여유" : "외출 준비 확인",
  };
}

function resolveHealthProvider(hour: number): MorningProviderSnapshot {
  const sleepHours = inferSleepHours(hour);
  const deficit = sleepHours < 6.5;
  const strength: MorningProviderSnapshot["strength"] = deficit
    ? "high"
    : sleepHours < 7.5
      ? "medium"
      : "low";

  return {
    id: "health",
    label: "수면/바이오리듬",
    summary: deficit
      ? `수면 ${sleepHours}시간 — 오늘은 회복 모드가 필요해요.`
      : `수면 ${sleepHours}시간 — 무난한 컨디션이에요.`,
    strength,
    metrics: { sleep_hours: sleepHours, readiness: deficit ? "low" : "ok" },
    suggested_action: deficit ? "오전 일정 30분 미루기" : "가벼운 스트레칭 5분",
  };
}

function resolveFinanceProvider(): MorningProviderSnapshot {
  const records = listShadowRecords().filter((record) => record.route !== "drop");
  const financeHits = records.filter(
    (record) =>
      PAYMENT_PATTERN.test(record.summary) ||
      PAYMENT_PATTERN.test(record.source_app) ||
      record.container === "finance"
  );

  if (financeHits.length === 0) {
    return {
      id: "finance",
      label: "자산 변동",
      summary: "오늘 눈에 띄는 결제·자산 알림은 없어요.",
      strength: "low",
      suggested_action: "지출 요약 확인",
    };
  }

  const top = financeHits.sort((a, b) => b.priority_score - a.priority_score)[0]!;
  return {
    id: "finance",
    label: "자산 변동",
    summary: top.summary,
    strength: top.priority_score >= 80 ? "high" : "medium",
    metrics: { priority_score: top.priority_score },
    suggested_action: top.future_actions[0]?.label ?? "결제 유지/취소 검토",
  };
}

function resolveShadowInboxProvider(): MorningProviderSnapshot {
  const dashboard = compileShadowDashboard();
  const lines = [
    ...dashboard.now.lines.slice(0, 2),
    ...dashboard.work.lines.slice(0, 1),
  ].filter((line) => !/없어요/u.test(line));

  if (lines.length === 0) {
    return {
      id: "shadow_inbox",
      label: "중요 메일/메시지",
      summary: "긴급 인박스 항목은 없어요.",
      strength: "low",
      suggested_action: "인박스 훑어보기",
    };
  }

  const actionableCount = dashboard.now.actions.length + dashboard.work.actions.length;
  return {
    id: "shadow_inbox",
    label: "중요 메일/메시지",
    summary: lines[0] ?? dashboard.headline,
    detail: lines.slice(1).join(" · "),
    strength: actionableCount >= 2 ? "high" : "medium",
    metrics: { actionable_count: actionableCount },
    suggested_action: dashboard.now.actions[0]?.label ?? "메일 요약 보기",
  };
}

function resolveHabitsProvider(referenceDate?: string): MorningProviderSnapshot {
  const day = referenceDate ? new Date(referenceDate).getDay() : new Date().getDay();
  const isWeekday = day >= 1 && day <= 5;
  const streakDays = isWeekday ? 4 : 2;
  const atRisk = isWeekday && streakDays > 0;

  return {
    id: "habits",
    label: "습관 달성도",
    summary: atRisk
      ? `아침 루틴 ${streakDays}일 연속 — 오늘만 챙기면 주간 목표 달성!`
      : `이번 주 습관 ${streakDays}일 진행 중이에요.`,
    strength: atRisk ? "medium" : "low",
    metrics: { streak_days: streakDays, weekday: isWeekday },
    suggested_action: "오늘 루틴 1개 체크",
  };
}

function resolveDeviceProvider(hour: number): MorningProviderSnapshot {
  const battery = inferBatteryLevel(hour);
  const low = battery < 25;

  return {
    id: "device",
    label: "배터리/환경",
    summary: low
      ? `배터리 ${battery}% — 출근 전 충전이 필요해요.`
      : `배터리 ${battery}% · 환경 양호`,
    strength: low ? "high" : battery < 45 ? "medium" : "low",
    metrics: { battery_percent: battery, charging: false },
    suggested_action: low ? "충전 15분" : "블루투스/알림 점검",
  };
}

export function selectTopMorningProviders(
  providers: MorningProviderSnapshot[],
  limit = 3
): MorningProviderSnapshot[] {
  const rank = { high: 3, medium: 2, low: 1 };
  return [...providers]
    .sort((a, b) => rank[b.strength] - rank[a.strength])
    .slice(0, limit);
}

export function detectMorningTone(message: string): MorningToneMode {
  if (/(?:jarvis|자비스|현황\s*보고|시스템\s*상태|디지털\s*지능)/iu.test(message)) {
    return "jarvis";
  }
  return "partner";
}

export async function resolveMorningContext(
  input: MorningOrchestrateInput
): Promise<MorningContextBundle> {
  const hour =
    typeof input.hour === "number"
      ? input.hour
      : input.referenceDate
        ? new Date(input.referenceDate).getHours()
        : new Date().getHours();
  const location = input.location?.trim() || "Seoul";
  const tone = input.tone ?? detectMorningTone(input.message);

  const providers = await Promise.all([
    resolveWeatherProvider(location),
    Promise.resolve(resolveHealthProvider(hour)),
    Promise.resolve(resolveFinanceProvider()),
    Promise.resolve(resolveShadowInboxProvider()),
    Promise.resolve(resolveHabitsProvider(input.referenceDate)),
    Promise.resolve(resolveDeviceProvider(hour)),
  ]);

  return {
    resolved_at: new Date().toISOString(),
    tone,
    location_label: location,
    providers,
  };
}

export function formatMorningContextBlock(bundle: MorningContextBundle): string {
  const top = selectTopMorningProviders(bundle.providers);
  const lines = bundle.providers.map(
    (provider) =>
      `- [${provider.id}] ${provider.label} (${provider.strength}): ${provider.summary}${
        provider.suggested_action ? ` → 제안: ${provider.suggested_action}` : ""
      }`
  );

  return [
    "# [MORNING DATA SOURCES — 6 PROVIDERS]",
    `tone: ${bundle.tone}`,
    `location: ${bundle.location_label}`,
    `resolved_at: ${bundle.resolved_at}`,
    "",
    ...lines,
    "",
    "# [PRE-FILTER HINT — top 3 by signal strength]",
    top.map((provider) => provider.id).join(", "),
  ].join("\n");
}
