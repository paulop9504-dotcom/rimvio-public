import type {
  BulkMediaClusterEnrichmentItem,
  BulkMediaClusterEnrichmentResult,
  BulkMediaClusterWireSummary,
} from "@/lib/feed/bulk-media-spacetime-types";
import { geminiApiKey, geminiVisionModel, isGeminiConfigured } from "@/lib/locate/gemini-config";
import { callOpenAiTextJson } from "@/lib/llm/openai-json-client";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import { captureVisionProvider } from "@/lib/locate/vision-provider-config";

export const BULK_MEDIA_CLUSTER_PROMPT = `# Role
You are Rimvio batch photo organizer (MEANING layer only).
Deterministic time/place clustering already ran — you name clusters, infer place for GPS-less photos, and resolve ambiguous bundles.

# Tasks
1. **Naming** — short Korean title per cluster (2–8 words), recall-friendly. Examples: "작년 여름 제주", "친구 결혼식", "회사 워크숍"
2. **GPS-less** — when gps_less_count > 0 and a sample photo is attached for that cluster id, infer place_label from visual cues (signage, landmark, scenery). City/region level only.
3. **Ambiguous bundles** — when ambiguous=true, set merge_into_id to another cluster id ONLY if clearly the same trip/event; otherwise null.

# Rules
- Never invent lat/lng coordinates
- place_label only when visually or contextually confident; else null
- title must NOT contain: GPS, AI, 업로드, 포스팅, Geo Social
- Do not merge clusters with conflicting place labels unless sample photo proves same place
- confidence: high | medium | low

# Output JSON
{
  "clusters": [
    {
      "id": "c0",
      "title": "string or null",
      "place_label": "string or null",
      "merge_into_id": "c1 or null",
      "confidence": "high|medium|low"
    }
  ]
}`;

const MAX_VISION_CLUSTERS = 3;

function isLlmConfigured(): boolean {
  return isGeminiConfigured() || isOpenAiConfigured();
}

function parseEnrichmentJson(raw: string): BulkMediaClusterEnrichmentResult | null {
  try {
    const parsed = JSON.parse(raw) as {
      clusters?: Array<{
        id?: string;
        title?: string | null;
        place_label?: string | null;
        merge_into_id?: string | null;
        confidence?: string;
      }>;
    };
    if (!Array.isArray(parsed.clusters)) {
      return null;
    }
    const clusters: BulkMediaClusterEnrichmentItem[] = parsed.clusters
      .map((row) => {
        const id = row.id?.trim();
        if (!id) {
          return null;
        }
        const confidenceRaw = row.confidence?.trim().toLowerCase();
        const confidence =
          confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
            ? confidenceRaw
            : "medium";
        return {
          id,
          title: row.title?.trim() || null,
          placeLabel: row.place_label?.trim() || null,
          mergeIntoId: row.merge_into_id?.trim() || null,
          confidence,
        };
      })
      .filter((row): row is BulkMediaClusterEnrichmentItem => row !== null);

    return clusters.length > 0 ? { clusters } : null;
  } catch {
    return null;
  }
}

async function callGeminiBulkClusterJson(userBlock: string): Promise<string | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return null;
  }

  const model = geminiVisionModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${BULK_MEDIA_CLUSTER_PROMPT}\n\n${userBlock}` }],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? null
  );
}

async function callGeminiBulkClusterVision(input: {
  userBlock: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return null;
  }

  const model = geminiVisionModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${BULK_MEDIA_CLUSTER_PROMPT}\n\n${input.userBlock}` },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? null
  );
}

async function callLlmBulkClusterJson(userBlock: string): Promise<BulkMediaClusterEnrichmentResult | null> {
  if (!isLlmConfigured()) {
    return null;
  }

  try {
    if (captureVisionProvider() === "openai") {
      const text = await callOpenAiTextJson({
        systemPrompt: BULK_MEDIA_CLUSTER_PROMPT,
        userText: userBlock,
        temperature: 0.15,
      });
      return text ? parseEnrichmentJson(text) : null;
    }

    const text = await callGeminiBulkClusterJson(userBlock);
    return text ? parseEnrichmentJson(text) : null;
  } catch {
    return null;
  }
}

function buildUserBlock(clusters: readonly BulkMediaClusterWireSummary[]): string {
  return JSON.stringify({ clusters }, null, 2);
}

function mergeEnrichmentParts(
  base: BulkMediaClusterEnrichmentResult,
  partial: BulkMediaClusterEnrichmentResult,
): BulkMediaClusterEnrichmentResult {
  const byId = new Map(base.clusters.map((row) => [row.id, row]));
  for (const row of partial.clusters) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      title: row.title ?? existing.title,
      placeLabel: row.placeLabel ?? existing.placeLabel,
      mergeIntoId: row.mergeIntoId ?? existing.mergeIntoId,
      confidence:
        row.confidence === "high" || existing.confidence === "high"
          ? "high"
          : row.confidence === "low" && existing.confidence === "low"
            ? "low"
            : "medium",
    });
  }
  return { clusters: [...byId.values()] };
}

/** Server — LLM naming · GPS-less place · ambiguous merge (MEANING layer). */
export async function enrichBulkMediaClusters(input: {
  clusters: readonly BulkMediaClusterWireSummary[];
  samples?: ReadonlyMap<string, { buffer: Buffer; mimeType: string }>;
}): Promise<BulkMediaClusterEnrichmentResult | null> {
  if (input.clusters.length === 0 || !isLlmConfigured()) {
    return null;
  }

  const userBlock = buildUserBlock(input.clusters);
  const base = await callLlmBulkClusterJson(userBlock);
  if (!base) {
    return null;
  }

  const samples = input.samples ?? new Map();
  const visionTargets = input.clusters
    .filter((row) => row.gpsLessCount > 0 && samples.has(row.id))
    .slice(0, MAX_VISION_CLUSTERS);

  let merged = base;
  for (const target of visionTargets) {
    const sample = samples.get(target.id);
    if (!sample) {
      continue;
    }
    const visionBlock = `${userBlock}\n\nFocus cluster id "${target.id}" — sample photo attached for GPS-less inference.`;
    const visionRaw =
      captureVisionProvider() === "openai"
        ? null
        : await callGeminiBulkClusterVision({
            userBlock: visionBlock,
            buffer: sample.buffer,
            mimeType: sample.mimeType,
          });
    const visionParsed = visionRaw ? parseEnrichmentJson(visionRaw) : null;
    if (visionParsed) {
      merged = mergeEnrichmentParts(merged, visionParsed);
    }
  }

  return merged;
}

export function fallbackBulkMediaClusterEnrichment(input: {
  clusters: readonly BulkMediaClusterWireSummary[];
}): BulkMediaClusterEnrichmentResult {
  return {
    fallback: true,
    clusters: input.clusters.map((cluster) => {
      const place = cluster.placeLabel?.trim();
      const title = place ? `${place} 흔적` : null;
      return {
        id: cluster.id,
        title,
        placeLabel: place ?? null,
        mergeIntoId: null,
        confidence: place ? "medium" : "low",
      };
    }),
  };
}
