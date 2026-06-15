import { processCaptureFromImage } from "@/lib/screenshot/ocr-text";
import { parseAllManualLinkInputs } from "@/lib/share/parse-share-payload";

export type ComposerAttachmentKind = "image" | "link" | "file";

export type ComposerAttachment = {
  id: string;
  kind: ComposerAttachmentKind;
  label: string;
  previewUrl?: string;
  url?: string;
  file?: File;
};

export type ComposerAttachmentWire = {
  id: string;
  kind: ComposerAttachmentKind;
  label: string;
  previewUrl?: string;
  url?: string;
};

import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";

export type ComposerSendPayload = {
  text: string;
  attachments: ComposerAttachment[];
  chatAxis?: ChatAxis;
};

export type ComposerResolvedContext = {
  contextBlock: string;
  linkUrls: string[];
  displayAttachments: ComposerAttachmentWire[];
};

const URL_IN_TEXT =
  /https?:\/\/[^\s<>"']+/gi;

export function createImageAttachment(file: File): ComposerAttachment {
  return {
    id: `att-${crypto.randomUUID()}`,
    kind: file.type.startsWith("image/") ? "image" : "file",
    label: file.name.slice(0, 32) || "첨부 파일",
    previewUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined,
    file,
  };
}

export function createLinkAttachment(input: {
  url: string;
  title?: string;
}): ComposerAttachment {
  let host = input.url;
  try {
    host = new URL(input.url).hostname.replace(/^www\./, "");
  } catch {
    // keep raw
  }
  return {
    id: `att-${crypto.randomUUID()}`,
    kind: "link",
    label: input.title?.trim() || host,
    url: input.url.trim(),
  };
}

export function extractUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (raw: string) => {
    const trimmed = raw.trim().replace(/[)\]}>,.!?;:'"]+$/g, "");
    const key = trimmed.replace(/\/+$/, "").toLowerCase();
    if (!trimmed || seen.has(key)) {
      return;
    }
    seen.add(key);
    urls.push(trimmed.replace(/\/+$/, "") || trimmed);
  };

  for (const item of parseAllManualLinkInputs(text)) {
    push(item.url);
  }
  for (const match of text.match(URL_IN_TEXT) ?? []) {
    push(match);
  }
  return urls;
}

export function attachmentsToWire(
  attachments: ComposerAttachment[]
): ComposerAttachmentWire[] {
  return attachments.map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    previewUrl: item.previewUrl,
    url: item.url,
  }));
}

export function revokeComposerAttachmentUrls(attachments: ComposerAttachment[]) {
  for (const item of attachments) {
    if (item.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
}

function truncate(text: string, max = 480) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function truncateOcrForSchedule(text: string, max = 1400) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}…`;
}

/** Resolve all attachments into one orchestrator context block. */
export async function resolveComposerAttachments(
  attachments: ComposerAttachment[]
): Promise<ComposerResolvedContext> {
  const lines: string[] = [];
  const linkUrls: string[] = [];

  for (const [index, attachment] of attachments.entries()) {
    const slot = index + 1;

    if (attachment.kind === "link" && attachment.url) {
      linkUrls.push(attachment.url);
      lines.push(`[첨부${slot}·링크] ${attachment.label} · ${attachment.url}`);
      continue;
    }

    if (attachment.file) {
      if (attachment.kind === "image") {
        try {
          const capture = await processCaptureFromImage(attachment.file);
          const ocr = truncateOcrForSchedule(capture.ocr.text ?? "");
          const visionLabel =
            capture.captureVision?.content_title ??
            capture.captureVision?.place_name_or_product ??
            capture.captureVision?.search_query ??
            capture.captureVision?.type ??
            "";
          lines.push(`[첨부${slot}·사진] ${attachment.label}`);
          if (ocr) {
            lines.push(`[첨부${slot}·OCR본문]\n${ocr}`);
          }
          if (visionLabel) {
            lines.push(`[첨부${slot}·Vision] ${visionLabel}`);
          }
        } catch {
          lines.push(`[첨부${slot}·사진] ${attachment.label} (분석 실패 — 파일명만 참고)`);
        }
      } else {
        if (attachment.file.type.startsWith("text/")) {
          try {
            const raw = await attachment.file.text();
            lines.push(`[첨부${slot}·파일] ${attachment.label} · ${truncate(raw, 320)}`);
          } catch {
            lines.push(`[첨부${slot}·파일] ${attachment.label}`);
          }
        } else {
          lines.push(`[첨부${slot}·파일] ${attachment.label} (${attachment.file.type || "binary"})`);
        }
      }
    }
  }

  return {
    contextBlock: lines.join("\n"),
    linkUrls,
    displayAttachments: attachmentsToWire(attachments),
  };
}

export function buildComposerOrchestrateMessage(input: {
  text: string;
  contextBlock: string;
}): string {
  const text = input.text.trim();
  if (!input.contextBlock.trim()) {
    return text;
  }
  if (!text) {
    return `첨부한 자료를 한 번에 분석해줘.\n\n${input.contextBlock}`;
  }
  return `${text}\n\n[첨부 컨텍스트]\n${input.contextBlock}`;
}
