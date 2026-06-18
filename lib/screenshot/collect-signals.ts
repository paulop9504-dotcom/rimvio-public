import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";
import {
  classifyScreenshotInput,
  type ScreenshotIntent,
} from "@/lib/screenshot/classify-intent";
import {
  pushSignal,
  sumSignalLedger,
  topSignalReason,
  rollupSignalSources,
  type SignalEntry,
} from "@/lib/screenshot/signal-ledger";
import type { VisionSnapshot } from "@/lib/vision/types";

const SOCIAL_NOISE =
  /instagram|tiktok|youtube|facebook|threads|reels|좋아요|댓글|공유|follow|views|subscriber|saved|profile|story|번역|likes|comments|share|more|home|explore/i;

const PRODUCT_FLUFF_ONLY =
  /^(무료배송|할인|쿠폰|옵션|구매|장바구니|cart|buy|sell|price|deal|used|중고|신품|품절|재고)$/i;

const PLACE_SIGNAL =
  /카페|맛집|restaurant|cafe|베이커리|브런치|식당|주소|위치|address|서울|부산|대구|인천|강남|홍대|성수|연남|망원|을지로|명동|해운대|\d+\s*번길|\d+\s*로\b|\d+\s*동\b|\d+\s*구\b/i;

const GENERIC_UI_TEXT =
  /^(share|more|home|explore|follow|following|saved|menu|back|close|done|ok|cancel)$/i;

function noiseRatio(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);

  if (lines.length === 0) {
    return 0;
  }

  const noisy = lines.filter((line) => SOCIAL_NOISE.test(line)).length;
  return noisy / lines.length;
}

export function collectScreenshotSignals(input: {
  rawText: string;
  vision?: VisionSnapshot | null;
  intent?: ScreenshotIntent | null;
  llmRefinement?: {
    source: "llm" | "skipped";
    query?: string;
    kind?: string;
  } | null;
}): SignalEntry[] {
  const signals: SignalEntry[] = [];
  const rawText = input.rawText.trim();
  const intent =
    input.intent ??
    classifyScreenshotInput({ text: rawText, vision: input.vision });

  if (extractExplicitUrls(rawText).length > 0) {
    pushSignal(signals, { id: "explicit_url", delta: 40, reason: "http_url" });
    return signals;
  }

  if (!intent) {
    pushSignal(signals, { id: "no_intent", delta: -35 });
    return signals;
  }

  if (intent.kind === "url") {
    pushSignal(signals, { id: "explicit_url", delta: 40, reason: "url_intent" });
    return signals;
  }

  const query = intent.query.trim();
  const socialNoise = noiseRatio(rawText);

  const compactLength = rawText.replace(/\s+/g, "").length;
  const hasPlaceInText = PLACE_SIGNAL.test(rawText);

  if (compactLength < 18 && !hasPlaceInText) {
    pushSignal(signals, { id: "low_ocr_density", delta: -20 });
  }

  if (socialNoise >= 0.35) {
    pushSignal(signals, { id: "instagram_noise", delta: -30 });
  } else if (socialNoise >= 0.15) {
    pushSignal(signals, { id: "instagram_noise_mild", delta: -15 });
  }

  if (PRODUCT_FLUFF_ONLY.test(query)) {
    pushSignal(signals, { id: "fluff_query", delta: -25 });
    return signals;
  }

  if (GENERIC_UI_TEXT.test(query)) {
    pushSignal(signals, { id: "generic_ui_text", delta: -20 });
  }

  if (intent.kind === "place" && PLACE_SIGNAL.test(query)) {
    pushSignal(signals, { id: "place_keyword", delta: 25 });
    if (
      /\d+\s*번길|\d+\s*로\b|\d+\s*동\b|서울|부산|대구|인천/.test(query) ||
      /\d+\s*번길|\d+\s*로\b|\d+\s*동\b|서울|부산|대구|인천/.test(rawText)
    ) {
      pushSignal(signals, { id: "address_fragment", delta: 12 });
    }
  }

  if (/[A-Za-z][A-Za-z0-9+\-]{2,}/.test(query)) {
    pushSignal(signals, { id: "product_brand", delta: 20 });
  }

  if (/\d+\s*원|₩|\d{1,3}(?:,\d{3})+/.test(query) || /\d+\s*원|₩|\d{1,3}(?:,\d{3})+/.test(rawText)) {
    pushSignal(signals, { id: "price_pattern", delta: 15 });
  }

  if (query.length >= 5 && !SOCIAL_NOISE.test(query) && !PRODUCT_FLUFF_ONLY.test(query)) {
    if (
      !signals.some(
        (signal) => signal.id === "place_keyword" || signal.id === "product_brand"
      )
    ) {
      pushSignal(signals, { id: "weak_match", delta: 8 });
    }
  } else if (query.length < 4) {
    pushSignal(signals, { id: "weak_match", delta: -15 });
  }

  const vision = input.vision;
  if (vision) {
    const fashionScore = vision.fashionScore ?? 0;
    if (fashionScore >= 2) {
      pushSignal(signals, { id: "vision_fashion", delta: 15 });
    }

    const label =
      vision.bestGuessLabels?.[0] ??
      vision.webEntities?.[0] ??
      vision.labels?.[0] ??
      "";

    if (label.trim().length >= 3) {
      pushSignal(signals, { id: "vision_label", delta: 12 });
    }

    if ((vision.webEntities?.length ?? 0) >= 2 || (vision.labels?.length ?? 0) >= 3) {
      pushSignal(signals, { id: "vision_entities", delta: 8 });
    }
  }

  const llm = input.llmRefinement;
  if (llm?.source === "llm") {
    if (llm.query && llm.kind) {
      pushSignal(signals, { id: "llm_refined", delta: 28 });
    } else {
      pushSignal(signals, { id: "llm_partial", delta: 8 });
    }
  }

  return signals;
}

export function resolveScreenshotSignals(input: {
  rawText: string;
  vision?: VisionSnapshot | null;
  intent?: ScreenshotIntent | null;
  llmRefinement?: {
    source: "llm" | "skipped";
    query?: string;
    kind?: string;
  } | null;
}) {
  const signals = collectScreenshotSignals(input);
  return {
    score: sumSignalLedger(signals),
    primaryReason: topSignalReason(signals),
    sources: rollupSignalSources(signals),
    signals,
  };
}
