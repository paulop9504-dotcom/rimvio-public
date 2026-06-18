import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { resolveCompareDestinations } from "@/lib/markets/resolve-compare-destinations";
import type { CompareDestinationId } from "@/lib/markets/types";
import type { LinkActionItem } from "@/types/database";

export function buildMarketCompareActions(
  ctx: ExtensionContext,
  options?: { maxActions?: number; excludeDestinationIds?: CompareDestinationId[] }
): LinkActionItem[] {
  const plan = resolveCompareDestinations({
    title: ctx.title,
    domain: ctx.domain,
    sourceUrl: ctx.sourceUrl,
    locale: ctx.appLocale,
    category: ctx.linkCategory,
    source_type: ctx.sourceType,
    excludeDestinationIds: options?.excludeDestinationIds,
  });

  if (!plan || plan.destinations.length === 0) {
    return [];
  }

  const [primary, ...secondary] = plan.destinations;
  const actions: LinkActionItem[] = [
    createOpenAction({
      label: plan.primaryLabel,
      href: primary.buildHref(plan.query),
      icon: "link",
      copyText: plan.query,
      payload: {
        marketPack: {
          market: plan.market,
          lane: plan.lane,
          destination: primary.id,
        },
      },
    }),
  ];

  for (const destination of secondary.slice(0, 2)) {
    actions.push(
      createOpenAction({
        label: destination.label,
        href: destination.buildHref(plan.query),
        icon: "link",
        copyText: plan.query,
        payload: {
          marketPack: {
            market: plan.market,
            lane: plan.lane,
            destination: destination.id,
          },
        },
      })
    );
  }

  return actions.slice(0, options?.maxActions ?? 4);
}
