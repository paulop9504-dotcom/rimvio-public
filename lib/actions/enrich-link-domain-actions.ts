import { buildDomainActions } from "@/lib/actions/build-domain-actions";
import { validateLinkActions } from "@/lib/actions/action-validator";
import { domainBlocksOtherDomains, resolveDomainKey } from "@/lib/actions/domain-context";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import type { LinkActionItem, LinkRow } from "@/types/database";

function actionKey(action: LinkActionItem) {
  return `${action.label}|${action.href ?? ""}|${action.kind}`;
}

function dedupeActions(actions: LinkActionItem[]) {
  const seen = new Set<string>();
  const next: LinkActionItem[] = [];

  for (const action of actions) {
    const key = actionKey(action);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(action);
  }

  return next;
}

function extractTrackingNumber(link: LinkRow) {
  return link.original_url.match(/\b(\d{10,14})\b/)?.[1] ?? null;
}

function isMismatchedDomainAction(action: LinkActionItem, activeDomain: ReturnType<typeof resolveDomainKey>) {
  const label = action.label.toLowerCase();
  if (activeDomain === "travel" && /쇼핑|danawa|쿠팡|장바구니|최저가/.test(label)) {
    return true;
  }
  if (activeDomain === "dining" && /항공|숙소|yanolja|쿠팡/.test(label)) {
    return true;
  }
  if (activeDomain === "shopping" && /웨이팅|캐치테이블|맛집/.test(label)) {
    return true;
  }
  return false;
}

export function enrichLinkWithDomainActions(
  link: LinkRow,
  existing: LinkActionItem[]
): LinkActionItem[] {
  const domain = resolveDomainKey({ link });
  const query = getDisplayTitleForLink(link) ?? link.title ?? "";

  if (domain === "generic") {
    return existing;
  }

  const domainActions = buildDomainActions({
    domain,
    query,
    linkUrl: link.original_url,
    linkDomain: link.domain,
    trackingNumber: extractTrackingNumber(link),
    ocrText: isScreenshotLink(link) ? query : null,
  });

  if (domainActions.length === 0) {
    return existing;
  }

  const compatibleExisting = existing.filter(
    (action) => !isMismatchedDomainAction(action, domain)
  );

  if (domainActions.length >= 4) {
    return validateLinkActions(domainActions.slice(0, 4));
  }

  const merged = dedupeActions([...domainActions, ...compatibleExisting]);

  return validateLinkActions(merged.slice(0, 4));
}

export function buildDomainActionsForCapture(input: {
  kind: string;
  query: string;
  phone?: string | null;
  ocrText?: string | null;
}) {
  const domain = resolveDomainKey({ captureKind: input.kind, message: input.query });
  if (domain === "generic") {
    return [];
  }

  return buildDomainActions({
    domain,
    query: input.query,
    phone: input.phone,
    ocrText: input.ocrText,
  });
}

export function filterActionsByActiveDomain(
  actions: LinkActionItem[],
  activeDomain: ReturnType<typeof resolveDomainKey>
) {
  if (activeDomain === "generic") {
    return actions;
  }

  return actions.filter((action) => {
    const slot = action.payload?.domainSlot;
    if (typeof slot === "string") {
      const slotDomain = String(slot).split("_")[0];
      return !domainBlocksOtherDomains(activeDomain, slotDomain as typeof activeDomain);
    }
    return !isMismatchedDomainAction(action, activeDomain);
  });
}
