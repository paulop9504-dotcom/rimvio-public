import {
  attachCopyToActions,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import {
  fetchPageMetadata,
  normalizeInputUrl,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import { parseGitHubCopyLabel } from "@/lib/resolvers/deep-links";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = 5;

export function isGitHubDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  return normalized === "github.com" || normalized.endsWith(".github.io");
}

type GitHubPathKind = "pull" | "issue" | "compare" | "repo";

function detectGitHubPath(pathname: string): GitHubPathKind {
  if (/\/pull\/\d+/i.test(pathname)) {
    return "pull";
  }

  if (/\/issues\/\d+/i.test(pathname)) {
    return "issue";
  }

  if (/\/compare\//i.test(pathname)) {
    return "compare";
  }

  return "repo";
}

const PATH_ACTIONS: Record<
  GitHubPathKind,
  { label: string; icon: string }
> = {
  pull: { label: "🔍 PR 리뷰하기", icon: "github" },
  issue: { label: "🧠 이슈 보기", icon: "github" },
  compare: { label: "📊 변경 비교", icon: "github" },
  repo: { label: "📂 저장소 열기", icon: "github" },
};

function buildGitHubActions(url: string, pathname: string, title: string | null) {
  const kind = detectGitHubPath(pathname);
  const primaryMeta = PATH_ACTIONS[kind];
  const copyText =
    parseGitHubCopyLabel(pathname) ?? title?.trim() ?? null;

  const primary = createOpenAction({
    label: primaryMeta.label,
    href: url,
    icon: primaryMeta.icon,
    copyText,
  });

  const secondary: LinkActionItem[] = [];

  if (kind !== "repo") {
    secondary.push(
      createOpenAction({
        label: "📂 저장소 열기",
        href: url.replace(/\/(pull|issues)\/\d+.*/i, ""),
        icon: "github",
        copyText,
      })
    );
  }

  secondary.push(
    createOpenAction({
      label: openOriginalLabel(),
      href: url,
      icon: "external-link",
      copyText,
    })
  );

  return attachCopyToActions([primary, ...secondary], copyText).slice(
    0,
    MAX_ACTIONS
  );
}

export const githubEnricher: Enricher = {
  id: "github-v1",
  domains: ["github.com"],

  async enrich(
    rawUrl: string,
    _context: EnricherContext
  ): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const normalized = withDomainFallback(metadata, {
      title: metadata.title,
      image: metadata.image,
      description: metadata.description,
    });

    const actions = buildGitHubActions(
      normalized.url,
      parsed.pathname,
      normalized.title
    );

    return {
      url: normalized.url,
      domain: "github.com",
      title: normalized.title,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "github-v1",
      source_type: "github",
      fallback: normalized.fallback,
    };
  },
};

export { detectGitHubPath };
