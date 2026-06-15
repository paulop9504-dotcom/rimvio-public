/** Strip punctuation glued to OCR tokens (`SoNg,` → `SoNg`). */
export function stripCaptureOcrToken(token: string) {
  return token.replace(/^[^\w가-힣]+|[^\w가-힣]+$/g, "");
}

/** Split OCR text into tokens with wall-graffiti punctuation normalized away. */
export function splitCaptureOcrTokens(text: string) {
  return text
    .split(/[\s\-—_]+/)
    .map(stripCaptureOcrToken)
    .filter(Boolean);
}

function shortLatinOcrTokens(tokens: string[]) {
  return tokens.filter((token) => /^[A-Za-z]{1,5}$/.test(token));
}

/** Shared garbled OCR detector for capture / screenshot pipelines. */
export function isGarbledCaptureOcr(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  const hangul = (trimmed.match(/[가-힣]/g) ?? []).length;
  const latin = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  const meaningful = hangul + latin;

  if (meaningful < trimmed.length * 0.35) {
    return true;
  }

  const words = trimmed.split(/\s+/).filter((part) => part.length >= 2);
  if (
    words.length >= 2 &&
    words.every((word) => word.length <= 4 && /^[A-Za-z]+$/.test(word))
  ) {
    return true;
  }

  const tokens = splitCaptureOcrTokens(trimmed);
  const shortLatinTokens = shortLatinOcrTokens(tokens);
  if (tokens.length >= 2 && shortLatinTokens.length >= tokens.length * 0.5) {
    return true;
  }

  // Wall graffiti: "5 SoNg, EN ))" — digit prefix + short latin fragments.
  if (
    hangul === 0 &&
    /^\d{1,2}\s/.test(trimmed) &&
    trimmed.length <= 36 &&
    shortLatinTokens.length >= 1
  ) {
    return true;
  }

  return false;
}
