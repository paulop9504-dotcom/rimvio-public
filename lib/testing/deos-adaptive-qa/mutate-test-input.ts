import type { AdaptiveTestCategory } from "@/lib/testing/deos-adaptive-qa/test-case-banks";

export type MutationKind =
  | "remove_context"
  | "add_ambiguity"
  | "add_constraint"
  | "change_emotion"
  | "change_locale"
  | "multi_intent";

const MUTATION_SEQUENCE: MutationKind[] = [
  "remove_context",
  "add_ambiguity",
  "add_constraint",
];

const LOCALE_SWAP: Record<string, string> = {
  서울: "부산",
  강남: "해운대",
  역삼: "서면",
  대전: "광주",
};

function swapLocale(input: string): string {
  let next = input;
  for (const [from, to] of Object.entries(LOCALE_SWAP)) {
    if (next.includes(from)) {
      return next.replace(from, to);
    }
  }
  return `${next} (부산)`;
}

/** Generate mutated input on QA FAIL — up to 3 iterations per test case. */
export function mutateTestInput(
  input: string,
  category: AdaptiveTestCategory,
  iteration: number
): { mutated: string; kind: MutationKind } {
  const kind = MUTATION_SEQUENCE[iteration] ?? "change_emotion";

  switch (kind) {
    case "remove_context": {
      const words = input.trim().split(/\s+/);
      const shortened = words.length > 2 ? words.slice(-2).join(" ") : input;
      return { mutated: shortened, kind };
    }
    case "add_ambiguity":
      return { mutated: `괜찮은 ${input}`, kind };
    case "add_constraint":
      if (category === "FOOD") {
        return { mutated: `${input} 혼밥`, kind };
      }
      if (category === "PLANNING") {
        return { mutated: `${input} 오늘`, kind };
      }
      return { mutated: `${input} 저예산`, kind };
    case "change_emotion":
      return { mutated: `급함 — ${input}`, kind: "change_emotion" };
    case "change_locale":
      return { mutated: swapLocale(input), kind: "change_locale" };
    case "multi_intent":
      if (category === "FOOD") {
        return { mutated: `${input} + 내일 일정`, kind: "multi_intent" };
      }
      return { mutated: `${input} + 맛집`, kind: "multi_intent" };
    default:
      return { mutated: input, kind: "remove_context" };
  }
}
