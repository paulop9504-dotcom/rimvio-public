import { geminiApiKey, geminiVisionModel } from "@/lib/locate/gemini-config";
import { callOpenAiVisionJson } from "@/lib/llm/openai-json-client";
import {
  captureVisionProvider,
  type CaptureVisionProvider,
} from "@/lib/locate/vision-provider-config";
import type {
  CaptureVisionResult,
  CaptureVisionType,
} from "@/lib/capture/inferred-intent-types";
import { sanitizeCaptureVisionResult } from "@/lib/capture/vision-result-guard";
import type { LocateVisionResult } from "@/lib/locate/types";
import {
  annotateImageBuffer,
  isGoogleVisionConfigured,
} from "@/lib/vision/google-vision";
import {
  getOrFetchVisionOcr,
  hasVisionOcrResult,
  readVisionWebContext,
  type CaptureVisionContextStore,
} from "@/lib/vision/capture-vision-context";
import {
  buildGeminiCapturePrompt,
  type GoogleWebContextInput,
} from "@/lib/vision/web-detection-hints";

export const CAPTURE_VISION_PROMPT = `# Role
You are Rimvio Vision AI. Analyze everyday photos, screenshots, and receipts to infer the user's true intent and produce the best search query.

# Core Directive: VISION FIRST, NO RAW OCR
Never use broken or noisy raw OCR text as the search query. Text in the image is only a hint to complement what you see visually.

# Situation Analysis Pipeline (mandatory reasoning flow)
Classify the image into exactly one category, then generate the query per its rules.

**1. Category: Food & Place (restaurants, cafes, signage) — type: "locate"**
- Visual cues: food type, interior, tableware, logos.
- Goal: user wants to visit or learn about this place.
- Query rule: derive accurate "brand + branch" from visual landmarks or signature menu items. Do not bias toward any specific venue; focus only on what the photo shows.
- Pattern examples:
  * Green mermaid logo + takeaway cup → "스타벅스"
  * Blue polka-dot bowl + tteokbokki and toast → "떡반집"
  * Iron-plate dakgalbi + drum barrel table + partial "춘천" sign → "춘천 닭갈비"

**2. Category: Product & Shopping (products, mall screenshots) — type: "product_search"**
- Visual cues: product shape, packaging, model structure (e.g. T104S-5RAL).
- Goal: user wants price comparison or purchase.
- Query rule: combine product category (e.g. touch panel, sneakers) with core model name; strip UI noise and search-bar typos.

**3. Category: Document & Utility (receipts, bills, account numbers) — type: "utility"**
- Visual cues: table layout, number arrays, formal document structure.
- Goal: user wants settlement, transfer, or record-keeping.
- Query rule: OCR-accurate numbers/text matter here. Extract only key numbers (account, amount).

**4. Category: Unknown (unclear everyday photo) — type: "unknown"**
- If information is insufficient, do not force a query. Return a brief situation description in reasoning_path; search_query and place_name_or_product should be null.

**5. Category: Barcode & QR Code — type: "barcode_qr"**
- Visual/data cues: 1D barcode digit arrays, 2D QR patterns, surrounding packaging design.
- Goal: user wants lowest price for a product, or instant navigation to event/payment page encoded in QR.
- Query rules:
  * Barcode: NEVER output barcode digits alone. Fuse barcode with brand logo or product name visible nearby (e.g. "8801043... + 신라면" → search_query: "농심 신라면 최저가", barcode_number: "8801043...").
  * QR: infer hidden URL intent; set target_url to the decoded/openable link when visible or inferable; search_query describes page purpose (e.g. "카카오페이 송금", "와이파이 연결").

**6. Category: URL & Web Link — type: "content_summary"**
- Visual/data cues: captured URL, thumbnail, webpage headline in screenshot.
- Goal: user wants to save, summarize, or share the link content in Rimvio.
- Query rule: do NOT use raw URL as search_query. Extract core value from thumbnail + title (e.g. YouTube capture → search_query: "해당 영상 제목 요약", content_title: video title, target_url: URL if visible).

**7. Category: Poster & Business Card — type: "poster_contact"**
- Visual/data cues: person name, title, date/time, venue, event name.
- Goal: user wants to save contact, add calendar event, or navigate to venue.
- Query rules:
  * Business card: combine person name + company (e.g. "홍길동 네이버").
  * Poster/flyer: extract event name + date + venue for 1-tap calendar or map search.

**8. Category: Academic & Study Documents (books, essays, lecture notes) — STUDY PRIORITY**
- Visual/data cues: dense paragraph prose, page numbers, chapter headings, citations, textbook layout.
- Goal: user wants to study, summarize, or memorize — NOT shop or take medicine.
- **Weight override (mandatory):** If the image contains long-form academic text (philosophy, science, history, economics, literature), you MUST treat it as a study document even when medical-looking tokens appear (mg, dosage, pharmacy words in academic context).
- When academic paragraph density is high, NEVER classify as product_search or utility because of stray medical or numeric tokens.
- Prefer type: "unknown" with reasoning_path noting "academic study document" over misclassifying as product_search/locate/utility.
- If a pill-bag visual pattern appears BUT paragraph prose dominates the page, academic STUDY intent wins over medical interpretation.

# Academic Priority Override (STUDY > MEDICAL > OTHER)
- Before finalizing type, ask: "Is this primarily reading/study material?"
- If yes → do not output product_search for book pages; do not output utility for philosophy essays.
- Medical visual patterns (pill icons, dosage tables) are secondary hints only when prose is short and label-like.

# Layout Analyzer Hint (E-stage companion)
- Short label + pill icon + dosage row → likely medicine (only when NO long paragraphs).
- Long paragraphs + citations + chapter markers → study document regardless of incidental mg/units in text.

# Anti-Hallucination & Noise Filter (노이즈 철저 배제)
- Ignore special characters, incomplete alphabet fragments (e.g. "va BE", "N RAL..."), and meaningless consonant/vowel strings — never read them.
- If extracted text does not logically connect to visual cues (food type, product shape, document layout), treat it as 100% noise and discard immediately.

# The Blind Test Rule (블라인드 테스트 규칙)
- Before using any text, silently answer: "If this photo had zero readable text, what would I search for?"
- Text is allowed ONLY to refine what you already inferred visually (e.g. confirm brand name, add branch name).

# Strict Fallback (엄격한 포기 규칙)
- Self-check: would your search_query return meaningful results on Naver or Google?
- If you cannot be confident (confidence_score < 0.5), or information is too fragmentary, do NOT invent an answer.
- Immediately set type: "unknown", search_query: null, place_name_or_product: null, and reasoning_path: "시각적 정보 부족 및 텍스트 노이즈로 식별 불가".

# Google Web Detection Hybrid (로컬 지식 보완)
- You will receive optional [Reference Data] from Google Vision WEB_DETECTION (webEntities, bestGuessLabels).
- Treat this as a Context Hint from Google's web index — not raw OCR to paste blindly.
- Fuse: your visual scene understanding + web entities (local place/product names) → final search_query.
- Example: image shows tteokbokki + toast, webEntities include "떡반집" or "대전 은행동 떡반집" → search_query should use that brand/branch.
- If web hints conflict with the image, trust the image; if web hints confirm a brand, boost confidence_score.

# Output Format (Strict JSON)
Return ONLY a raw JSON object. No markdown fences, no prose outside JSON.

{
  "type": "locate" | "product_search" | "utility" | "barcode_qr" | "content_summary" | "poster_contact" | "unknown",
  "search_query": "refined final search keyword (OCR noise removed)",
  "place_name_or_product": "identified name (null if none)",
  "target_url": "decoded QR or visible URL for deeplink (null if none)",
  "barcode_number": "raw barcode digits only (null if none)",
  "content_title": "headline or video/article title for link captures (null if none)",
  "confidence_score": 0.0,
  "reasoning_path": "One sentence: how visual cues and text were combined",
  "is_ocr_relied": false
}

Rules:
- is_ocr_relied: true ONLY if search_query was copied verbatim from image text; false when reconstructed from vision. For locate/product_search/barcode_qr, is_ocr_relied must be false.
- For unknown: search_query null, place_name_or_product null, confidence_score ≤ 0.3, reasoning_path must state why identification failed.
- For utility: is_ocr_relied may be true when digits/amounts are extracted faithfully; still require confidence_score ≥ 0.5.
- For barcode_qr: never set search_query to digits-only; always fuse packaging/brand visually. barcode_number holds digits separately.
- For content_summary: search_query = human-readable summary intent; target_url = link when visible.
- For poster_contact: search_query = contact or event bundle ready for calendar/map.
- Never output confidence_score ≥ 0.5 unless you would bet the search_query works on Naver/Google (or target_url opens the right page).`;

const VISION_TYPES = new Set<CaptureVisionType>([
  "locate",
  "product_search",
  "utility",
  "barcode_qr",
  "content_summary",
  "poster_contact",
  "unknown",
]);

function normalizeVisionType(value: unknown): CaptureVisionType | null {
  return typeof value === "string" && VISION_TYPES.has(value as CaptureVisionType)
    ? (value as CaptureVisionType)
    : null;
}

function deriveLegacyNames(
  type: CaptureVisionType | null,
  place_name_or_product: string | null,
  parsed: CaptureVisionResult & { place_name?: string; product_name?: string }
) {
  const unified = place_name_or_product?.trim() || null;
  const legacyPlace =
    typeof parsed.place_name === "string" && parsed.place_name.trim()
      ? parsed.place_name.trim()
      : type === "locate"
        ? unified
        : null;
  const legacyProduct =
    typeof parsed.product_name === "string" && parsed.product_name.trim()
      ? parsed.product_name.trim()
      : type === "product_search" || type === "barcode_qr"
        ? unified
        : null;

  return { legacyPlace, legacyProduct, unified };
}

function parseCaptureVisionJson(raw: string): CaptureVisionResult {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced ?? trimmed).trim();

  try {
    const parsed = JSON.parse(candidate) as CaptureVisionResult & {
      confidence?: number;
      place_name?: string;
      product_name?: string;
    };

    const type = normalizeVisionType(parsed.type);

    const search_query =
      typeof parsed.search_query === "string" && parsed.search_query.trim()
        ? parsed.search_query.trim()
        : null;

    const confidence_score =
      typeof parsed.confidence_score === "number"
        ? parsed.confidence_score
        : typeof parsed.confidence === "number"
          ? parsed.confidence
          : undefined;

    const place_name_or_product =
      typeof parsed.place_name_or_product === "string" &&
      parsed.place_name_or_product.trim()
        ? parsed.place_name_or_product.trim()
        : null;

    const { legacyPlace, legacyProduct, unified } = deriveLegacyNames(
      type,
      place_name_or_product,
      parsed
    );

    return sanitizeCaptureVisionResult({
      type,
      search_query,
      place_name_or_product: unified,
      place_name: legacyPlace,
      product_name: legacyProduct,
      model_number:
        typeof parsed.model_number === "string"
          ? parsed.model_number.trim()
          : null,
      target_url:
        typeof parsed.target_url === "string" && parsed.target_url.trim()
          ? parsed.target_url.trim()
          : null,
      barcode_number:
        typeof parsed.barcode_number === "string" && parsed.barcode_number.trim()
          ? parsed.barcode_number.trim()
          : null,
      content_title:
        typeof parsed.content_title === "string" && parsed.content_title.trim()
          ? parsed.content_title.trim()
          : null,
      confidence_score,
      context_signal:
        typeof parsed.context_signal === "string"
          ? parsed.context_signal.trim()
          : undefined,
      reasoning_path:
        typeof parsed.reasoning_path === "string"
          ? parsed.reasoning_path.trim()
          : undefined,
      is_ocr_relied: Boolean(parsed.is_ocr_relied),
    });
  } catch {
    return {
      type: null,
      search_query: null,
      reasoning_path: "Gemini JSON parse failed",
      is_ocr_relied: false,
    };
  }
}

async function callGeminiVision(input: {
  buffer: Buffer;
  mimeType: string;
  webContext?: GoogleWebContextInput | null;
}): Promise<string> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const model = geminiVisionModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const promptText = buildGeminiCapturePrompt(
    CAPTURE_VISION_PROMPT,
    input.webContext
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
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
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`gemini_failed:${response.status}:${detail.slice(0, 240)}`);
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
      .trim() ?? ""
  );
}

async function callCaptureVision(input: {
  buffer: Buffer;
  mimeType: string;
  webContext?: GoogleWebContextInput | null;
  provider?: CaptureVisionProvider;
}): Promise<string> {
  const provider = input.provider ?? captureVisionProvider();
  const promptText = buildGeminiCapturePrompt(
    CAPTURE_VISION_PROMPT,
    input.webContext
  );

  if (provider === "openai") {
    return callOpenAiVisionJson({
      systemPrompt: promptText,
      userText: "Analyze this image and return JSON only.",
      buffer: input.buffer,
      mimeType: input.mimeType,
    });
  }

  return callGeminiVision(input);
}

export async function extractCaptureVisionFromImage(input: {
  buffer: Buffer;
  mimeType: string;
  /** Pre-fetched Google Vision WEB_DETECTION — skips duplicate API call when provided. */
  webContext?: GoogleWebContextInput | null;
  /** Shared one-pass store — if OCR already fetched, never call Google Vision again. */
  store?: CaptureVisionContextStore | null;
}): Promise<CaptureVisionResult> {
  let webContext = input.webContext ?? null;

  if (!webContext && input.store && hasVisionOcrResult(input.store)) {
    webContext = readVisionWebContext(input.store);
  }

  if (!webContext && input.store) {
    const ocr = await getOrFetchVisionOcr(
      { buffer: input.buffer, mimeType: input.mimeType },
      input.store
    );
    webContext = ocr.vision ?? null;
  } else if (!webContext && isGoogleVisionConfigured()) {
    const ocr = await annotateImageBuffer({
      buffer: input.buffer,
      mimeType: input.mimeType,
    });
    webContext = ocr?.vision ?? null;
  }

  const text = await callCaptureVision({
    buffer: input.buffer,
    mimeType: input.mimeType,
    webContext,
  });

  if (!text) {
    return {
      type: null,
      search_query: null,
      reasoning_path: `${captureVisionProvider()} returned empty response`,
      is_ocr_relied: false,
    };
  }

  return parseCaptureVisionJson(text);
}

/** Locate pipeline adapter — maps unified vision result to legacy shape. */
export async function extractPlaceNameFromImage(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<LocateVisionResult> {
  const vision = await extractCaptureVisionFromImage(input);

  if (vision.type !== "locate") {
    return {
      place_name:
        vision.type === "product_search" ? null : vision.place_name ?? null,
      confidence: vision.confidence_score,
      context_signal: vision.context_signal,
      search_query: vision.search_query,
    };
  }

  return {
    place_name:
      vision.place_name ??
      vision.place_name_or_product ??
      vision.search_query,
    confidence: vision.confidence_score,
    context_signal: vision.context_signal,
    search_query: vision.search_query,
  };
}
