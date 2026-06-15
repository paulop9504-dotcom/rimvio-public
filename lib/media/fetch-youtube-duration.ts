import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 384 * 1024;

function parseIso8601Duration(value: string) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? total : null;
}

export function parseYouTubeDurationFromHtml(html: string) {
  const lengthSeconds = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/i)?.[1];
  if (lengthSeconds) {
    const parsed = Number.parseInt(lengthSeconds, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const approxDurationMs = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/i)?.[1];
  if (approxDurationMs) {
    const parsed = Number.parseInt(approxDurationMs, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed / 1000);
    }
  }

  const isoDuration = html.match(/"duration"\s*:\s*"(PT[^"]+)"/i)?.[1];
  if (isoDuration) {
    return parseIso8601Duration(isoDuration);
  }

  return null;
}

export async function fetchYouTubeDurationSeconds(rawUrl: string) {
  const watchUrl = normalizeYouTubeUrl(rawUrl);

  try {
    const response = await fetch(watchUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const html = buffer.subarray(0, MAX_HTML_BYTES).toString("utf8");
    return parseYouTubeDurationFromHtml(html);
  } catch {
    return null;
  }
}
