import { RIMVIO } from "@/lib/brand/rimvio";
import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";

const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 256 * 1024;

/** Free scrape of embedded player JSON — no API key. Fragile but $0. */
export async function fetchYouTubeDescription(
  rawUrl: string
): Promise<string | null> {
  const videoUrl = normalizeYouTubeUrl(rawUrl);

  try {
    const response = await fetch(videoUrl, {
      headers: {
        Accept: "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.5",
        "User-Agent":
          `Mozilla/5.0 (compatible; RimvioEnricher/1.0; +https://${RIMVIO.domain})`,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return extractYouTubeDescription(text.slice(0, MAX_BYTES));
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    let html = "";
    let bytes = 0;

    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });

      if (html.includes('"shortDescription"')) {
        break;
      }
    }

    html += decoder.decode();
    await reader.cancel();

    return extractYouTubeDescription(html);
  } catch {
    return null;
  }
}

function extractYouTubeDescription(html: string): string | null {
  const patterns = [
    /"shortDescription"\s*:\s*"((?:\\.|[^"\\])*)"/,
    /"description"\s*:\s*\{\s*"simpleText"\s*:\s*"((?:\\.|[^"\\])*)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return unescapeJsonString(match[1]).trim() || null;
    }
  }

  return null;
}

function unescapeJsonString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
}
