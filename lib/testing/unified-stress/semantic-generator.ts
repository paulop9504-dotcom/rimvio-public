import type { SemanticVariation } from "@/lib/testing/unified-stress/types";

const STYLE_TRANSFORMS: Array<{
  label: string;
  transform: (text: string) => string;
}> = [
  {
    label: "반말",
    transform: (t) =>
      t
        .replace(/해\s*주세요/gu, "해줘")
        .replace(/습니다/gu, "어")
        .replace(/요\?/gu, "?")
        .replace(/요$/u, ""),
  },
  {
    label: "존댓말",
    transform: (t) =>
      t.endsWith("?") || t.endsWith("요")
        ? t
        : `${t.replace(/\?$/u, "")}요?`,
  },
  {
    label: "축약",
    transform: (t) => {
      const words = t.split(/\s+/).filter(Boolean);
      return words.slice(0, Math.max(2, Math.ceil(words.length * 0.5))).join(" ");
    },
  },
  {
    label: "감정형",
    transform: (t) => `아 진짜 ${t.replace(/^[아\s]+/u, "")}`,
  },
  {
    label: "무의미압축",
    transform: (t) => {
      const words = t.split(/\s+/).filter(Boolean);
      return words.slice(0, Math.min(3, words.length)).join(" ");
    },
  },
  {
    label: "ambiguous",
    transform: (t) => t.replace(/맛집|일정|운동|공부/u, "그거"),
  },
  {
    label: "noise_prefix",
    transform: (t) => `피곤한데 ${t}`,
  },
  {
    label: "noise_suffix",
    transform: (t) => `${t} 근데 시간 없음`,
  },
  {
    label: "question_flip",
    transform: (t) =>
      t.endsWith("?") ? t.replace(/\?$/u, " 알려줘") : `${t}?`,
  },
  {
    label: "multi_clause",
    transform: (t) => `${t} + 일정도 있어`,
  },
];

/** Generate 10 semantic variations of the same intent. */
export function generateSemanticVariations(
  input: string,
  count = 10
): SemanticVariation[] {
  const trimmed = input.trim();
  const variations: SemanticVariation[] = [{ label: "original", text: trimmed }];

  for (const { label, transform } of STYLE_TRANSFORMS) {
    if (variations.length >= count) break;
    const text = transform(trimmed);
    if (text !== trimmed && !variations.some((v) => v.text === text)) {
      variations.push({ label, text });
    }
  }

  while (variations.length < count) {
    const index = variations.length;
    variations.push({
      label: `variant_${index}`,
      text: `${trimmed} (${index})`,
    });
  }

  return variations.slice(0, count);
}
