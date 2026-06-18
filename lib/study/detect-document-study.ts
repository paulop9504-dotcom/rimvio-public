const BOOK_VISION =
  /book|publication|literature|document|text|novel|encyclopedia|manual|textbook|handwriting|page|font|paper/i;

export function looksLikeDocumentStudy(
  rawText: string,
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
  } | null
): boolean {
  if (/영수증|receipt|합계|₩|\d+\s*원|메뉴|menu|주차|parking|wifi|ssid|password/i.test(rawText)) {
    return false;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3);

  const longLines = lines.filter((line) => line.length >= 45);
  const compact = rawText.replace(/\s+/g, "");

  if (compact.length < 180 || longLines.length < 2) {
    return false;
  }

  const visionBlob = [
    ...(vision?.bestGuessLabels ?? []),
    ...(vision?.webEntities ?? []),
    ...(vision?.labels ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const bookVision = BOOK_VISION.test(visionBlob);
  const pageMarker = lines.some((line) => /^\d{1,3}$/.test(line));
  const sectionHeader = lines.some(
    (line) =>
      line.length >= 10 &&
      line.length <= 72 &&
      /^[A-Z]/.test(line) &&
      line.split(/\s+/).length <= 12
  );

  return bookVision || pageMarker || (longLines.length >= 3 && sectionHeader);
}
