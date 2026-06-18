import type { TrafficContext } from "@/lib/context-resolver/types";

/** Browser read path — GET /api/context/traffic with heuristic fallback. */
export async function fetchTrafficContextClient(input: {
  destination: string;
  originHint?: string | null;
}): Promise<TrafficContext | null> {
  const destination = input.destination.trim();
  if (!destination || typeof window === "undefined") {
    return null;
  }

  try {
    const params = new URLSearchParams({ destination });
    if (input.originHint?.trim()) {
      params.set("origin", input.originHint.trim());
    }
    const response = await fetch(`/api/context/traffic?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as TrafficContext;
  } catch {
    return null;
  }
}
