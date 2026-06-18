import type { DecisionCardModel } from "@/lib/threadline/threadline-types";

/** Kernel §12 — programmatic pass/fail checks on visible cards. */
export function validateThreadlineKernelGuards(
  cards: DecisionCardModel[]
): string[] {
  const failures: string[] = [];
  const visible = cards.filter((c) => c.state !== "DEFERRED");

  const waiting = visible.filter((c) => c.state === "WAITING");
  const working = visible.filter((c) => c.state === "WORKING");

  if (waiting.length > 1) {
    failures.push(`multiple_waiting:${waiting.length}`);
  }

  for (const card of visible) {
    if (card.because.split(/[.!?]/).filter(Boolean).length > 2) {
      failures.push(`because_too_long:${card.id}`);
    }

    if (card.state === "WAITING") {
      if (!card.chips?.length) {
        failures.push(`waiting_no_chips:${card.id}`);
      }
      if (card.chips && card.chips.length > 3) {
        failures.push(`fork_overflow:${card.id}`);
      }
      if (card.settledLine) {
        failures.push(`waiting_has_settled:${card.id}`);
      }
    }

    if (card.state === "WORKING") {
      if (card.chips?.length) {
        failures.push(`working_has_chips:${card.id}`);
      }
    }

    if (card.state === "DONE") {
      if (card.chips?.length) {
        failures.push(`done_has_chips:${card.id}`);
      }
      if (!card.settledLine) {
        failures.push(`done_no_settled:${card.id}`);
      }
      if (card.chips && card.settledLine) {
        failures.push(`done_chips_and_settled:${card.id}`);
      }
    }
  }

  if (working.length > 1) {
    failures.push(`multiple_working:${working.length}`);
  }

  return failures;
}

export function threadlineHeaderStatus(
  cards: DecisionCardModel[]
): "needs_one_tap" | "all_set" {
  const hasWaiting = cards.some((c) => c.state === "WAITING");
  return hasWaiting ? "needs_one_tap" : "all_set";
}
