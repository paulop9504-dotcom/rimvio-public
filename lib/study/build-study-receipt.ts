import { estimateReadingMinutesFromText } from "@/lib/media/estimate-reading-time";
import {
  EXAM_POSTIT_ICONS,
  EXAM_POSTIT_LABELS,
} from "@/lib/study/exam-postit-template";
import type { LinkRow } from "@/types/database";

export type StudyReceiptLineKind =
  | "context"
  | "memorize"
  | "keyword"
  | "exam";

export type StudyReceiptLine = {
  kind: StudyReceiptLineKind;
  icon: string;
  label: string;
  value: string;
};

export type StudyReceipt = {
  available: boolean;
  title: string;
  pageLabel: string | null;
  sectionLabel: string | null;
  readMinutes: number;
  headline: string;
  detail: string;
  disclaimer: string;
  lines: StudyReceiptLine[];
};

const STOPWORDS =
  /^(the|and|of|for|with|from|that|this|are|was|have|will|but|not|you|all|can|her|his|they|we|our|who|how|what|when|where|why|page|chapter|section)$/i;

function normalizeLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2);
}

function pickPageLabel(lines: string[]): string | null {
  for (const line of lines) {
    if (/^\d{1,3}$/.test(line)) {
      return `p.${line}`;
    }
    const match = line.match(/\bp\.?\s*(\d{1,3})\b/i);
    if (match?.[1]) {
      return `p.${match[1]}`;
    }
  }
  return null;
}

function pickTitle(lines: string[]): string | null {
  const candidates = lines.filter(
    (line) =>
      line.length >= 4 &&
      line.length <= 72 &&
      !/^\d{1,3}$/.test(line) &&
      !/^page\s+\d/i.test(line)
  );

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates.map((line) => {
    let score = 0;
    if (/^[A-Z][^.!?]{3,}$/.test(line) && line.split(/\s+/).length <= 12) {
      score += 3;
    }
    if (/[·•]/.test(line)) {
      score += 2;
    }
    if (line.length <= 48) {
      score += 1;
    }
    return { line, score };
  });

  scored.sort((a, b) => b.score - a.score || a.line.length - b.line.length);
  return scored[0]?.line ?? candidates[0] ?? null;
}

function pickSectionHeader(lines: string[]): string | null {
  for (const line of lines) {
    if (
      line.length >= 8 &&
      line.length <= 64 &&
      /^[A-Z]/.test(line) &&
      !line.endsWith(".") &&
      line.split(/\s+/).length <= 10 &&
      !/^\d/.test(line)
    ) {
      return line;
    }
  }
  return null;
}

function uniqueTerms(values: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const term = raw.replace(/\s+/g, " ").trim();
    const key = term.toLowerCase();
    if (term.length < 3 || seen.has(key) || STOPWORDS.test(term)) {
      continue;
    }
    seen.add(key);
    out.push(term);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

function extractMemorizeTerms(blob: string, limit = 2): string[] {
  const candidates: string[] = [];

  const titleCase =
    blob.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) ?? [];
  candidates.push(...titleCase);

  const quoted = blob.match(/"([^"]{4,48})"/g)?.map((q) => q.slice(1, -1)) ?? [];
  candidates.push(...quoted);

  const parenthetical = blob.match(/\(([A-Z][a-z]+(?:\s+[A-Za-z]+){0,4})\)/g)?.map((p) =>
    p.slice(1, -1)
  ) ?? [];
  candidates.push(...parenthetical);

  const scored = uniqueTerms(candidates, 12).map((term) => {
    let score = 0;
    if (/self|principle|measurement|consciousness|theory|model|paradox/i.test(term)) {
      score += 3;
    }
    if (term.split(/\s+/).length >= 2) {
      score += 2;
    }
    if (/quantum|creative|god|soul/i.test(term)) {
      score += 1;
    }
    return { term, score };
  });

  scored.sort((a, b) => b.score - a.score || a.term.length - b.term.length);
  return scored.slice(0, limit).map((item) => item.term);
}

function extractKeywordEntities(blob: string, exclude: Set<string>, limit = 3): string[] {
  const candidates: string[] = [];

  const citations =
    blob.match(
      /\b[A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+|\s+et\s+al\.?)(?:\s*\(\d{4}\))?/g
    ) ?? [];
  candidates.push(...citations.map((c) => c.replace(/\s*\(\d{4}\)/, "").trim()));

  const theories =
    blob.match(
      /\b(?:quantum\s+[a-z]+(?:\s+[a-z]+)?|creative\s+principle|holy\s+spirit|libet|goswami|buber|michelangelo)\b/gi
    ) ?? [];
  candidates.push(...theories);

  const years = blob.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s*\(\d{4}\)/g) ?? [];
  candidates.push(...years);

  return uniqueTerms(candidates, limit + exclude.size).filter(
    (term) => !exclude.has(term.toLowerCase())
  ).slice(0, limit);
}

function shortenSentence(text: string, max = 110) {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function pickContextSummary(lines: string[], sectionLabel: string | null): string {
  const substantive = lines.filter(
    (line) =>
      line.length >= 45 &&
      /[a-z가-힣]/i.test(line) &&
      !/^\d{1,3}$/.test(line)
  );

  const blob = substantive.join(" ");
  const themes: string[] = [];

  if (/quantum\s+self|quantum\s+measurement|observer/i.test(blob)) {
    themes.push("양자 의식·측정");
  }
  if (/creative\s+principle|changing\s+view\s+of\s+god|godhead|ya?hweh|tao/i.test(blob)) {
    themes.push("창조 원리로서의 신");
  }
  if (/ego|memory|libet|goswami|mitchell/i.test(blob)) {
    themes.push("에고·기억이 선택을 제한");
  }
  if (/paradox|creator|creativity/i.test(blob)) {
    themes.push("창조 주체이자 객체");
  }
  if (/tibetan|reincarnation|death|dying/i.test(blob)) {
    themes.push("죽음·의식의 연속");
  }

  if (themes.length >= 2) {
    return shortenSentence(
      `${themes[0]}와 ${themes.slice(1).join(", ")}를 중심으로, ${sectionLabel ?? "이 페이지"}의 논지가 전개됨.`,
      160
    );
  }

  if (substantive.length >= 2) {
    return shortenSentence(
      `${substantive[0]} ${substantive[1]}`.replace(/\s+/g, " "),
      160
    );
  }

  if (substantive[0]) {
    return shortenSentence(substantive[0], 160);
  }

  return sectionLabel
    ? `${sectionLabel} — 핵심 논지를 파악하고 용어를 외울 것`
    : "캡처한 페이지 — 핵심 주장과 용어를 추려 외우기";
}

function memorizeDefinition(term: string, blob: string): string {
  const lower = term.toLowerCase();
  if (/quantum self/i.test(term)) {
    return "가능성을 현실로 측정·선택하는 의식의 주체";
  }
  if (/creative principle/i.test(term)) {
    return "현상을 결정하는 의식·창조의 근원";
  }
  if (/quantum measurement/i.test(lower)) {
    return "가능성 → 현실로 전환되는 의식의 작용";
  }
  if (/paradox/i.test(lower)) {
    return "창조 주체이자 객체인 역설적 존재";
  }
  if (/consciousness/i.test(lower)) {
    return "존재의 근원이자 창조적 선택의 장";
  }
  if (blob.toLowerCase().includes(lower)) {
    return "페이지 핵심 용어 — 정의 암기";
  }
  return "시험 전 반드시 암기";
}

function buildExamClaimQuestion(blob: string, title: string, section: string | null): string {
  if (/creative\s+principle|changing\s+view\s+of\s+god|quantum\s+self|quantum\s+measurement/i.test(blob)) {
    return "왜 저자는 전통적 '심판자 신' 대신 '창조 원리로서의 신'을 주장하며, 이를 양자 역학으로 설명하려 하는가?";
  }

  if (/paradox|we are god|creator and/i.test(blob)) {
    return "저자가 말하는 '우리는 신이면서 동시에 신이 아니다'는 어떤 역설을 뜻하는가?";
  }

  if (/libet|memory|ego|0\.5\s*second|half a second/i.test(blob)) {
    return "기억·에고가 자유 선택을 어떻게 제한한다고 주장하는가?";
  }

  const topic = section ?? title;
  if (/[가-힣]/.test(topic)) {
    return `${topic.slice(0, 28)} — 저자의 핵심 주장(Main Claim)은?`;
  }

  return `What is the author's main claim about ${topic.slice(0, 36)}?`;
}

function formatMemorizeLine(term: string, blob: string) {
  const definition = memorizeDefinition(term, blob);
  return `${term}: ${definition}`;
}

/** Pure read projection — OCR/title → 시험 포스트잇 영수증. */
export function buildStudyReceipt(input: {
  title?: string | null;
  ocrText?: string | null;
}): StudyReceipt {
  const ocr = input.ocrText?.trim() ?? "";
  const lines = normalizeLines(ocr);
  const blob = lines.join(" ");
  const pageLabel = pickPageLabel(lines);
  const parsedTitle = pickTitle(lines);
  const title = input.title?.trim() || parsedTitle || "학습 캡처";
  const sectionLabel = pickSectionHeader(
    lines.filter((line) => line !== parsedTitle && line !== title)
  );
  const context = pickContextSummary(lines, sectionLabel);
  const memorizeTerms = extractMemorizeTerms(blob, 2);
  const memorizeSet = new Set(memorizeTerms.map((term) => term.toLowerCase()));
  const keywords = extractKeywordEntities(blob, memorizeSet, 3);
  const readMinutes = Math.max(
    1,
    estimateReadingMinutesFromText(ocr || title) ?? 2
  );

  const receiptLines: StudyReceiptLine[] = [
    {
      kind: "context",
      icon: EXAM_POSTIT_ICONS.context,
      label: EXAM_POSTIT_LABELS.context,
      value: context,
    },
  ];

  memorizeTerms.forEach((term) => {
    receiptLines.push({
      kind: "memorize",
      icon: EXAM_POSTIT_ICONS.memorize,
      label: EXAM_POSTIT_LABELS.memorize,
      value: formatMemorizeLine(term, blob),
    });
  });

  keywords.forEach((term) => {
    receiptLines.push({
      kind: "keyword",
      icon: EXAM_POSTIT_ICONS.keyword,
      label: EXAM_POSTIT_LABELS.keyword,
      value: term,
    });
  });

  receiptLines.push({
    kind: "exam",
    icon: EXAM_POSTIT_ICONS.exam,
    label: EXAM_POSTIT_LABELS.exam,
    value: buildExamClaimQuestion(blob, title, sectionLabel),
  });

  const headline = `${title}${pageLabel ? ` · ${pageLabel}` : ""}`;

  return {
    available: receiptLines.length >= 3,
    title,
    pageLabel,
    sectionLabel,
    readMinutes,
    headline,
    detail: `읽기 ≈ ${readMinutes}분 · 시험 전 포스트잇`,
    disclaimer: "OCR 기반 초안 · 📝 시험용 30초 정리로 AI 보강",
    lines: receiptLines.slice(0, 7),
  };
}

export function formatStudyReceiptPlainText(receipt: StudyReceipt): string {
  const rows = [
    "── 시험 포스트잇 ──",
    receipt.headline,
    ...receipt.lines.map((line) => `${line.icon} ${line.label}: ${line.value}`),
    receipt.detail,
  ];
  return rows.join("\n");
}

export function extractCaptureOcrFromLink(
  link: Pick<LinkRow, "title" | "actions">
): string {
  for (const action of link.actions) {
    const copy = action.payload?.copyText;
    if (typeof copy === "string" && copy.trim().length >= 80) {
      return copy.trim();
    }
  }

  return link.title?.trim() ?? "";
}

export function shouldShowStudyReceipt(
  link: Pick<LinkRow, "title" | "actions" | "category" | "source_type" | "original_url">
): boolean {
  if (link.source_type !== "screenshot" && !/rimvio\.app\/capture\//i.test(link.original_url)) {
    return false;
  }

  if (link.actions.some((action) => /시험|포스트잇|핵심 용어|study|document_study/i.test(action.label))) {
    return true;
  }

  const ocr = extractCaptureOcrFromLink(link);
  if (ocr.length >= 120 && ocr.split(/\r?\n/).filter((l) => l.trim().length >= 40).length >= 2) {
    return true;
  }

  if (link.category === "research" && ocr.length >= 40) {
    return true;
  }

  return false;
}

export function buildStudyReceiptFromLink(
  link: Pick<LinkRow, "title" | "actions" | "category" | "source_type" | "original_url">
): StudyReceipt {
  const receipt = buildStudyReceipt({
    title: link.title,
    ocrText: extractCaptureOcrFromLink(link),
  });

  if (!receipt.available && shouldShowStudyReceipt(link)) {
    return {
      ...receipt,
      available: true,
      headline: link.title?.trim() || "학습 캡처",
      detail: "시험 전 포스트잇",
      lines: [
        {
          kind: "context",
          icon: EXAM_POSTIT_ICONS.context,
          label: EXAM_POSTIT_LABELS.context,
          value: "캡처한 페이지 — 핵심 주장과 용어를 추려 외우기",
        },
        {
          kind: "exam",
          icon: EXAM_POSTIT_ICONS.exam,
          label: EXAM_POSTIT_LABELS.exam,
          value: buildExamClaimQuestion("", link.title ?? "주제", null),
        },
      ],
    };
  }

  return receipt;
}
