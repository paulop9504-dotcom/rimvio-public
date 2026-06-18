/** Pull raw OCR text from composer attachment context blocks. */
export function parseOcrTextFromComposerContext(
  composerContext: string | null | undefined
): string | null {
  const block = composerContext?.trim();
  if (!block) {
    return null;
  }

  const chunks: string[] = [];

  const bodyBlocks = block.matchAll(
    /\[첨부\d+·OCR본문\]\s*\n([\s\S]*?)(?=\n\[첨부|$)/giu
  );
  for (const match of bodyBlocks) {
    const text = match[1]?.trim();
    if (text) {
      chunks.push(text);
    }
  }

  if (chunks.length === 0) {
    const inline = block.matchAll(
      /·\s*OCR:\s*([\s\S]*?)(?=\s*·\s*Vision:|\s*\[첨부\d|$)/giu
    );
    for (const match of inline) {
      const text = match[1]?.trim();
      if (text) {
        chunks.push(text);
      }
    }
  }

  if (chunks.length === 0) {
    return null;
  }

  return chunks.join("\n").trim();
}

export function composerContextHasPhotoAttachment(
  composerContext: string | null | undefined
): boolean {
  return /\[첨부\d+·사진\]/u.test(composerContext ?? "");
}
