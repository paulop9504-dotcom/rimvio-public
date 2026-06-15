import {
  createCopyOnlyAction,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import {
  fetchPageMetadata,
  normalizeInputUrl,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = 5;

export function isKakaoOpenChatUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return host === "open.kakao.com" && parsed.pathname.startsWith("/o/");
  } catch {
    return false;
  }
}

export function isKakaoOpenChatDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "") === "open.kakao.com";
}

function buildKakaoActions(url: string, title: string | null) {
  const copyText = title?.trim() || "오픈채팅";
  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "💬 오픈채팅 입장",
      href: url,
      icon: "kakao",
      copyText: url,
    }),
    createOpenAction({
      label: "🔗 초대 링크 복사 후 입장",
      href: url,
      icon: "link",
      copyText: url,
    }),
  ];

  if (title?.trim()) {
    actions.push(createCopyOnlyAction(`📋 ${title.trim().slice(0, 16)} 복사`, title));
  }

  actions.push(
    createOpenAction({
      label: openOriginalLabel(),
      href: url,
      icon: "external-link",
      copyText,
    })
  );

  return actions.slice(0, MAX_ACTIONS);
}

export const kakaoEnricher: Enricher = {
  id: "kakao-v1",
  domains: ["open.kakao.com"],

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

    const actions = buildKakaoActions(normalized.url, normalized.title);

    return {
      url: normalized.url,
      domain: "open.kakao.com",
      title: normalized.title,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "kakao-v1",
      source_type: "kakao",
      fallback: normalized.fallback,
    };
  },
};
