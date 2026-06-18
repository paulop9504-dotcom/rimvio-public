import type { AttackGroupId } from "@/lib/testing/routing-stress/attack-test-banks";

export type StressMutationKind =
  | "add_context"
  | "remove_context"
  | "flip_domain"
  | "emotional_injection"
  | "multi_intent_injection";

const CONTEXT_TAGS = ["혼밥", "데이트", "급함"] as const;
const EMOTION_TAGS = ["급해", "고민됨"] as const;

export function mutateRoutingStressInput(
  input: string,
  groupId: AttackGroupId,
  iteration: number
): { mutated: string; kind: StressMutationKind } {
  const kind = (
    [
      "add_context",
      "remove_context",
      "flip_domain",
      "emotional_injection",
      "multi_intent_injection",
    ] as const
  )[iteration] ?? "multi_intent_injection";

  switch (kind) {
    case "add_context": {
      const tag = CONTEXT_TAGS[iteration % CONTEXT_TAGS.length]!;
      return { mutated: `${input} ${tag}`, kind };
    }
    case "remove_context": {
      const words = input.replace(/\([^)]*\)/g, "").trim().split(/\s+/);
      const core = words.slice(0, Math.max(2, Math.ceil(words.length / 2))).join(" ");
      return { mutated: core, kind };
    }
    case "flip_domain": {
      if (groupId === "food_disguised_info" || groupId === "ambiguous_minimal") {
        return { mutated: input.replace(/맛집|먹|음식/g, "원룸"), kind };
      }
      if (groupId === "step_disguised_info" || groupId === "multi_intent_trap") {
        return { mutated: input.replace(/일정|계획/g, "예산"), kind };
      }
      return { mutated: `(${input}) → 돈/비용 관점`, kind };
    }
    case "emotional_injection": {
      const tag = EMOTION_TAGS[iteration % EMOTION_TAGS.length]!;
      return { mutated: `${tag} — ${input}`, kind };
    }
    case "multi_intent_injection":
      return { mutated: `${input} + 일정`, kind };
    default:
      return { mutated: input, kind: "add_context" };
  }
}
