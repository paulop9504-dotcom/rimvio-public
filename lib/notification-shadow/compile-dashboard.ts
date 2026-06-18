import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import { CANONICAL_CONTAINER_REGISTRY } from "@/lib/containers/container-types";
import type { ShadowProcessedRecord } from "@/lib/notification-shadow/types";
import { listShadowRecords } from "@/lib/notification-shadow/shadow-store";

export type ShadowDashboardSection = {
  title: string;
  lines: string[];
  actions: Array<{ label: string; deepLink?: string; shadowId: string }>;
};

export type ShadowDashboard = {
  headline: string;
  now: ShadowDashboardSection;
  work: ShadowDashboardSection;
  topics: ShadowDashboardSection;
};

function primaryAction(record: ShadowProcessedRecord) {
  return record.future_actions[0] ?? null;
}

function formatNowLine(record: ShadowProcessedRecord): string {
  const action = primaryAction(record);
  return action ? record.summary : record.summary;
}

function groupByContainer(records: ShadowProcessedRecord[]) {
  const map = new Map<CanonicalContainerKey | "UNKNOWN", ShadowProcessedRecord[]>();
  for (const record of records) {
    const key = record.container;
    const bucket = map.get(key) ?? [];
    bucket.push(record);
    map.set(key, bucket);
  }
  return map;
}

export function compileShadowDashboard(options?: {
  records?: ShadowProcessedRecord[];
}): ShadowDashboard {
  const records =
    options?.records ??
    listShadowRecords().filter((record) => record.route !== "drop");

  const actionable = records.filter((record) => record.future_actions.length > 0);
  const nowCandidates = actionable
    .filter((record) => record.route === "popup" || record.route === "action_stream")
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);

  const workRecords = records.filter(
    (record) => record.category === "WORK" && record.route === "shadow"
  );
  const topicMap = groupByContainer(
    records.filter((record) => record.route === "shadow" && record.container !== "UNKNOWN")
  );

  const now: ShadowDashboardSection = {
    title: "지금 해야 할 일",
    lines: nowCandidates.length
      ? nowCandidates.map((record, index) => `${index + 1}. ${formatNowLine(record)}`)
      : ["지금 바로 눌러야 할 알림은 없어요."],
    actions: nowCandidates.flatMap((record) => {
      const action = primaryAction(record);
      if (!action) {
        return [];
      }
      return [
        {
          label: action.label,
          deepLink: action.deepLink,
          shadowId: record.id,
        },
      ];
    }),
  };

  const workCount = workRecords.length;
  const work: ShadowDashboardSection = {
    title: "업무",
    lines:
      workCount > 0
        ? [`Slack/메일 등 업무 알림 ${workCount}건이 Shadow에 쌓였어요.`]
        : ["업무 Shadow가 비어 있어요."],
    actions: workRecords.slice(0, 1).flatMap((record) => {
      const action = primaryAction(record);
      return action
        ? [{ label: "업무 보기", deepLink: action.deepLink, shadowId: record.id }]
        : [];
    }),
  };

  const topicLines: string[] = [];
  const topicActions: ShadowDashboardSection["actions"] = [];

  for (const [key, bucket] of topicMap) {
    if (key === "UNKNOWN" || bucket.length === 0) {
      continue;
    }
    const preset = CANONICAL_CONTAINER_REGISTRY[key as CanonicalContainerKey];
    topicLines.push(`${preset.title} 관련 ${bucket.length}건`);
    const top = bucket[0]!;
    const action = primaryAction(top);
    if (action) {
      topicActions.push({
        label: action.label,
        deepLink: action.deepLink,
        shadowId: top.id,
      });
    }
  }

  const topics: ShadowDashboardSection = {
    title: "관심 주제",
    lines: topicLines.length ? topicLines : ["컨테이너에 쌓인 Shadow가 아직 없어요."],
    actions: topicActions,
  };

  return {
    headline: "오늘 중요한 것",
    now,
    work,
    topics,
  };
}

export function formatShadowDashboardText(dashboard: ShadowDashboard): string {
  const parts: string[] = [dashboard.headline, ""];

  parts.push(`📌 ${dashboard.now.title}`);
  for (const line of dashboard.now.lines) {
    parts.push(line);
  }
  for (const action of dashboard.now.actions) {
    parts.push(`[${action.label}]`);
  }

  parts.push("", "────────────────", "", `💼 ${dashboard.work.title}`);
  for (const line of dashboard.work.lines) {
    parts.push(line);
  }
  for (const action of dashboard.work.actions) {
    parts.push(`[${action.label}]`);
  }

  parts.push("", "────────────────", "", `📈 ${dashboard.topics.title}`);
  for (const line of dashboard.topics.lines) {
    parts.push(line);
  }
  for (const action of dashboard.topics.actions) {
    parts.push(`[${action.label}]`);
  }

  return parts.join("\n");
}

export function isShadowDashboardQuery(message: string): boolean {
  return /(?:오늘|지금).*(?:중요|해야|뭐\s*있|일정|알림)|중요한\s*거\s*뭐|shadow\s*dashboard/i.test(
    message.trim()
  );
}
