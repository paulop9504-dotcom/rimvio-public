export type ChatBubbleGroup = "single" | "first" | "middle" | "last";

/** Consecutive same-role messages share tighter spacing + grouped corner radii. */
export function resolveChatBubbleGroup(
  messages: Array<{ role: string }>,
  index: number,
): ChatBubbleGroup {
  const role = messages[index]?.role;
  if (!role) {
    return "single";
  }

  const prevSame = index > 0 && messages[index - 1]?.role === role;
  const nextSame =
    index < messages.length - 1 && messages[index + 1]?.role === role;

  if (!prevSame && !nextSame) {
    return "single";
  }
  if (!prevSame && nextSame) {
    return "first";
  }
  if (prevSame && nextSame) {
    return "middle";
  }
  return "last";
}
