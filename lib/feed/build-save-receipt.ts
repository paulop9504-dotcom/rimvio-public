import { getFeedCategoryLabel, getFeedSiteLabel } from "@/lib/feed/feed-display";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { LinkRow } from "@/types/database";

export type SaveReceiptLine = {
  label: string;
  value: string;
};

export type SaveReceiptModel = {
  title: string;
  siteLabel: string;
  categoryLabel: string | null;
  savedLabel: string;
  primaryHint: string | null;
  lines: SaveReceiptLine[];
  footer: string;
};

function formatSavedLabel(createdAt: string | null | undefined): string {
  if (!createdAt) {
    return "방금";
  }

  const saved = new Date(createdAt);
  if (Number.isNaN(saved.getTime())) {
    return "방금";
  }

  const diffMs = Date.now() - saved.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "방금";
  }
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}일 전`;
  }

  return saved.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

/** Pure projection — link save metadata as thermal receipt lines. */
export function buildSaveReceipt(
  link: LinkRow,
  primaryActionLabel?: string | null
): SaveReceiptModel {
  const title = getDisplayTitleForLink(link) ?? getFeedSiteLabel(link);
  const siteLabel = getFeedSiteLabel(link);
  const categoryLabel = getFeedCategoryLabel(link.category);
  const savedLabel = formatSavedLabel(link.created_at);
  const primaryHint = primaryActionLabel?.trim() || null;

  const lines: SaveReceiptLine[] = [
    { label: "저장", value: savedLabel },
    { label: "출처", value: siteLabel },
  ];

  if (categoryLabel) {
    lines.push({ label: "분류", value: categoryLabel });
  }

  return {
    title,
    siteLabel,
    categoryLabel,
    savedLabel,
    primaryHint,
    lines,
    footer: primaryHint ? `다음 액션 · ${primaryHint}` : "키우고 있는 링크",
  };
}
