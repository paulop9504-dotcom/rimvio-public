import { isDeepLinkDispatcherOutput } from "@/lib/deep-link-dispatch/resolve-dispatch";
import type { DeepLinkDispatcherOutput } from "@/lib/deep-link-dispatch/types";

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) {
    return fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return null;
}

export function parseDeepLinkDispatcherJson(text: string): DeepLinkDispatcherOutput | null {
  const raw = extractJsonBlock(text);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isDeepLinkDispatcherOutput(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
