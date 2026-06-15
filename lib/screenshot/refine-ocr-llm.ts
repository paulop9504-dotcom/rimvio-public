import { evaluateScreenshotGate } from "@/lib/screenshot/confidence-gate";
import {
  buildConfidenceState,
  toConfidenceBreakdown,
  type ConfidenceBreakdown,
  type ConfidenceState,
} from "@/lib/screenshot/confidence-state";
import { classifyScreenshotInput } from "@/lib/screenshot/classify-intent";
import type { ScreenshotIntentKind } from "@/lib/screenshot/classify-intent";
import {
  finalizeBandAfterLlm,
  needsUserConfirm,
  shouldRunLlmRefine,
  type ConfidenceBand,
} from "@/lib/screenshot/transition-gate";
import {
  isOpenAiConfigured,
  openAiApiKey,
  openAiModel,
} from "@/lib/llm/openai-config";
import { buildIntentKernel } from "@/lib/intent/build-intent-kernel";
import type { IntentKernelResult } from "@/lib/intent/kernel-types";
import type { VisionSnapshot } from "@/lib/vision/types";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
export type { LlmRefineResult } from "@/lib/intent/kernel-types";

export type OcrRefinement = {
  source: "llm" | "skipped";
  kind?: ScreenshotIntentKind;
  query?: string;
  confidence?: number;
  gateReason?: string;
  band?: ConfidenceBand;
  breakdown?: ConfidenceBreakdown;
  state?: ConfidenceState;
  kernel?: IntentKernelResult;
};

const UI_NOISE_LINE =
  /instagram|tiktok|youtube|reels|좋아요|댓글|공유|follow|views|subscriber|saved|profile|story|번역|likes|comments|share|more|home|explore|reels|배터리|LTE|5G|Wi-?Fi|오전|오후|AM|PM|\d{1,2}:\d{2}/i;

export function prefilterOcrForLlm(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && !UI_NOISE_LINE.test(line));

  const compact = lines.join("\n").trim();
  return compact.slice(0, 2400);
}

export function buildOcrRefinePrompt(rawText: string, visionHints: string[]) {
  const hints =
    visionHints.length > 0
      ? `\nVision hints (may help, not mandatory): ${visionHints.slice(0, 5).join(", ")}`
      : "";

  return `You extract ONE actionable entity from noisy mobile screenshot OCR text.

Ignore UI chrome such as likes, comments, follow, share, battery, clock, app chrome, and social metrics.

If the user likely saved a restaurant/cafe/place, return kind "place" with the shop name or address fragment.
If the user likely saved a product (fashion, electronics, goods), return kind "product" with the product or brand name only.
If nothing actionable exists, return kind "unknown" and query "".

Return JSON only:
{"kind":"place|product|unknown","query":"..."}

Rules:
- query must be ONE short phrase in the screenshot language
- no prices, no hashtags, no URLs
- prefer the item the user would search next

OCR text:
${rawText}${hints}`;
}

export function parseOcrRefinementContent(content: string): OcrRefinement | null {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      kind?: string;
      query?: string;
    };

    const kind = parsed.kind?.trim().toLowerCase();
    const query = parsed.query?.replace(/\s+/g, " ").trim();

    if (!query || query.length < 2 || kind === "unknown") {
      return { source: "llm", kind: undefined, query: undefined };
    }

    if (kind !== "place" && kind !== "product") {
      return null;
    }

    return {
      source: "llm",
      kind,
      query: query.slice(0, 80),
    };
  } catch {
    return null;
  }
}

function visionHints(vision?: VisionSnapshot | null) {
  return [
    ...(vision?.bestGuessLabels ?? []),
    ...(vision?.webEntities ?? []),
    ...(vision?.labels ?? []),
  ].filter(Boolean);
}

function buildRefinementResult(input: {
  source: "llm" | "skipped";
  kind?: ScreenshotIntentKind;
  query?: string;
  state: ConfidenceState;
  gateReason?: string;
  intent?: ScreenshotIntent | null;
  llmInvoked?: boolean;
}): OcrRefinement {
  const breakdown = toConfidenceBreakdown(input.state);
  const kernel = buildIntentKernel({
    state: input.state,
    intent: input.intent,
    llmInvoked: input.llmInvoked ?? input.source === "llm",
    llmSource: input.source,
  });

  return {
    source: input.source,
    kind: input.kind,
    query: input.query,
    confidence: input.state.score,
    gateReason: input.gateReason ?? input.state.primaryReason,
    band: input.state.band,
    breakdown,
    state: input.state,
    kernel,
  };
}

function intentWithRefinement(
  preliminary: ScreenshotIntent | null,
  input: { kind?: ScreenshotIntentKind; query?: string; rawText: string }
): ScreenshotIntent | null {
  if (!preliminary) {
    return null;
  }

  if (input.kind && input.query) {
    return {
      ...preliminary,
      kind: input.kind,
      query: input.query,
    };
  }

  return preliminary;
}

export async function refineOcrWithLlm(input: {
  rawText: string;
  vision?: VisionSnapshot | null;
}): Promise<OcrRefinement> {
  const preliminary = classifyScreenshotInput({
    text: input.rawText,
    vision: input.vision,
  });

  const preGate = evaluateScreenshotGate({
    rawText: input.rawText,
    vision: input.vision,
    intent: preliminary,
  });
  const preState = preGate.state;

  if (!shouldRunLlmRefine(preState.band)) {
    return buildRefinementResult({
      source: "skipped",
      state: preState,
      intent: preliminary,
      llmInvoked: false,
    });
  }

  if (!isOpenAiConfigured()) {
    const demoted = buildConfidenceState({
      ...preState,
      band: finalizeBandAfterLlm({
        preBand: preState.band,
        postScore: preState.score,
        llmSucceeded: false,
      }),
      score: preState.score,
      signals: preState.signals,
      primaryReason: preState.primaryReason,
      sources: preState.sources,
    });

    return buildRefinementResult({
      source: "skipped",
      state: demoted,
      gateReason: "no_openai_key",
      intent: preliminary,
      llmInvoked: false,
    });
  }

  const filtered = prefilterOcrForLlm(input.rawText);
  if (filtered.length < 2) {
    const demoted = buildConfidenceState({
      score: preState.score,
      signals: preState.signals,
      primaryReason: preState.primaryReason,
      sources: preState.sources,
      band: finalizeBandAfterLlm({
        preBand: preState.band,
        postScore: preState.score,
        llmSucceeded: false,
      }),
    });

    return buildRefinementResult({
      source: "skipped",
      state: demoted,
      gateReason: "empty_after_prefilter",
      intent: preliminary,
      llmInvoked: false,
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel(),
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract one actionable search entity from noisy mobile screenshot OCR. Reply with JSON only.",
          },
          {
            role: "user",
            content: buildOcrRefinePrompt(filtered, visionHints(input.vision)),
          },
        ],
      }),
    });

    if (!response.ok) {
      const demoted = buildConfidenceState({
        score: preState.score,
        signals: preState.signals,
        primaryReason: preState.primaryReason,
        sources: preState.sources,
        band: finalizeBandAfterLlm({
          preBand: preState.band,
          postScore: preState.score,
          llmSucceeded: false,
        }),
      });

      return buildRefinementResult({
        source: "skipped",
        state: demoted,
        gateReason: `openai_http_${response.status}`,
        intent: preliminary,
        llmInvoked: true,
      });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseOcrRefinementContent(content);
    const llmSucceeded = Boolean(parsed?.query && parsed.kind);

    const postGate = evaluateScreenshotGate({
      rawText: input.rawText,
      vision: input.vision,
      intent: preliminary,
      llmRefinement: parsed ?? { source: "llm" },
    });

    const finalBand = finalizeBandAfterLlm({
      preBand: preState.band,
      postScore: postGate.state.score,
      llmSucceeded,
    });

    const finalState = buildConfidenceState({
      score: postGate.state.score,
      signals: postGate.state.signals,
      primaryReason: postGate.state.primaryReason,
      sources: postGate.state.sources,
      band: finalBand,
    });

    if (!parsed?.query) {
      return buildRefinementResult({
        source: "skipped",
        state: finalState,
        gateReason: "llm_empty",
        intent: preliminary,
        llmInvoked: true,
      });
    }

    return buildRefinementResult({
      source: "llm",
      kind: parsed.kind,
      query: parsed.query,
      state: finalState,
      intent: intentWithRefinement(preliminary, {
        kind: parsed.kind,
        query: parsed.query,
        rawText: input.rawText,
      }),
      llmInvoked: true,
    });
  } catch {
    const demoted = buildConfidenceState({
      score: preState.score,
      signals: preState.signals,
      primaryReason: preState.primaryReason,
      sources: preState.sources,
      band: finalizeBandAfterLlm({
        preBand: preState.band,
        postScore: preState.score,
        llmSucceeded: false,
      }),
    });

    return buildRefinementResult({
      source: "skipped",
      state: demoted,
      gateReason: "openai_error",
      intent: preliminary,
      llmInvoked: true,
    });
  }
}

export function isScreenshotConfirmRequired(refinement?: OcrRefinement | null) {
  if (refinement?.state) {
    return refinement.state.policy.needsConfirm;
  }

  return Boolean(refinement?.band && needsUserConfirm(refinement.band));
}
