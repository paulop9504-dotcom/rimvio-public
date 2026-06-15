import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import {
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import {
  buildNaverShoppingSearchHref,
  buildNaverWebSearchHref,
} from "@/lib/actions/search-urls";
import { resolveSearchQuery } from "@/lib/search-intent/resolve-search-intent";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import {
  parseEntityFacetIntent,
  type EntityFacetKind,
} from "@/lib/context-resolver/discovery/parse-entity-facet-intent";

function facetSearchQuery(entity: string, facet: EntityFacetKind): string {
  switch (facet) {
    case "price":
      return resolveSearchQuery({ text: `${entity} 뷔페 가격` });
    case "hours":
      return resolveSearchQuery({ text: `${entity} 영업시간` });
    case "reserve":
      return resolveSearchQuery({ text: `${entity} 예약` });
  }
}

function defaultHoursSummary(entity: string): string {
  return `${entity} 영업시간은 지점마다 달라요. 가까운 매장을 골라 확인해 보세요.`;
}

async function resolveHoursSummary(entity: string): Promise<string> {
  if (!isNaverSearchConfigured()) {
    return defaultHoursSummary(entity);
  }

  const candidates = await fetchNaverLocalPlaceCandidates({
    query: entity,
    display: 3,
  });
  const top = candidates[0];
  if (!top) {
    return defaultHoursSummary(entity);
  }

  if (top.open_now) {
    return `${top.name} — 지금 영업 중이에요. 다른 지점 시간은 지도에서 확인해 보세요.`;
  }

  return `${top.name} — 지금은 영업 종료로 보여요. 지점별 시간은 지도에서 확인해 보세요.`;
}

export function buildEntityFacetResult(message: string): OrchestratorResult | null {
  const intent = parseEntityFacetIntent(message);
  if (!intent) {
    return null;
  }

  const { entity, facet } = intent;
  const searchQuery = facetSearchQuery(entity, facet);

  const actions = [];
  if (facet === "price") {
    actions.push(
      createOpenAction({
        label: "가격 검색",
        href: buildNaverShoppingSearchHref(searchQuery),
        icon: "link",
        copyText: searchQuery,
      }),
      createOpenAction({
        label: "웹에서 보기",
        href: buildNaverWebSearchHref(searchQuery),
        icon: "link",
        copyText: searchQuery,
      })
    );
  } else if (facet === "hours") {
    actions.push(
      createOpenAction({
        label: "지점 찾기",
        href: buildNaverMapSearchHref(searchQuery),
        icon: "map",
        copyText: searchQuery,
        fallbackHref: buildNaverMapSearchWebHref(searchQuery),
      }),
      createOpenAction({
        label: "웹에서 보기",
        href: buildNaverWebSearchHref(searchQuery),
        icon: "link",
        copyText: searchQuery,
      })
    );
  } else {
    actions.push(
      createOpenAction({
        label: "예약 검색",
        href: buildNaverWebSearchHref(searchQuery),
        icon: "link",
        copyText: searchQuery,
      }),
      createOpenAction({
        label: "지점 찾기",
        href: buildNaverMapSearchHref(`${entity} 매장`),
        icon: "map",
        copyText: `${entity} 매장`,
        fallbackHref: buildNaverMapSearchWebHref(`${entity} 매장`),
      })
    );
  }

  const summary =
    facet === "price"
      ? `${entity} 요금은 지점·요일·이벤트마다 달라요. 아래에서 최신 가격을 확인해 보세요.`
      : facet === "reserve"
        ? `${entity} 예약은 지점마다 앱·전화로 가능해요. 아래에서 예약 방법을 찾아볼게요.`
        : defaultHoursSummary(entity);

  return {
    summary,
    actions,
    source: "rules",
    confidence: 0.9,
    disclosure: facet === "price" ? "medium" : "low",
    actionsRevealed: true,
    pendingConfirm: false,
    presentation: { mode: "ACTION" },
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    thought: `entity_facet · ${entity} · ${facet}`,
  };
}

export async function orchestrateEntityFacet(
  message: string
): Promise<OrchestratorResult | null> {
  const intent = parseEntityFacetIntent(message);
  const base = buildEntityFacetResult(message);
  if (!base || !intent || intent.facet !== "hours") {
    return base;
  }

  return {
    ...base,
    summary: await resolveHoursSummary(intent.entity),
  };
}
