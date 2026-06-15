import {
  attachCopyToActions,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import { withDomainFallback } from "@/lib/enrichers/fetch-page-metadata";
import {
  getPortalSuite,
  type PortalSuiteDef,
} from "@/lib/enrichers/portal-action-suites";
import { resolvePortalSuiteKey } from "@/lib/enrichers/portal-home";
import { rankPortalSuiteActions } from "@/lib/personalization/inbox-profile";
import type {
  EnrichedLink,
  Enricher,
  EnricherContext,
} from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export { isPortalHomeUrl, resolvePortalSuiteKey } from "@/lib/enrichers/portal-home";

function buildPortalActions(
  suite: PortalSuiteDef,
  context: EnricherContext
): LinkActionItem[] {
  const ranked = rankPortalSuiteActions(suite.actions, context.categoryWeights);

  return ranked.map((action) =>
    createOpenAction({
      label: action.label,
      href: action.href,
      icon: action.icon,
      copyText: suite.title,
      fallbackHref: action.href,
    })
  );
}

function portalFallback(domain: string) {
  return {
    gradient: "from-slate-600 to-slate-900",
    initial: domain.charAt(0).toUpperCase(),
    titleFromDomain: false,
    imageFromFallback: true,
  };
}

export const portalEnricher: Enricher = {
  id: "portal-v1",

  async enrich(rawUrl: string, context: EnricherContext): Promise<EnrichedLink> {
    const suiteKey = resolvePortalSuiteKey(rawUrl);
    const suite = suiteKey ? getPortalSuite(suiteKey) : null;

    if (!suite) {
      throw new Error("No portal suite for URL");
    }

    const actions = attachCopyToActions(
      buildPortalActions(suite, context),
      suite.title
    );

    const normalized = withDomainFallback(
      {
        url: rawUrl,
        domain: suite.domain,
        title: null,
        image: null,
        description: suite.subtitle,
        phone: null,
      },
      {
        title: suite.title,
        image: null,
        description: suite.subtitle,
      }
    );

    return {
      url: normalized.url,
      domain: normalized.domain,
      title: `${suite.title} · ${suite.subtitle}`,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "portal-v1",
      source_type: "portal",
      fallback: portalFallback(suite.domain),
    };
  },
};

export function tryEnrichPortal(
  rawUrl: string,
  context: EnricherContext
): Promise<EnrichedLink> | null {
  const suiteKey = resolvePortalSuiteKey(rawUrl);
  if (!suiteKey || !getPortalSuite(suiteKey)) {
    return null;
  }

  return portalEnricher.enrich(rawUrl, context);
}
