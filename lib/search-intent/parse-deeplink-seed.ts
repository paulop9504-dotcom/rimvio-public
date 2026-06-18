function decodeQuery(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.replace(/\+/g, " ").trim();
  }
}

const SEARCH_QUERY_KEYS = ["q", "query", "search_query", "search", "keyword", "term", "wd"];

/** Treat deeplink query param as intent seed — not a final search string. */
export function parseDeeplinkSearchSeed(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
      const schemeEnd = trimmed.indexOf("://") + 3;
      const rest = trimmed.slice(schemeEnd);
      const queryStart = rest.indexOf("?");
      if (queryStart >= 0) {
        const params = new URLSearchParams(rest.slice(queryStart + 1));
        for (const key of SEARCH_QUERY_KEYS) {
          const value = params.get(key);
          if (value?.trim()) {
            return decodeQuery(value);
          }
        }
      }

      const pathMatch = rest.match(/\/search\/([^/?#]+)/i);
      if (pathMatch?.[1]) {
        return decodeQuery(pathMatch[1]);
      }
    }

    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    for (const key of SEARCH_QUERY_KEYS) {
      const value = parsed.searchParams.get(key);
      if (value?.trim()) {
        return decodeQuery(value);
      }
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const searchIdx = pathParts.findIndex((part) => part.toLowerCase() === "search");
    if (searchIdx >= 0 && pathParts[searchIdx + 1]) {
      return decodeQuery(pathParts[searchIdx + 1]!);
    }
  } catch {
    const inline = trimmed.match(/[?&](?:q|query|search_query)=([^&#]+)/i);
    if (inline?.[1]) {
      return decodeQuery(inline[1]);
    }
  }

  return null;
}
