import type { EventCandidateCategory } from "@/lib/events/event-candidate";
import { MENTION_ACTION_ICONS } from "@/lib/action-chat/mention-actions/mention-action-inline-features";
import type { InlineChatManualCatalogGroup } from "@/lib/action-chat/mention-actions/inline-chat-action";
import {
  listMentionFeatures,
  type MentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";

const CATEGORY_ORDER: readonly { key: EventCandidateCategory; label: string }[] = [
  { key: "travel", label: "이동·길찾기" },
  { key: "schedule", label: "일정·알림" },
  { key: "finance", label: "돈·결제" },
  { key: "food", label: "음식·배달" },
  { key: "custom", label: "생활·도구" },
];

const EXTRA_MANUAL_FEATURES: readonly MentionFeature[] = [
  {
    featureId: "calendar",
    displayName: "캘린더",
    aliases: ["캘린더", "calendar"],
    sourceRef: "mention:calendar",
    category: "schedule",
    confirmCopy: "예: @캘린더 오늘",
  },
];

const DEFAULT_EXAMPLES: Partial<Record<string, string>> = {
  navigate: "@네비 강남역",
  meal: "@식사 강남 맛집",
  schedule: "@일정정리",
  parking: "@주차_",
  reminder: "@알림 30분 뒤",
  linksheet: "@링크시트 https://docs.google.com/spreadsheets/d/…",
  receipt: "@영수증",
  peer_talk: "@톡 친구이름",
  group_talk: "@단톡 방이름",
};

function pickPrimaryAlias(feature: MentionFeature): string {
  const hangul = feature.aliases.find((alias) => /[\u3131-\uD79D]/u.test(alias));
  return hangul ?? feature.aliases[0] ?? feature.featureId;
}

function buildExample(feature: MentionFeature, token: string): string {
  const fromConfirm = feature.confirmCopy?.match(/@[^\s]+[^\s.?]*/u)?.[0];
  if (fromConfirm) {
    return fromConfirm;
  }
  const preset = DEFAULT_EXAMPLES[feature.featureId];
  if (preset) {
    return preset;
  }
  return `@${token}`;
}

function featureToRow(feature: MentionFeature) {
  const token = pickPrimaryAlias(feature);
  return {
    token,
    displayName: feature.displayName,
    icon: MENTION_ACTION_ICONS[feature.featureId] ?? "⚡",
    example: buildExample(feature, token),
    category: feature.category,
  };
}

function matchesFilter(row: ReturnType<typeof featureToRow>, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    row.token.toLowerCase().includes(needle) ||
    row.displayName.toLowerCase().includes(needle) ||
    row.example.toLowerCase().includes(needle) ||
    row.category.toLowerCase().includes(needle)
  );
}

/** Full @ mention catalog for `@설명서` inline chip. */
export function buildMentionManualCatalog(filter = ""): InlineChatManualCatalogGroup[] {
  const rows = [
    ...listMentionFeatures().filter((feature) => feature.featureId !== "manual"),
    ...EXTRA_MANUAL_FEATURES,
  ]
    .map(featureToRow)
    .filter((row) => matchesFilter(row, filter));

  const byCategory = new Map<string, InlineChatManualCatalogGroup["rows"]>();
  for (const row of rows) {
    const label =
      CATEGORY_ORDER.find((entry) => entry.key === row.category)?.label ?? "기타";
    const bucket = byCategory.get(label) ?? [];
    bucket.push({
      token: row.token,
      displayName: row.displayName,
      icon: row.icon,
      example: row.example,
    });
    byCategory.set(label, bucket);
  }

  const groups: InlineChatManualCatalogGroup[] = [];
  for (const { label } of CATEGORY_ORDER) {
    const bucket = byCategory.get(label);
    if (!bucket?.length) {
      continue;
    }
    groups.push({
      categoryLabel: label,
      rows: bucket.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko")),
    });
    byCategory.delete(label);
  }

  for (const [categoryLabel, bucket] of byCategory) {
    groups.push({
      categoryLabel,
      rows: bucket.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko")),
    });
  }

  return groups;
}

export function countMentionManualCatalogRows(filter = ""): number {
  return buildMentionManualCatalog(filter).reduce(
    (total, group) => total + group.rows.length,
    0,
  );
}
