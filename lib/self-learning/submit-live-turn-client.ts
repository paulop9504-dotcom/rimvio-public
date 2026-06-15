import type { LiveTurnRequest } from "@/lib/self-learning/live-turn-types";

/** Fire-and-forget live turn capture — browser only. */
export function submitLiveTurn(input: Omit<LiveTurnRequest, "source">): void {
  if (typeof window === "undefined") {
    return;
  }

  void fetch("/api/chat/live-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, source: "client" }),
  }).catch((error) => {
    console.error("[live-turn] submit failed", error);
  });
}
