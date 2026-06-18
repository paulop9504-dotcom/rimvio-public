import { readNaverApiCredentials } from "@/lib/naver/config";
import type { NaverSearchItem, NaverSearchKind, NaverSearchResult } from "@/lib/naver/types";

const NAVER_OPENAPI_BASE = "https://openapi.naver.com/v1/search";

const KIND_PATH: Record<NaverSearchKind, string> = {
  local: "local.json",
  shop: "shop.json",
  news: "news.json",
  blog: "blog.json",
  webkr: "webkr.json",
  image: "image.json",
  book: "book.json",
  encyc: "encyc.json",
  cafearticle: "cafearticle.json",
};

const MAX_DISPLAY: Partial<Record<NaverSearchKind, number>> = {
  local: 5,
  shop: 100,
  news: 100,
  blog: 100,
  webkr: 100,
  image: 100,
  book: 100,
  encyc: 100,
  cafearticle: 100,
};

export class NaverSearchApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NaverSearchApiError";
    this.status = status;
  }
}

export type NaverSearchOptions = {
  display?: number;
  start?: number;
  sort?: string;
};

type NaverSearchWire = {
  total?: number;
  start?: number;
  display?: number;
  items?: NaverSearchItem[];
  errorMessage?: string;
  errorCode?: string;
};

function clampDisplay(kind: NaverSearchKind, display?: number): number {
  const max = MAX_DISPLAY[kind] ?? 10;
  const value = display ?? (kind === "local" ? 5 : 10);
  return Math.min(Math.max(value, 1), max);
}

function clampStart(start?: number): number {
  return Math.min(Math.max(start ?? 1, 1), 1000);
}

export async function naverSearch(
  kind: NaverSearchKind,
  query: string,
  options?: NaverSearchOptions
): Promise<NaverSearchResult> {
  const credentials = readNaverApiCredentials();
  if (!credentials) {
    throw new NaverSearchApiError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not configured", 503);
  }

  const trimmed = query.trim();
  if (!trimmed) {
    throw new NaverSearchApiError("query is required", 400);
  }

  const params = new URLSearchParams({
    query: trimmed,
    display: String(clampDisplay(kind, options?.display)),
    start: String(clampStart(options?.start)),
  });

  if (options?.sort?.trim()) {
    params.set("sort", options.sort.trim());
  }

  const response = await fetch(`${NAVER_OPENAPI_BASE}/${KIND_PATH[kind]}?${params.toString()}`, {
    headers: {
      "X-Naver-Client-Id": credentials.clientId,
      "X-Naver-Client-Secret": credentials.clientSecret,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  const payload = (await response.json()) as NaverSearchWire;

  if (!response.ok) {
    const message =
      payload.errorMessage?.trim() ||
      `Naver Search API failed (${response.status})`;
    throw new NaverSearchApiError(message, response.status);
  }

  return {
    kind,
    query: trimmed,
    total: payload.total ?? 0,
    start: payload.start ?? 1,
    display: payload.display ?? clampDisplay(kind, options?.display),
    items: payload.items ?? [],
  };
}

export function parseNaverSearchKind(raw: string | null | undefined): NaverSearchKind | null {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized in KIND_PATH) {
    return normalized as NaverSearchKind;
  }
  if (normalized === "web") {
    return "webkr";
  }
  if (normalized === "shopping") {
    return "shop";
  }
  return null;
}
