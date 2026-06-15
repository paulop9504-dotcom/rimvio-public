import { buildCompareQuery } from "@/lib/commerce/compare-query";
import {
  buildChatGptPromptHref,
} from "@/lib/actions/search-urls";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { buildMarketCompareActions } from "@/lib/markets/build-compare-actions";
import { looksLikeTravelIntent } from "@/lib/markets/travel-intent";
import {
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import {
  aiPromptContextFromExtension,
  buildContextualSummaryPrompt,
} from "@/lib/actions/ai-prompt-context";
import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import type { SmartSuite } from "@/lib/actions/smart-suite-types";
import type { LinkActionItem } from "@/types/database";
import type { RouterResult, RouteMode } from "@/lib/routing/intelligent-router";
import { ROUTE_CONFIDENCE_THRESHOLD } from "@/lib/routing/intelligent-router";

function queryFrom(ctx: ExtensionContext) {
  return (
    buildCompareQuery(ctx.title, ctx.domain) ??
    ctx.title?.trim() ??
    ctx.domain.replace(/^www\./, "")
  );
}

function buildCompareActions(ctx: ExtensionContext): LinkActionItem[] {
  return buildMarketCompareActions(ctx);
}

function buildNewsActions(ctx: ExtensionContext): LinkActionItem[] {
  const prompt = buildContextualSummaryPrompt(
    aiPromptContextFromExtension(ctx),
    { task: "summary_keywords" }
  );

  return [
    createOpenAction({
      label: "📌 3줄 요약/핵심어",
      href: buildChatGptPromptHref(prompt),
      icon: "sparkles",
      copyText: prompt,
    }),
  ];
}

function buildTravelFallbackActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = queryFrom(ctx);

  return [
    createOpenAction({
      label: "🗺 지도에서 보기",
      href: buildNaverMapSearchWebHref(q),
      icon: "map",
      copyText: q,
      fallbackHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
    }),
    ...buildNewsActions(ctx),
    createOpenAction({
      label: "🔗 그냥 열기",
      href: ctx.sourceUrl,
      icon: "external-link",
      copyText: q,
    }),
  ];
}

export function buildFallbackModeActions(
  ctx: ExtensionContext
): LinkActionItem[] {
  if (
    looksLikeTravelIntent({
      title: ctx.title,
      domain: ctx.domain,
      sourceUrl: ctx.sourceUrl,
      category: ctx.linkCategory,
      source_type: ctx.sourceType,
    })
  ) {
    return buildTravelFallbackActions(ctx);
  }

  const q = queryFrom(ctx);

  return [
    ...buildCompareActions(ctx),
    ...buildNewsActions(ctx),
    createOpenAction({
      label: "🔗 그냥 열기",
      href: ctx.sourceUrl,
      icon: "external-link",
      copyText: q,
    }),
  ];
}

export function filterSuitesByRouting(
  suites: SmartSuite[],
  routing?: RouterResult
): SmartSuite[] {
  if (!routing || routing.confidence < ROUTE_CONFIDENCE_THRESHOLD) {
    return suites;
  }

  const next = new Set(suites);

  if (routing.mode === "commerce_compare") {
    next.delete("intellectual");
    next.add("decision");
  }

  if (routing.mode === "news_summary") {
    next.delete("decision");
    next.add("intellectual");
  }

  if (routing.mode === "map_navigate") {
    next.add("travel");
  }

  if (routing.mode === "media_play") {
    next.add("execution");
  }

  return [...next];
}

function hasSimilarCompareAction(actions: LinkActionItem[]) {
  return actions.some((action) =>
    /알맞은 곳|Compare on the right|適切なサイト|Compare marketplaces|다나와|최저|쇼핑 비교|price|danawa|번개|중고나라|당근|mercari|ebay|amazon/i.test(
      `${action.label} ${action.href ?? ""}`
    )
  );
}

function hasSimilarSummaryAction(actions: LinkActionItem[]) {
  return actions.some((action) =>
    /요약|summary|핵심/i.test(`${action.label} ${action.href ?? ""}`)
  );
}

export function applyRoutingToActions(
  actions: LinkActionItem[],
  ctx: ExtensionContext,
  routing: RouterResult
): LinkActionItem[] {
  if (actions.length === 0) {
    return actions;
  }

  let next = [...actions];
  const primary = next[0];

  next[0] = {
    ...primary,
    payload: {
      ...(primary.payload ?? {}),
      routeMode: routing.mode,
      routeConfidence: routing.confidence,
      routeWinner: routing.winner,
      routeNeedsFallback: routing.needsFallback,
    },
  };

  if (routing.mode === "commerce_compare" && !hasSimilarCompareAction(next)) {
    const compare = buildCompareActions(ctx);
    next = [next[0], ...compare, ...next.slice(1)];
  }

  if (routing.mode === "news_summary" && !hasSimilarSummaryAction(next)) {
    const summary = buildNewsActions(ctx);
    next = [next[0], ...summary, ...next.slice(1)];
  }

  return next;
}

export function resolveCategoryFromRouting(routing: RouterResult) {
  if (routing.confidence >= ROUTE_CONFIDENCE_THRESHOLD) {
    return routing.winner;
  }

  return null;
}

export function isCommerceRouteMode(mode: RouteMode) {
  return mode === "commerce_compare";
}
