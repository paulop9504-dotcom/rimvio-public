import { isGarbledText } from "@/lib/enrichers/url-intelligence";

const CHARSET_ALIASES: Record<string, string> = {
  utf8: "utf-8",
  "utf-8": "utf-8",
  "euc-kr": "euc-kr",
  euckr: "euc-kr",
  "ks_c_5601-1987": "euc-kr",
  "windows-949": "euc-kr",
  cp949: "euc-kr",
  "iso-8859-1": "iso-8859-1",
  "windows-1252": "windows-1252",
};

export function normalizeHtmlCharset(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const key = raw.trim().toLowerCase().replace(/['"]/g, "");
  return CHARSET_ALIASES[key] ?? key;
}

export function parseCharsetFromContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }

  const match = contentType.match(/charset=([^;\s]+)/i);
  return normalizeHtmlCharset(match?.[1]);
}

export function detectCharsetFromHtmlBytes(bytes: Uint8Array): string | null {
  const probe = new TextDecoder("latin1").decode(bytes.slice(0, 8192));

  const httpEquiv = probe.match(
    /<meta[^>]+http-equiv=["']content-type["'][^>]+content=["'][^"']*charset=([^"'>\s]+)/i
  );
  if (httpEquiv?.[1]) {
    return normalizeHtmlCharset(httpEquiv[1]);
  }

  const metaCharset = probe.match(/<meta[^>]+charset=["']?([^"'>\s;]+)/i);
  if (metaCharset?.[1]) {
    return normalizeHtmlCharset(metaCharset[1]);
  }

  return null;
}

function tryDecode(bytes: Uint8Array, charset: string): string | null {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return null;
  }
}

function sampleTitleFromHtml(html: string): string | null {
  const og = html.match(
    /<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  if (og?.[1]?.trim()) {
    return og[1].trim();
  }

  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return title?.[1]?.trim() ?? null;
}

/** Decode HTML bytes — tries declared/meta charset, then UTF-8 vs EUC-KR heuristics. */
export function decodeHtmlBytes(
  bytes: Uint8Array,
  declaredCharset?: string | null
): string {
  const fromMeta = detectCharsetFromHtmlBytes(bytes);
  const candidates = [
    declaredCharset,
    fromMeta,
    "utf-8",
    "euc-kr",
  ]
    .map((value) => normalizeHtmlCharset(value))
    .filter((value, index, list): value is string => {
      return Boolean(value) && list.indexOf(value) === index;
    });

  let fallbackHtml: string | null = null;

  for (const charset of candidates) {
    const html = tryDecode(bytes, charset);
    if (!html) {
      continue;
    }

    fallbackHtml ??= html;

    const sample = sampleTitleFromHtml(html);
    if (!sample) {
      return html;
    }

    if (!isGarbledText(sample)) {
      return html;
    }
  }

  return fallbackHtml ?? tryDecode(bytes, "utf-8") ?? "";
}

export function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}
