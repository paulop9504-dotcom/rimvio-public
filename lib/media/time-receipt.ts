import { isYouTubeDomain, isYouTubeShortsUrl } from "@/lib/enrichers/youtube-url";
import { isArticleUrl } from "@/lib/media/article-url";
import { fetchArticleReadingMinutes } from "@/lib/media/fetch-article-reading";
import { fetchYouTubeDurationSeconds } from "@/lib/media/fetch-youtube-duration";
import { formatDurationFromSeconds, formatDurationLabel } from "@/lib/media/format-duration";

export const FOCUS_MULTIPLIER = 1.25;

export type TimeReceiptKind = "youtube" | "article";

export type TimeReceiptLineKind = "base" | "focus" | "total";

export type TimeReceiptLine = {
  kind: TimeReceiptLineKind;
  icon: string;
  label: string;
  minutes: number;
  display: string;
};

export type TimeReceipt = {
  available: boolean;
  kind: TimeReceiptKind | null;
  kindLabel: string;
  title: string;
  baseMinutes: number;
  focusedMinutes: number;
  headline: string;
  detail: string;
  disclaimer: string;
  lines: TimeReceiptLine[];
};

function applyFocusMinutes(baseMinutes: number) {
  return Math.max(1, Math.ceil(baseMinutes * FOCUS_MULTIPLIER));
}

function buildLines(baseMinutes: number, focusedMinutes: number, kind: TimeReceiptKind) {
  const baseLabel = kind === "youtube" ? "재생 길이" : "읽기 시간";
  const focusLabel = kind === "youtube" ? "집중 시(1.25×)" : "집중 읽기(1.25×)";

  return [
    {
      kind: "base" as const,
      icon: kind === "youtube" ? "▶️" : "📄",
      label: baseLabel,
      minutes: baseMinutes,
      display: formatDurationLabel(baseMinutes),
    },
    {
      kind: "focus" as const,
      icon: "🎯",
      label: focusLabel,
      minutes: focusedMinutes,
      display: formatDurationLabel(focusedMinutes),
    },
    {
      kind: "total" as const,
      icon: "⏱️",
      label: "이 링크 =",
      minutes: focusedMinutes,
      display: formatDurationLabel(focusedMinutes),
    },
  ];
}

function unavailableReceipt(title: string, detail: string): TimeReceipt {
  return {
    available: false,
    kind: null,
    kindLabel: "시간",
    title,
    baseMinutes: 0,
    focusedMinutes: 0,
    headline: "시간 영수증 준비 중",
    detail,
    disclaimer: "참고용 추정치 · 실제 소요 시간은 달라질 수 있어요.",
    lines: [],
  };
}

function buildYouTubeReceipt(
  title: string,
  durationSeconds: number,
  options?: { isShorts?: boolean }
) {
  const baseMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const focusedMinutes = applyFocusMinutes(baseMinutes);
  const kindLabel = options?.isShorts ? "YouTube 쇼츠" : "YouTube";

  const headline =
    durationSeconds < 60
      ? `${durationSeconds}초 영상 · 집중 시 약 ${formatDurationLabel(focusedMinutes)}`
      : `${formatDurationFromSeconds(durationSeconds)} 영상 · 집중 시 약 ${formatDurationLabel(focusedMinutes)}`;

  return {
    available: true,
    kind: "youtube" as const,
    kindLabel,
    title,
    baseMinutes,
    focusedMinutes,
    headline,
    detail: `${kindLabel} · 재생 ${formatDurationLabel(baseMinutes)} · 메모·멈춤까지 감안하면 ${formatDurationLabel(focusedMinutes)}`,
    disclaimer:
      "참고용 추정치입니다. 실제 시청 시간은 배속·건너뛰기·댓글 확인에 따라 달라질 수 있어요.",
    lines: buildLines(baseMinutes, focusedMinutes, "youtube"),
  };
}

function buildArticleReceipt(title: string, baseMinutes: number) {
  const focusedMinutes = applyFocusMinutes(baseMinutes);
  const headline = `약 ${formatDurationLabel(baseMinutes)} 읽기 · 집중 시 ${formatDurationLabel(focusedMinutes)}`;

  return {
    available: true,
    kind: "article" as const,
    kindLabel: "기사 · 글",
    title,
    baseMinutes,
    focusedMinutes,
    headline,
    detail: `본문 길이 추정 · 스크롤·링크 클릭까지 포함하면 ${formatDurationLabel(focusedMinutes)}`,
    disclaimer:
      "참고용 추정치입니다. 글 길이·읽기 속도·이미지·댓글에 따라 실제 시간은 달라질 수 있어요.",
    lines: buildLines(baseMinutes, focusedMinutes, "article"),
  };
}

export async function buildTimeReceiptSnapshot(input: {
  url: string;
  title?: string | null;
  domain?: string | null;
  source_type?: string | null;
  category?: string | null;
}): Promise<TimeReceipt> {
  const title = input.title?.trim() || input.url;
  const domain = input.domain?.trim() || "";

  if (input.source_type === "youtube" || isYouTubeDomain(domain)) {
    const durationSeconds = await fetchYouTubeDurationSeconds(input.url);
    if (!durationSeconds) {
      return unavailableReceipt(
        title,
        "영상 길이를 아직 가져오지 못했어요. 잠시 후 다시 열어 주세요."
      );
    }

    return buildYouTubeReceipt(title, durationSeconds, {
      isShorts: isYouTubeShortsUrl(input.url),
    });
  }

  if (isArticleUrl(input.url, input.source_type, input.category)) {
    const readingMinutes = await fetchArticleReadingMinutes(input.url);
    if (!readingMinutes) {
      return unavailableReceipt(
        title,
        "본문 길이를 추정하지 못했어요. 긴 글·뉴스·블로그에서 계산됩니다."
      );
    }

    return buildArticleReceipt(title, readingMinutes);
  }

  return unavailableReceipt(title, "YouTube·기사·블로그 링크에서 계산됩니다.");
}

export {
  buildYouTubeReceipt,
  buildArticleReceipt,
  applyFocusMinutes,
  unavailableReceipt,
};
