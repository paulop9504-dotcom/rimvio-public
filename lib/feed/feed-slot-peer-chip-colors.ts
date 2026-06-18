const CHIP_GRADIENTS = [
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-indigo-600",
  "from-rose-500 to-orange-600",
] as const;

/** DOM / canvas surfaces — same palette as Tailwind chips. */
export const CHIP_GRADIENT_CSS = [
  "linear-gradient(135deg, #d946ef, #db2777)",
  "linear-gradient(135deg, #0ea5e9, #2563eb)",
  "linear-gradient(135deg, #8b5cf6, #4f46e5)",
  "linear-gradient(135deg, #f43f5e, #ea580c)",
] as const;

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function feedSlotPeerChipGradient(peerThreadId: string): string {
  const index = hashKey(peerThreadId) % CHIP_GRADIENTS.length;
  return CHIP_GRADIENTS[index] ?? CHIP_GRADIENTS[0];
}

export function feedSlotPeerChipGradientCss(peerThreadId: string): string {
  const index = hashKey(peerThreadId) % CHIP_GRADIENT_CSS.length;
  return CHIP_GRADIENT_CSS[index] ?? CHIP_GRADIENT_CSS[0];
}

/** 2–3 char label for compact square chip. */
export function feedSlotPeerChipShortLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  if (trimmed.length <= 3) {
    return trimmed;
  }
  return trimmed.slice(0, 2);
}
