import { toDomainFamily } from "@/lib/personalization/action-family";
import { routeLink } from "@/lib/routing/intelligent-router";
import type { RouteMode } from "@/lib/routing/intelligent-router";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isMapUrl } from "@/lib/enrichers/map";
import { isYouTubeDomain } from "@/lib/enrichers/youtube-url";

/** Rimvio briefing lenses — injected before the AI task, not sent raw. */
export const RIMVIO_BRIEFING_LENSES = [
  "인지적 과부하 해소",
  "압도적인 시간 압축",
  "개인의 능력 확장",
  "나만을 위한 맥락 이해",
] as const;

export type AiPromptContextInput = {
  sourceUrl: string;
  domain: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  routeMode?: RouteMode | null;
};

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function isPortalHome(url: string, domain: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    const host = normalizeDomain(parsed.hostname || domain);

    if (path !== "/" && path !== "/main" && path !== "/index.html") {
      return false;
    }

    return /naver|daum|google|yahoo|bing|kakao\.com$/i.test(host);
  } catch {
    return false;
  }
}

function inferIntentLabel(mode: RouteMode | null | undefined) {
  switch (mode) {
    case "commerce_compare":
      return "쇼핑·가격 비교";
    case "news_summary":
      return "뉴스·정보 읽기";
    case "map_navigate":
      return "장소·이동";
    case "media_play":
      return "영상·미디어";
    case "ask_user":
      return "목적 확인 필요";
    default:
      return "일반 탐색";
  }
}

/**
 * Deterministic one-liner: what this link likely is (no LLM).
 */
export function describeLinkBrief(input: AiPromptContextInput): string {
  const domain = normalizeDomain(input.domain);
  const url = input.sourceUrl;
  const title = input.title?.trim() || null;
  const routing =
    input.routeMode != null
      ? { mode: input.routeMode, winner: "uncategorized" as const }
      : routeLink({
          url,
          domain,
          title,
          description: input.description,
        });

  if (isPortalHome(url, domain)) {
    if (/naver/i.test(domain)) {
      return "네이버 포털 메인 페이지입니다. 검색·뉴스·쇼핑·증권 등 여러 서비스로 들어가는 허브 링크예요.";
    }
    if (/daum/i.test(domain)) {
      return "다음 포털 메인 페이지입니다. 뉴스·검색·커뮤니티 등으로 분기하는 입구 링크예요.";
    }
    if (/google/i.test(domain)) {
      return "Google 메인/검색 허브 페이지입니다. 검색과 각종 Google 서비스로 연결되는 입구예요.";
    }
    return "포털·허브형 메인 페이지로, 여러 하위 서비스로 분기하는 링크일 가능성이 높아요.";
  }

  if (isCommerceDomain(domain) || routing.mode === "commerce_compare") {
    return "상품·구매와 관련된 commerce 링크입니다. 가격·옵션·구매 결정에 초점을 맞춰 브리핑해 주세요.";
  }

  if (isMapUrl(url) || routing.mode === "map_navigate") {
    return "지도·장소·이동과 관련된 링크입니다. 위치, 방문 목적, 다음 행동(길찾기·예약)을 중심으로 브리핑해 주세요.";
  }

  if (isYouTubeDomain(domain) || routing.mode === "media_play") {
    return "영상·미디어 콘텐츠 링크입니다. 핵심 메시지와 시청 포인트 위주로 압축해 주세요.";
  }

  if (/news|article|blog|press|story|column/i.test(url) || routing.mode === "news_summary") {
    return "기사·정보 콘텐츠 링크입니다. 사실 관계와 핵심 논지를 빠르게 파악할 수 있게 정리해 주세요.";
  }

  if (/github|gitlab|docs|notion|figma|stackoverflow/i.test(domain)) {
    return "개발·문서·협업 자료 링크입니다. 무엇을 해결/학습할 수 있는지 실행 관점으로 정리해 주세요.";
  }

  if (title && title.length >= 4 && !/^(home|index|main|네이버|naver)$/i.test(title)) {
    return `「${title}」 관련 페이지로 보입니다. 사용자가 이 링크를 저장한 맥락에서 지금 필요한 행동을 중심으로 브리핑해 주세요.`;
  }

  return `${domain} 도메인의 웹 페이지입니다. 페이지를 열어 내용을 확인한 뒤, 사용자가 바로 행동할 수 있게 압축해 주세요.`;
}

export function formatBriefingLensTags() {
  return RIMVIO_BRIEFING_LENSES.join(", ");
}

export function formatEnrichedTitle(title: string | null | undefined, domain: string) {
  const base = title?.trim() || normalizeDomain(domain) || "링크";
  return `${base} (${formatBriefingLensTags()})`;
}

export type ContextualSummaryPromptOptions = {
  task?: "summary_keywords" | "read_aloud" | "summary_only";
};

/**
 * Build a two-layer prompt:
 * 1) Link brief + Rimvio briefing lenses (context)
 * 2) Concrete AI task + enriched title + URL
 */
export function buildContextualSummaryPrompt(
  input: AiPromptContextInput,
  options: ContextualSummaryPromptOptions = {}
): string {
  const task = options.task ?? "summary_keywords";
  const linkBrief = describeLinkBrief(input);
  const enrichedTitle = formatEnrichedTitle(input.title, input.domain);
  const intent = inferIntentLabel(input.routeMode ?? routeLink({
    url: input.sourceUrl,
    domain: input.domain,
    title: input.title,
    description: input.description,
  }).mode);

  const taskBlock =
    task === "read_aloud"
      ? [
          "아래 링크 내용을 자연스러운 한국어로 읽기 좋게 정리해 주세요.",
          "긴 문장은 2문장 이내로 나누고, 핵심만 남겨 주세요.",
        ]
      : task === "summary_only"
        ? ["아래 링크를 한국어로 3줄 요약해 주세요."]
        : [
            "아래 링크를 방문해 내용을 파악한 뒤, 한국어로:",
            "1) 3줄 요약",
            "2) 핵심 키워드 5개 bullet",
          ];

  const lines = [
    "당신은 Rimvio Action Hub의 AI 브리핑 어시스턴트입니다.",
    "",
    "## 1. 링크 설명 (사전 분석)",
    linkBrief,
    "",
    "## 2. 브리핑 맥락 (Rimvio 렌즈)",
    ...RIMVIO_BRIEFING_LENSES.map((lens) => `- ${lens}: 이 링크를 이 관점에서 압축·해석해 주세요.`),
    "",
    `추정 사용자 의도: ${intent}`,
    "",
    "## 3. 실행 요청",
    ...taskBlock,
    "",
    `제목: ${enrichedTitle}`,
    `URL: ${input.sourceUrl}`,
  ];

  if (input.description?.trim()) {
    lines.push(`페이지 설명(메타): ${input.description.trim()}`);
  }

  lines.push("");
  lines.push(
    "주의: 링크를 직접 열어보고 판단하세요. 불확실하면 추측 대신 「확인 필요」라고 표시하세요."
  );

  return lines.join("\n");
}

export function aiPromptContextFromExtension(input: {
  sourceUrl: string;
  domain: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  routing?: { mode?: RouteMode | null } | null;
}): AiPromptContextInput {
  return {
    sourceUrl: input.sourceUrl,
    domain: input.domain,
    title: input.title,
    description: input.description,
    category: input.category,
    routeMode: input.routing?.mode ?? null,
  };
}

/** @deprecated typo guard — use describeLinkBrief */
export const describeLinkForPrompt = describeLinkBrief;
