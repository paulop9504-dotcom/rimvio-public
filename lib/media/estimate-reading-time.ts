const MIN_READING_MINUTES = 1;
const MAX_READING_MINUTES = 180;
const KOREAN_CHARS_PER_MINUTE = 450;
const LATIN_WORDS_PER_MINUTE = 200;

function countLatinWords(text: string) {
  const matches = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g);
  return matches?.length ?? 0;
}

function countCjkCharacters(text: string) {
  const matches = text.match(/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu);
  return matches?.length ?? 0;
}

export function estimateReadingMinutesFromText(text: string | null | undefined) {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const cjkMinutes = countCjkCharacters(normalized) / KOREAN_CHARS_PER_MINUTE;
  const latinMinutes = countLatinWords(normalized) / LATIN_WORDS_PER_MINUTE;
  const raw = Math.max(cjkMinutes, latinMinutes, normalized.length / 900);

  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return Math.min(
    MAX_READING_MINUTES,
    Math.max(MIN_READING_MINUTES, Math.ceil(raw))
  );
}
