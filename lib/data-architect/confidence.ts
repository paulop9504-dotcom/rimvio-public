import type { DataArchitectWire } from "@/lib/data-architect/types";

export const INBOX_CONFIDENCE_THRESHOLD = 0.4;
export const ASSIGN_CONFIDENCE_THRESHOLD = 0.7;

/** Rule-based confidence for container assignment. */
export function deriveArchitectConfidence(
  wire: DataArchitectWire,
  rawInput = ""
): number {
  const trimmed = rawInput.trim();
  const len = trimmed.length;

  if (wire.action === "APPEND") {
    return 0.92;
  }

  if (wire.action === "CREATE_NEW") {
    if (len >= 24) {
      return 0.82;
    }
    return 0.68;
  }

  if (len < 12) {
    return 0.22;
  }

  if (wire.classification.knowledge.length > 0 && wire.classification.stream.length === 0) {
    return 0.52;
  }

  if (len >= 80) {
    return 0.48;
  }

  return 0.32;
}

export function withArchitectConfidence(
  wire: DataArchitectWire,
  rawInput = ""
): DataArchitectWire {
  const confidence =
    typeof wire.confidence === "number" && Number.isFinite(wire.confidence)
      ? wire.confidence
      : deriveArchitectConfidence(wire, rawInput);

  return { ...wire, confidence };
}

export function shouldQueueInbox(wire: DataArchitectWire): boolean {
  const confidence = wire.confidence ?? deriveArchitectConfidence(wire);
  return wire.action === "UNCATEGORIZED" || confidence < INBOX_CONFIDENCE_THRESHOLD;
}

export function shouldAutoAssign(wire: DataArchitectWire): boolean {
  const confidence = wire.confidence ?? deriveArchitectConfidence(wire);
  return wire.action !== "UNCATEGORIZED" && confidence >= ASSIGN_CONFIDENCE_THRESHOLD;
}
