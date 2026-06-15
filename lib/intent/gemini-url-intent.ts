import { geminiApiKey, geminiVisionModel } from "@/lib/locate/gemini-config";
import { captureVisionProvider } from "@/lib/locate/vision-provider-config";
import { callOpenAiTextJson } from "@/lib/llm/openai-json-client";
import {
  routeLink,
  ROUTE_CONFIDENCE_THRESHOLD,
  type RouteMode,
} from "@/lib/routing/intelligent-router";
import type { UrlPageMetadata } from "@/lib/share/scrape-url-metadata";
import {
  pickUrlDisplayTitle,
  pickUrlSummary,
} from "@/lib/share/scrape-url-metadata";

export type UrlIntentCategory = "media" | "commerce" | "article" | "unknown";

export type UrlIntentResult = {
  category: UrlIntentCategory;
  confidence_score: number;
  reasoning_path: string;
  suggested_action: string | null;
  fallback: "gemini" | "rules";
};

export const URL_INTENT_PROMPT = `# Role
You are Rimvio URL Intent Router. Classify shared links by the user's likely goal — not by raw URL noise.

# Input
You receive: cleaned URL, page title, og:description (may be partial).

# Categories (exactly one)
- media — YouTube, Netflix, TVING, Wavve, Spotify, Twitch, etc. User wants to watch/listen/play.
- commerce — Coupang, Naver Shopping, Bunjang, Joongna, Amazon product pages. User wants price check, compare, or cart.
- article — News, blogs, Brunch, Medium, Naver post/cafe articles. User wants summary or read-later.
- unknown — Generic homepage, login, or insufficient signal.

# Output (strict JSON only)
{
  "category": "media" | "commerce" | "article" | "unknown",
  "confidence_score": 0.0,
  "reasoning_path": "One sentence: why this category",
  "suggested_action": "재생/시청" | "가격 확인/장바구니" | "3줄 요약/나중에 읽기" | null
}

Rules:
- Ignore utm/fbclid/gclid — already stripped from URL.
- Prefer og:title + description over domain guessing when available.
- confidence_score >= 0.7 only when title/description clearly match category.
- suggested_action must match category (media→재생/시청, commerce→가격 확인/장바구니, article→3줄 요약/나중에 읽기, unknown→null).`;

const URL_INTENT_CATEGORIES = new Set<UrlIntentCategory>([
  "media",
  "commerce",
  "article",
  "unknown",
]);

const SUGGESTED_ACTION: Record<UrlIntentCategory, string | null> = {
  media: "재생/시청",
  commerce: "가격 확인/장바구니",
  article: "3줄 요약/나중에 읽기",
  unknown: null,
};

export function classifyUrlIntentByRules(input: {
  url: string;
  domain: string;
  title?: string | null;
  description?: string | null;
}): UrlIntentResult {
  const blob = `${input.url} ${input.domain} ${input.title ?? ""} ${input.description ?? ""}`.toLowerCase();

  if (/youtube|youtu\.be|netflix|tving|wavve|disneyplus|spotify|twitch|watch\?v=|\/shorts\//i.test(blob)) {
    return {
      category: "media",
      confidence_score: 0.88,
      reasoning_path: "영상/음악 도메인 또는 URL 패턴",
      suggested_action: SUGGESTED_ACTION.media,
      fallback: "rules",
    };
  }

  if (
    /coupang|gmarket|11st|musinsa|smartstore|shopping\.naver|joongna|bunjang|daangn|amazon\.|\/product|\/vp\/products/i.test(
      blob
    )
  ) {
    return {
      category: "commerce",
      confidence_score: 0.86,
      reasoning_path: "쇼핑/중고 도메인 또는 상품 URL 패턴",
      suggested_action: SUGGESTED_ACTION.commerce,
      fallback: "rules",
    };
  }

  if (
    /news\.|brunch|medium|tistory|blog\.naver|post\.naver|\/article|\/news|press|editorial/i.test(
      blob
    ) ||
    /뉴스|기사|칼럼|브런치|블로그|post/i.test(blob)
  ) {
    return {
      category: "article",
      confidence_score: 0.8,
      reasoning_path: "뉴스/블로그 URL 또는 제목 신호",
      suggested_action: SUGGESTED_ACTION.article,
      fallback: "rules",
    };
  }

  return {
    category: "unknown",
    confidence_score: 0.35,
    reasoning_path: "분류 신호 부족 — 일반 웹페이지",
    suggested_action: null,
    fallback: "rules",
  };
}

function parseUrlIntentJson(raw: string): UrlIntentResult | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced ?? trimmed).trim();

  try {
    const parsed = JSON.parse(candidate) as {
      category?: string;
      confidence_score?: number;
      confidence?: number;
      reasoning_path?: string;
      suggested_action?: string | null;
    };

    const category = URL_INTENT_CATEGORIES.has(parsed.category as UrlIntentCategory)
      ? (parsed.category as UrlIntentCategory)
      : "unknown";

    const confidence_score =
      typeof parsed.confidence_score === "number"
        ? parsed.confidence_score
        : typeof parsed.confidence === "number"
          ? parsed.confidence
          : 0.5;

    return {
      category,
      confidence_score,
      reasoning_path:
        parsed.reasoning_path?.trim() || "Gemini URL intent classification",
      suggested_action:
        parsed.suggested_action?.trim() ||
        SUGGESTED_ACTION[category],
      fallback: "gemini",
    };
  } catch {
    return null;
  }
}

async function callGeminiUrlIntent(input: {
  url: string;
  title: string | null;
  description: string | null;
}): Promise<UrlIntentResult | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return null;
  }

  const model = geminiVisionModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const userBlock = [
    `cleanedUrl: ${input.url}`,
    `title: ${input.title ?? "(none)"}`,
    `ogDescription: ${input.description ?? "(none)"}`,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${URL_INTENT_PROMPT}\n\n${userBlock}` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  return text ? parseUrlIntentJson(text) : null;
}

async function callLlmUrlIntent(input: {
  url: string;
  title: string | null;
  description: string | null;
}): Promise<UrlIntentResult | null> {
  const userBlock = [
    `cleanedUrl: ${input.url}`,
    `title: ${input.title ?? "(none)"}`,
    `ogDescription: ${input.description ?? "(none)"}`,
  ].join("\n");

  if (captureVisionProvider() === "openai") {
    try {
      const text = await callOpenAiTextJson({
        systemPrompt: URL_INTENT_PROMPT,
        userText: userBlock,
      });
      return text ? parseUrlIntentJson(text) : null;
    } catch {
      return null;
    }
  }

  return callGeminiUrlIntent(input);
}

export const URL_INTENT_RULES_SHORT_CIRCUIT = 0.82;
export const URL_INTENT_ROUTER_SHORT_CIRCUIT = 0.9;

function urlIntentCategoryFromRouteMode(mode: RouteMode): UrlIntentCategory | null {
  switch (mode) {
    case "media_play":
      return "media";
    case "commerce_compare":
      return "commerce";
    case "news_summary":
      return "article";
    default:
      return null;
  }
}

const ROUTER_DOMAIN_MODES = new Set<RouteMode>([
  "media_play",
  "commerce_compare",
  "news_summary",
]);

/** intelligent-router short-circuit — obvious domains skip Gemini entirely. */
export function classifyUrlIntentFromRouter(input: {
  url: string;
  domain: string;
  title?: string | null;
  description?: string | null;
}): UrlIntentResult | null {
  const routing = routeLink({
    url: input.url,
    domain: input.domain,
    title: input.title,
    description: input.description,
  });

  const category = urlIntentCategoryFromRouteMode(routing.mode);
  if (!category) {
    return null;
  }

  const domainRuleHit =
    ROUTER_DOMAIN_MODES.has(routing.mode) &&
    !routing.needsFallback &&
    routing.confidence >= ROUTE_CONFIDENCE_THRESHOLD;

  if (!domainRuleHit && routing.confidence < URL_INTENT_ROUTER_SHORT_CIRCUIT) {
    return null;
  }

  return {
    category,
    confidence_score: domainRuleHit
      ? Math.max(routing.confidence, URL_INTENT_RULES_SHORT_CIRCUIT)
      : routing.confidence,
    reasoning_path: `intelligent-router ${routing.mode} (${routing.winner}) — Gemini skip`,
    suggested_action: SUGGESTED_ACTION[category],
    fallback: "rules",
  };
}

export async function classifyUrlIntent(input: {
  url: string;
  metadata?: UrlPageMetadata | null;
}): Promise<UrlIntentResult> {
  const metadata = input.metadata;
  const domain = metadata?.domain ?? new URL(input.url).hostname.replace(/^www\./, "");
  const title = metadata ? pickUrlDisplayTitle(metadata) : null;
  const description = metadata ? pickUrlSummary(metadata) : null;

  const routerIntent = classifyUrlIntentFromRouter({
    url: input.url,
    domain,
    title,
    description,
  });

  if (routerIntent) {
    return routerIntent;
  }

  const rules = classifyUrlIntentByRules({
    url: input.url,
    domain,
    title,
    description,
  });

  if (rules.category === "unknown") {
    const gemini = await callLlmUrlIntent({
      url: input.url,
      title,
      description,
    });

    if (gemini && gemini.confidence_score >= 0.5) {
      return gemini;
    }
  }

  if (rules.confidence_score >= URL_INTENT_RULES_SHORT_CIRCUIT) {
    return rules;
  }

  const gemini = await callLlmUrlIntent({
    url: input.url,
    title,
    description,
  });

  if (gemini && gemini.confidence_score >= 0.5) {
    return gemini;
  }

  return rules;
}

export async function resolveUrlIntentPipeline(rawUrl: string) {
  const { cleanUrl } = await import("@/lib/share/clean-url");
  const { scrapeUrlMetadata } = await import("@/lib/share/scrape-url-metadata");

  const cleanedUrl = cleanUrl(rawUrl);
  const metadata = await scrapeUrlMetadata(cleanedUrl);
  const intent = await classifyUrlIntent({ url: cleanedUrl, metadata });

  return {
    cleanedUrl,
    metadata,
    intent,
  };
}
